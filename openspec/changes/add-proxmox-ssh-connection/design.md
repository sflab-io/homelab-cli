# Design: Proxmox SSH Connection

## Context

The codebase already has several patterns we can leverage:
- **IP Address Retrieval**: The `ProxmoxRepository.fetchVMIPAddress()` method already retrieves IP addresses from VMs and containers via the Proxmox guest agent API
- **Command Execution**: The `CommandExecutorService` with `execa` provides flexible command execution with different stdio modes
- **Interactive Commands**: The `vscode` command demonstrates using `stdio: 'inherit'` for interactive processes

The user wants to SSH into VMs and containers using commands like:
```bash
homelab proxmox vm connect <vmid> [--user admin] [--key ~/.ssh/admin_id_ecdsa]
homelab proxmox container connect <vmid> [--user admin] [--key ~/.ssh/admin_id_ecdsa]
```

## Goals / Non-Goals

### Goals
- Single command to SSH into a VM or container without manual IP lookup
- Reuse existing IP retrieval logic from `ProxmoxRepository`
- Shared service layer for SSH connection logic (DRY principle)
- Interactive SSH session that feels native (users can type commands, see output in real-time)
- Configurable username and SSH key path
- Consistent error handling when IP address is unavailable

### Non-Goals
- SSH key management (users manage their own keys)
- SSH config file generation
- Port forwarding or tunneling features
- Multi-hop SSH connections

## Decisions

### Decision 1: Service Layer Architecture

**Choice**: Create a dedicated `ProxmoxSSHService` that depends on `IProxmoxRepository`

**Rationale**:
- Follows the existing layered architecture pattern
- Keeps SSH connection logic separate and testable
- Repository already has IP retrieval capability via `listResources()`
- Service layer can handle business logic like error messages, default values
- Easy to mock repository for testing

**Alternatives Considered**:
- **Put SSH logic directly in commands**: Violates separation of concerns, not testable
- **Extend ProxmoxVMService**: SSH is orthogonal to VM management; better as separate service

### Decision 2: IP Address Retrieval

**Choice**: Use existing `listResources()` method to get VM/container details including IP

**Rationale**:
- Repository already fetches IP addresses for `list` commands
- Reuses proven IP retrieval logic (`fetchVMIPAddress`)
- Handles guest agent errors gracefully (returns null if unavailable)
- Type-safe with `resourceType: 'qemu' | 'lxc'`

**Implementation**:
```typescript
// In ProxmoxSSHService
async getResourceIPAddress(vmid: number, resourceType: 'qemu' | 'lxc'): Promise<Result<string, ServiceError>> {
  // Call repository.listResources(resourceType)
  // Find resource matching vmid
  // Return ipv4Address or error if null
}
```

**Alternatives Considered**:
- **Add new repository method**: Unnecessary; `listResources()` already provides what we need
- **Direct guest agent call in service**: Breaks abstraction; repository owns Proxmox API calls

### Decision 3: SSH Command Execution

**Choice**: Use `CommandExecutorService.executeCommand()` with `stdio: 'inherit'`

**Rationale**:
- `stdio: 'inherit'` pipes stdin/stdout/stderr to parent process
- Creates native interactive terminal experience
- User can type commands, use tab completion, see colors, etc.
- Aligns with how `vscode` command launches external processes
- Reuses existing `CommandExecutorService` with its error handling

**Command Construction**:
```typescript
ssh -i <keyPath> <user>@<ipAddress>
```

**Alternatives Considered**:
- **Pipe stdio manually**: More complex, loses terminal features (colors, readline)
- **Spawn SSH directly without service**: Duplicates error handling, loses Result pattern

### Decision 4: Default Values

**Choices**:
- Default user: `admin`
- Default SSH key: `~/.ssh/admin_id_ecdsa`

**Rationale**:
- Matches user's specified defaults in requirements
- Users can override via flags
- Tilde expansion handled by shell (SSH command)

### Decision 5: Command Structure

**Choice**: Two separate commands at `proxmox/vm/connect.ts` and `proxmox/container/connect.ts`

**Rationale**:
- Follows existing pattern (`proxmox/vm/list.ts`, `proxmox/container/list.ts`)
- Clear separation of concerns at command layer
- Each command is thin: parse args/flags, call service, handle result
- Service layer contains shared logic

**Alternatives Considered**:
- **Single command with `--type` flag**: Less discoverable, breaks existing pattern
- **Generic `proxmox connect` command**: Unclear whether it's VM or container

## Risks / Trade-offs

### Risk 1: IP Address Unavailable

**Risk**: Guest agent not installed or VM/container stopped → no IP address

**Mitigation**:
- Service returns descriptive error: "Cannot connect to VM {vmid}: IP address not available. Ensure VM is running and guest agent is installed."
- Aligns with existing behavior in `list` commands (shows "N/A" for IP)
- User can manually check with `homelab proxmox vm list` first

### Risk 2: SSH Key Not Found

**Risk**: User specifies non-existent key path or default key doesn't exist

**Mitigation**:
- SSH command itself will fail with error message
- `CommandExecutorService` captures and returns error via Result pattern
- Error message clearly indicates SSH failure cause

### Risk 3: Interactive Session Issues

**Risk**: `stdio: 'inherit'` might have edge cases (terminal resize, control sequences)

**Mitigation**:
- `execa` with `stdio: 'inherit'` is battle-tested pattern
- SSH client handles terminal negotiation
- Similar pattern works in `vscode` command

### Trade-off: List All Resources to Find One

**Trade-off**: Calling `listResources()` fetches all VMs/containers when we only need one

**Rationale for Accepting**:
- Keeps implementation simple and reuses existing code
- Performance impact minimal for typical homelab scale (< 100 VMs)
- Alternative (add repository method for single resource) adds complexity
- Can optimize later if performance becomes issue

## Migration Plan

N/A - This is a new feature with no breaking changes.

## Open Questions

None - Requirements are clear and implementation is straightforward.
