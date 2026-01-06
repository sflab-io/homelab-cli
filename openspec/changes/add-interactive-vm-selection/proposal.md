# Proposal: Add Interactive VM/Container Selection to Connect Commands

## Why
Users currently need to know the exact VMID before connecting to a VM or container via SSH, which creates friction in the workflow. They must first list all resources, identify the VMID, and then run the connect command. This proposal eliminates this multi-step process by adding interactive selection directly into the connect commands, improving user experience and reducing cognitive load. The change aligns with the project's existing interactive prompt patterns and makes the CLI more discoverable and user-friendly.

## Overview
Enhance the `proxmox vm connect` and `proxmox container connect` commands to display an interactive selection prompt when the `<vmid>` argument is not provided. The prompt will list only running VMs/containers, allowing users to select which resource to connect to via SSH.

## Problem Statement
Currently, both connect commands require the user to know the VMID in advance:
- `homelab proxmox vm connect <vmid>`
- `homelab proxmox container connect <vmid>`

This requires users to:
1. Run `homelab proxmox vm list` or `homelab proxmox container list` first
2. Identify the VMID of their target resource
3. Run the connect command with the VMID

This is a multi-step process that could be streamlined with an interactive prompt.

## Proposed Solution
Make the `<vmid>` argument optional. When not provided:
1. Fetch all VMs or containers (depending on the command)
2. Filter to only those with `status: 'running'`
3. Display an interactive selection prompt showing:
   - VMID
   - Name
   - IP Address (if available)
4. After selection, proceed with SSH connection using the selected VMID

## User Experience

### Current Flow
```bash
$ homelab proxmox vm list
┌──────┬───────────────┬───────────────┬─────────┬─────────────────┐
│ VMID │ Name          │ Node          │ Status  │ IP Address      │
├──────┼───────────────┼───────────────┼─────────┼─────────────────┤
│ 100  │ ubuntu-web    │ pve           │ running │ 192.168.1.10    │
│ 101  │ debian-db     │ pve           │ stopped │ -               │
│ 102  │ alpine-cache  │ pve           │ running │ 192.168.1.12    │
└──────┴───────────────┴───────────────┴─────────┴─────────────────┘

$ homelab proxmox vm connect 100
Connecting to VM 100 as admin...
[SSH session starts]
```

### Proposed Flow
```bash
$ homelab proxmox vm connect
? Select a VM to connect to: (Use arrow keys)
❯ 100 - ubuntu-web (192.168.1.10)
  102 - alpine-cache (192.168.1.12)

[User selects with Enter]
Connecting to VM 100 as admin...
[SSH session starts]
```

### Backward Compatibility
The existing syntax with explicit VMID remains fully supported:
```bash
$ homelab proxmox vm connect 100
Connecting to VM 100 as admin...
```

## Technical Approach

### Command Changes
Both commands need to:
1. Change `vmid` argument from `required: true` to `required: false`
2. Add logic to check if `vmid` is provided
3. If not provided:
   - Create service instance
   - Fetch running resources
   - Display selection prompt
   - Extract selected VMID
   - Continue with existing connection logic

### Service Layer Enhancement
Add a new method to `ProxmoxSSHService`:
```typescript
async getRunningResources(
  resourceType: 'qemu' | 'lxc'
): Promise<Result<ProxmoxVMDTO[], ServiceError>>
```

This method will:
1. Call `repository.listResources(resourceType)`
2. Filter results where `status === 'running'`
3. Return filtered list

### Prompt Integration
Use existing `promptForSelection` utility from `src/utils/prompts.ts`:
- Format choices as: `{vmid} - {name} ({ipAddress || 'No IP'})`
- Extract VMID from selected choice string

### Error Handling
Handle edge cases:
- No running VMs/containers available → Display helpful error message
- User cancels prompt (Ctrl+C) → Exit gracefully without error
- Network/API errors → Display existing error handling

## Benefits
1. **Improved UX**: Single command instead of list → connect workflow
2. **Discoverability**: Users see available resources without knowing VMIDs
3. **Safety**: Only running resources are shown, reducing connection errors
4. **Backward Compatible**: Existing scripts and workflows continue working
5. **Consistent**: Follows existing interactive prompt patterns in the codebase

## Out of Scope
- Filtering by other criteria (node, IP range, etc.)
- Multi-select for batch operations
- Auto-connect to single running resource
- Status refresh/polling in the prompt

## What Changes

### New Capability
- **interactive-vm-selection** - Interactive selection prompts for running VMs and containers in connect commands

### Modified Capabilities
- **proxmox-ssh-connection** - VMID argument becomes optional, adds interactive selection when not provided

### Files Modified
- `src/services/proxmox-ssh.service.ts` - Add `getRunningResources()` method
- `src/commands/proxmox/vm/connect.ts` - Make VMID optional, add prompt logic
- `src/commands/proxmox/container/connect.ts` - Make VMID optional, add prompt logic
- `test/services/proxmox-ssh.service.test.ts` - Add tests for new service method
- `test/commands/proxmox/vm/connect.test.ts` - Add tests for interactive selection
- `test/commands/proxmox/container/connect.test.ts` - Add tests for interactive selection

### Files Created
None - uses existing utilities and patterns

### Files Deleted
None

## Related Specifications
- `interactive-prompts` - Provides `promptForSelection` utility
- `proxmox-ssh-connection` - Current SSH connection implementation

## Success Criteria
1. Both `vm connect` and `container connect` work without VMID argument
2. Interactive prompt displays only running resources
3. Selection prompt shows VMID, name, and IP address
4. Existing behavior with explicit VMID remains unchanged
5. All tests pass
6. Help documentation updated automatically
