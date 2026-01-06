# Proposal: Add Proxmox SSH Connection Commands

## Why

Users frequently need to SSH into Proxmox VMs and LXC containers for administrative tasks, debugging, and configuration. Currently, users must manually look up IP addresses and construct SSH commands. This proposal streamlines the workflow by providing dedicated commands that automatically retrieve IP addresses from the Proxmox API and establish SSH connections.

## What Changes

- Add `homelab proxmox vm connect <vmid>` command to SSH into a VM
- Add `homelab proxmox container connect <vmid>` command to SSH into a LXC container
- Create shared SSH connection utility service to avoid code duplication
- Add `--user` flag to specify SSH username (default: `admin`)
- Add `--key` flag to specify SSH key path (default: `~/.ssh/admin_id_ecdsa`)
- Commands open an interactive SSH session in the current terminal using `stdio: 'inherit'`
- Retrieve IP addresses via existing Proxmox repository methods (reusing `fetchVMIPAddress` pattern)

## Impact

### Affected Specs
- **NEW**: `proxmox-ssh-connection` - New capability for SSH connection to Proxmox resources

### Affected Code
- **NEW**: `src/commands/proxmox/vm/connect.ts` - VM SSH connection command
- **NEW**: `src/commands/proxmox/container/connect.ts` - Container SSH connection command
- **NEW**: `src/services/proxmox-ssh.service.ts` - SSH connection service with shared logic
- **REUSE**: `src/repositories/proxmox.repository.ts` - Already has IP retrieval capabilities
- **REUSE**: `src/services/command-executor.service.ts` - For executing SSH command
- **NEW**: Tests for new commands and service

### User Benefits
- One-command SSH access to VMs and containers
- Automatic IP address resolution
- Consistent interface for both VMs and containers
- Customizable SSH credentials via flags
