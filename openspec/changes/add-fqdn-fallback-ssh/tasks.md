# Implementation Tasks

## 1. Service Layer Implementation
- [ ] 1.1 Add `getResourceFQDN()` method to `ProxmoxSSHService`
  - [ ] 1.1.1 Fetch resource details from repository
  - [ ] 1.1.2 Construct FQDN as `<resource-name>.home.sflab.io`
  - [ ] 1.1.3 Return Result with FQDN or ServiceError
- [ ] 1.2 Modify `connectSSH()` method to implement fallback strategy
  - [ ] 1.2.1 Attempt IP resolution first (existing logic)
  - [ ] 1.2.2 On IP failure, call `getResourceFQDN()` as fallback
  - [ ] 1.2.3 Use either IP or FQDN as connection target
  - [ ] 1.2.4 Track connection method ('ip' or 'fqdn') for logging
  - [ ] 1.2.5 Update error messages to indicate both strategies failed
- [ ] 1.3 Modify `getResourceIPAddress()` to support fallback flow
  - [ ] 1.3.1 Return failure Result (not error) when IP is null
  - [ ] 1.3.2 Maintain existing error messages for resource not found

## 2. Command Layer Implementation
- [ ] 2.1 Update `ProxmoxVMConnect` command
  - [ ] 2.1.1 Detect when FQDN fallback is used
  - [ ] 2.1.2 Display "IP address not available for VM {vmid}, trying FQDN fallback..." message
  - [ ] 2.1.3 Display "Connecting to VM {vmid} ({fqdn}) as {user}..." when using FQDN
  - [ ] 2.1.4 Maintain existing message format when using IP
- [ ] 2.2 Update `ProxmoxContainerConnect` command
  - [ ] 2.2.1 Detect when FQDN fallback is used
  - [ ] 2.2.2 Display "IP address not available for container {vmid}, trying FQDN fallback..." message
  - [ ] 2.2.3 Display "Connecting to container {vmid} ({fqdn}) as {user}..." when using FQDN
  - [ ] 2.2.4 Maintain existing message format when using IP

## 3. Testing - Service Layer
- [ ] 3.1 Add tests for `getResourceFQDN()` in `test/services/proxmox-ssh.service.test.ts`
  - [ ] 3.1.1 Test FQDN construction for VM
  - [ ] 3.1.2 Test FQDN construction for container
  - [ ] 3.1.3 Test resource not found error
  - [ ] 3.1.4 Test repository failure handling
- [ ] 3.2 Add tests for `connectSSH()` fallback logic
  - [ ] 3.2.1 Test IP-based connection when IP is available (existing behavior)
  - [ ] 3.2.2 Test FQDN fallback when IP is null
  - [ ] 3.2.3 Test FQDN fallback when IP resolution fails
  - [ ] 3.2.4 Test failure when both IP and FQDN resolution fail
  - [ ] 3.2.5 Verify correct SSH command construction with FQDN
  - [ ] 3.2.6 Test fallback with custom username
  - [ ] 3.2.7 Test fallback with custom SSH key path

## 4. Testing - Command Layer
- [ ] 4.1 Add tests for `ProxmoxVMConnect` command
  - [ ] 4.1.1 Test output message when using IP (existing behavior)
  - [ ] 4.1.2 Test fallback message display when FQDN is used
  - [ ] 4.1.3 Test error message when both strategies fail
- [ ] 4.2 Add tests for `ProxmoxContainerConnect` command
  - [ ] 4.2.1 Test output message when using IP (existing behavior)
  - [ ] 4.2.2 Test fallback message display when FQDN is used
  - [ ] 4.2.3 Test error message when both strategies fail

## 5. Build and Validation
- [ ] 5.1 Run build to verify TypeScript compilation: `pnpm run build`
- [ ] 5.2 Run all tests to ensure no regressions: `pnpm test`
- [ ] 5.3 Run linter to verify code style: `pnpm run lint`
- [ ] 5.4 Manually test VM connect with IP available
- [ ] 5.5 Manually test VM connect with FQDN fallback
- [ ] 5.6 Manually test container connect with IP available
- [ ] 5.7 Manually test container connect with FQDN fallback

## 6. Documentation
- [ ] 6.1 Verify command help text is automatically updated by oclif
- [ ] 6.2 Update README via `pnpm run prepack` (automatic)
- [ ] 6.3 Review generated documentation for accuracy

## Dependencies

- Task 2.1 and 2.2 depend on Task 1.2 completion (commands need to detect fallback method)
- Task 3.x can be parallelized with Task 1.x (write tests alongside implementation)
- Task 4.x depends on Task 2.x completion
- Task 5.x must run after all implementation and tests are complete

## Notes

- The DNS domain `home.sflab.io` is hardcoded in the initial implementation
- Service layer returns connection method information to enable command layer messaging
- Existing IP-based connection behavior must remain unchanged
- FQDN fallback is triggered only when IP resolution fails
- SSH connection errors (e.g., DNS resolution failure, connection timeout) are handled by SSH itself
