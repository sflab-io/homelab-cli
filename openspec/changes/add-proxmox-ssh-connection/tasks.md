# Implementation Tasks

## 1. Service Layer

- [ ] 1.1 Create `src/services/proxmox-ssh.service.ts`
  - [ ] 1.1.1 Define ProxmoxSSHService class with IProxmoxRepository dependency
  - [ ] 1.1.2 Implement `getResourceIPAddress(vmid, resourceType)` method
  - [ ] 1.1.3 Implement `connectSSH(vmid, resourceType, username, keyPath)` method
  - [ ] 1.1.4 Use CommandExecutorService with `stdio: 'inherit'`
  - [ ] 1.1.5 Return proper Result types with ServiceError

- [ ] 1.2 Create service tests at `test/services/proxmox-ssh.service.test.ts`
  - [ ] 1.2.1 Test IP address resolution for VMs
  - [ ] 1.2.2 Test IP address resolution for containers
  - [ ] 1.2.3 Test error handling for missing IP
  - [ ] 1.2.4 Test error handling for non-existent VMID
  - [ ] 1.2.5 Verify SSH command construction with defaults
  - [ ] 1.2.6 Verify SSH command construction with custom flags

## 2. Command Layer - VM Connect

- [ ] 2.1 Create `src/commands/proxmox/vm/connect.ts`
  - [ ] 2.1.1 Define command class extending BaseCommand
  - [ ] 2.1.2 Add vmid argument (required)
  - [ ] 2.1.3 Add --user flag (default: 'admin')
  - [ ] 2.1.4 Add --key flag (default: '~/.ssh/admin_id_ecdsa')
  - [ ] 2.1.5 Implement run() method calling ProxmoxSSHService
  - [ ] 2.1.6 Handle Result pattern with proper error messages
  - [ ] 2.1.7 Add description and examples

- [ ] 2.2 Create command tests at `test/commands/proxmox/vm/connect.test.ts`
  - [ ] 2.2.1 Test command with default flags
  - [ ] 2.2.2 Test command with --user flag
  - [ ] 2.2.3 Test command with --key flag
  - [ ] 2.2.4 Test command with both flags
  - [ ] 2.2.5 Test error handling
  - [ ] 2.2.6 Verify exit codes

## 3. Command Layer - Container Connect

- [ ] 3.1 Create `src/commands/proxmox/container/connect.ts`
  - [ ] 3.1.1 Define command class extending BaseCommand
  - [ ] 3.1.2 Add vmid argument (required)
  - [ ] 3.1.3 Add --user flag (default: 'admin')
  - [ ] 3.1.4 Add --key flag (default: '~/.ssh/admin_id_ecdsa')
  - [ ] 3.1.5 Implement run() method calling ProxmoxSSHService
  - [ ] 3.1.6 Handle Result pattern with proper error messages
  - [ ] 3.1.7 Add description and examples

- [ ] 3.2 Create command tests at `test/commands/proxmox/container/connect.test.ts`
  - [ ] 3.2.1 Test command with default flags
  - [ ] 3.2.2 Test command with --user flag
  - [ ] 3.2.3 Test command with --key flag
  - [ ] 3.2.4 Test command with both flags
  - [ ] 3.2.5 Test error handling
  - [ ] 3.2.6 Verify exit codes

## 4. Build and Validation

- [ ] 4.1 Build TypeScript: `pnpm run build`
- [ ] 4.2 Run all tests: `pnpm test`
- [ ] 4.3 Verify linting passes: `pnpm run lint`
- [ ] 4.4 Update README: `pnpm run prepack`

## 5. Manual Testing

- [ ] 5.1 Test VM connect with running VM
- [ ] 5.2 Test container connect with running container
- [ ] 5.3 Test error handling with stopped VM (no IP)
- [ ] 5.4 Test error handling with non-existent VMID
- [ ] 5.5 Test custom --user flag
- [ ] 5.6 Test custom --key flag
- [ ] 5.7 Verify interactive terminal works (can type commands, see output)

## Dependencies

- Tasks 2.x and 3.x depend on 1.x (service must exist first)
- Task 4.x depends on all implementation tasks (1.x, 2.x, 3.x)
- Task 5.x depends on 4.1 (build must complete)

## Notes

- Service layer (1.x) can be implemented and tested independently
- VM and container commands (2.x and 3.x) can be implemented in parallel after service is done
- All tasks should maintain backward compatibility (no changes to existing code except imports)
