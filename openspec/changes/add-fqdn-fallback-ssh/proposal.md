# Proposal: Add FQDN Fallback for SSH Connections

## Why

Some VMs and containers in the homelab use DHCP for IP address assignment, which means their IP addresses can change or may not be immediately available through the Proxmox guest agent. This creates connection failures when the IP address cannot be retrieved via the Proxmox API. Since all VMs and containers have their hostname properly configured during provisioning, DNS resolution provides a reliable fallback mechanism through the internal DNS server at `*.home.sflab.io`. This proposal adds FQDN-based connection as a fallback when IP address resolution fails, improving connection reliability without breaking existing functionality.

## Overview

Enhance the SSH connection logic in `ProxmoxSSHService` to automatically fall back to FQDN-based connection (`<vm-name>.home.sflab.io`) when the Proxmox API cannot provide an IP address. This provides a seamless user experience for DHCP-configured resources while maintaining backward compatibility with IP-based connections.

## Problem Statement

Currently, the `homelab proxmox vm connect` and `homelab proxmox container connect` commands require an IP address from the Proxmox API:
1. Service calls `getResourceIPAddress()` to retrieve IP from Proxmox API
2. If IP is null (guest agent not available or DHCP not yet assigned), connection fails
3. User sees error: "IP address not available. Ensure resource is running and guest agent is installed."

For DHCP-configured resources, this creates friction even when:
- The resource is running and accessible
- DNS resolution would work via `<name>.home.sflab.io`
- The hostname is properly configured

## Proposed Solution

Modify `ProxmoxSSHService.connectSSH()` to implement a two-stage connection strategy:

**Stage 1: Try IP-based connection** (current behavior)
1. Attempt to retrieve IP address from Proxmox API
2. If IP address is available, use it: `ssh -i ~/.ssh/admin_id_ecdsa admin@<ip-address>`
3. Proceed with connection

**Stage 2: Fallback to FQDN** (new behavior)
1. If IP address is not available (null or error)
2. Construct FQDN: `<resource-name>.home.sflab.io`
3. Use FQDN for connection: `ssh -i ~/.ssh/admin_id_ecdsa admin@<vm-name>.home.sflab.io`
4. Let SSH/DNS handle resolution and connectivity

## User Experience

### Current Flow (IP retrieval fails)
```bash
$ homelab proxmox vm connect 100
Cannot connect to VM 100: IP address not available. Ensure VM is running and guest agent is installed.
[Exit code 1]
```

### Proposed Flow (FQDN fallback)
```bash
$ homelab proxmox vm connect 100
IP address not available for VM 100, trying FQDN fallback...
Connecting to VM 100 (ubuntu-web.home.sflab.io) as admin...
[SSH session starts]
```

### Backward Compatibility (IP available)
```bash
$ homelab proxmox vm connect 101
Connecting to VM 101 as admin...
[SSH session starts - uses IP as before]
```

## Technical Approach

### Service Layer Changes

Modify `ProxmoxSSHService.connectSSH()`:

```typescript
async connectSSH(
  vmid: number,
  resourceType: 'qemu' | 'lxc',
  username = 'admin',
  keyPath = '~/.ssh/admin_id_ecdsa',
): Promise<Result<void, ServiceError>> {
  // Try IP-based connection first
  const ipResult = await this.getResourceIPAddress(vmid, resourceType);

  let connectionTarget: string;
  let connectionMethod: 'ip' | 'fqdn';

  if (ipResult.success) {
    connectionTarget = ipResult.data;
    connectionMethod = 'ip';
  } else {
    // Fallback to FQDN
    const fqdnResult = await this.getResourceFQDN(vmid, resourceType);

    if (!fqdnResult.success) {
      // Cannot connect via IP or FQDN
      return failure(new ServiceError(
        `Cannot connect to ${resourceType === 'qemu' ? 'VM' : 'container'} ${vmid}: ` +
        `IP address not available and FQDN resolution failed.`,
        { cause: fqdnResult.error }
      ));
    }

    connectionTarget = fqdnResult.data;
    connectionMethod = 'fqdn';
  }

  // Execute SSH command
  const sshArgs = ['-i', keyPath, `${username}@${connectionTarget}`];
  const execResult = await this.commandExecutor.executeCommand('ssh', sshArgs, {
    stdio: 'inherit',
  });

  // ... error handling
}
```

