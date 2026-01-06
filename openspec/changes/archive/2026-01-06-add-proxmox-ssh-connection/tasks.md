# Implementation Tasks

## 1. Service Layer

- [x] 1.1 Create `src/services/proxmox-ssh.service.ts`
  - [x] 1.1.1 Define ProxmoxSSHService class with IProxmoxRepository dependency
  - [x] 1.1.2 Implement `getResourceIPAddress(vmid, resourceType)` method
  - [x] 1.1.3 Implement `connectSSH(vmid, resourceType, username, keyPath)` method
  - [x] 1.1.4 Use CommandExecutorService with `stdio: 'inherit'`
  - [x] 1.1.5 Return proper Result types with ServiceError

- [x] 1.2 Create service tests at `test/services/proxmox-ssh.service.test.ts`
  - [x] 1.2.1 Test IP address resolution for VMs
  - [x] 1.2.2 Test IP address resolution for containers
  - [x] 1.2.3 Test error handling for missing IP
  - [x] 1.2.4 Test error handling for non-existent VMID
  - [x] 1.2.5 Verify SSH command construction with defaults
  - [x] 1.2.6 Verify SSH command construction with custom flags

## 2. Command Layer - VM Connect

- [x] 2.1 Create `src/commands/proxmox/vm/connect.ts`
  - [x] 2.1.1 Define command class extending BaseCommand
  - [x] 2.1.2 Add vmid argument (required)
  - [x] 2.1.3 Add --user flag (default: 'admin')
  - [x] 2.1.4 Add --key flag (default: '~/.ssh/admin_id_ecdsa')
  - [x] 2.1.5 Implement run() method calling ProxmoxSSHService
  - [x] 2.1.6 Handle Result pattern with proper error messages
  - [x] 2.1.7 Add description and examples

- [x] 2.2 Create command tests at `test/commands/proxmox/vm/connect.test.ts`
  - [x] 2.2.1 Test command with default flags
  - [x] 2.2.2 Test command with --user flag
  - [x] 2.2.3 Test command with --key flag
  - [x] 2.2.4 Test command with both flags
  - [x] 2.2.5 Test error handling
  - [x] 2.2.6 Verify exit codes

## 3. Command Layer - Container Connect

- [x] 3.1 Create `src/commands/proxmox/container/connect.ts`
  - [x] 3.1.1 Define command class extending BaseCommand
  - [x] 3.1.2 Add vmid argument (required)
  - [x] 3.1.3 Add --user flag (default: 'admin')
  - [x] 3.1.4 Add --key flag (default: '~/.ssh/admin_id_ecdsa')
  - [x] 3.1.5 Implement run() method calling ProxmoxSSHService
  - [x] 3.1.6 Handle Result pattern with proper error messages
  - [x] 3.1.7 Add description and examples

- [x] 3.2 Create command tests at `test/commands/proxmox/container/connect.test.ts`
  - [x] 3.2.1 Test command with default flags
  - [x] 3.2.2 Test command with --user flag
  - [x] 3.2.3 Test command with --key flag
  - [x] 3.2.4 Test command with both flags
  - [x] 3.2.5 Test error handling
  - [x] 3.2.6 Verify exit codes

## 4. Build and Validation

- [x] 4.1 Build TypeScript: `pnpm run build`
- [x] 4.2 Run all tests: `pnpm test`
- [x] 4.3 Verify linting passes: `pnpm run lint`
- [x] 4.4 Update README: `pnpm run prepack`

## 5. Manual Testing

- [x] 5.1 Test VM connect with running VM
- [x] 5.2 Test container connect with running container
- [x] 5.3 Test error handling with stopped VM (no IP)
- [x] 5.4 Test error handling with non-existent VMID
- [x] 5.5 Test custom --user flag
- [x] 5.6 Test custom --key flag
- [x] 5.7 Verify interactive terminal works (can type commands, see output)

## Dependencies

- Tasks 2.x and 3.x depend on 1.x (service must exist first)
- Task 4.x depends on all implementation tasks (1.x, 2.x, 3.x)
- Task 5.x depends on 4.1 (build must complete)

## Notes

- Service layer (1.x) can be implemented and tested independently
- VM and container commands (2.x and 3.x) can be implemented in parallel after service is done
- All tasks should maintain backward compatibility (no changes to existing code except imports)