Add new method `getResourceFQDN()`:

```typescript
async getResourceFQDN(
  vmid: number,
  resourceType: 'qemu' | 'lxc',
): Promise<Result<string, ServiceError>> {
  // Fetch resource to get name
  const resourcesResult = await this.repository.listResources(resourceType);

  if (!resourcesResult.success) {
    return failure(new ServiceError(...));
  }

  const resource = resourcesResult.data.find(r => r.vmid === vmid);

  if (!resource) {
    return failure(new ServiceError(`Resource ${vmid} not found`));
  }

  // Construct FQDN: <name>.home.sflab.io
  const fqdn = `${resource.name}.home.sflab.io`;

  return success(fqdn);
}
```

### Command Layer Changes

Update commands to display informative messages:
- When IP is available: "Connecting to VM {vmid} as {user}..." (current)
- When using FQDN fallback: "IP address not available for VM {vmid}, trying FQDN fallback..." followed by "Connecting to VM {vmid} ({fqdn}) as {user}..."

### Configuration

The DNS domain suffix `home.sflab.io` should be:
- Hardcoded initially (simplest implementation)
- Optional: Made configurable via environment variable `HOMELAB_DNS_DOMAIN` in future enhancement

### Error Handling

Handle edge cases:
- **Resource not found**: Return existing error (unchanged)
- **IP unavailable AND DNS resolution fails**: Provide combined error message suggesting both checks
- **SSH connection fails**: Maintain existing error handling (SSH will provide connection errors)

## Benefits

1. **Improved Reliability**: DHCP-configured resources can be accessed even without guest agent data
2. **Zero Breaking Changes**: Existing IP-based connections work identically
3. **Better UX**: Automatic fallback eliminates manual DNS lookups
4. **Consistent Behavior**: Works for both VMs and containers
5. **DNS-First Option**: Leverages existing infrastructure (internal DNS)

## Out of Scope

- Configuration option to prefer FQDN over IP (IP-first is the default)
- Custom DNS domain configuration (hardcoded to `home.sflab.io`)
- DNS health checks or pre-validation
- Parallel IP and FQDN attempts (sequential fallback only)
- Automatic IP address refresh/retry

## What Changes

### Modified Capabilities
- **proxmox-ssh-connection** - Adds FQDN fallback when IP address is unavailable

### Files Modified
- `src/services/proxmox-ssh.service.ts` - Add `getResourceFQDN()` method and modify `connectSSH()` logic
- `src/commands/proxmox/vm/connect.ts` - Update connection message to indicate fallback
- `src/commands/proxmox/container/connect.ts` - Update connection message to indicate fallback
- `test/services/proxmox-ssh.service.test.ts` - Add tests for FQDN fallback scenarios
- `test/commands/proxmox/vm/connect.test.ts` - Add tests for FQDN fallback messaging
- `test/commands/proxmox/container/connect.test.ts` - Add tests for FQDN fallback messaging

### Files Created
None - uses existing service and command structure

### Files Deleted
None

## Related Specifications
- `proxmox-ssh-connection` - Current SSH connection implementation
- `interactive-vm-selection` - Interactive prompts for VM/container selection (related UX)

## Success Criteria
1. When IP address is available, connection uses IP (no change in behavior)
2. When IP address is not available, connection falls back to FQDN
3. FQDN is constructed as `<resource-name>.home.sflab.io`
4. User sees informative message indicating fallback is being used
5. All existing tests pass
6. New tests cover FQDN fallback scenarios
7. Both VM and container connect commands support fallback
8. Help documentation is automatically updated by oclif
