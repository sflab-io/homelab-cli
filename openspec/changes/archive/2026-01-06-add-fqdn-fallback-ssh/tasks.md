# Implementation Tasks

## 1. Service Layer Implementation
- [x] 1.1 Add `getResourceFQDN()` method to `ProxmoxSSHService`
  - [x] 1.1.1 Fetch resource details from repository
  - [x] 1.1.2 Construct FQDN as `<resource-name>.home.sflab.io`
  - [x] 1.1.3 Return Result with FQDN or ServiceError
- [x] 1.2 Modify `connectSSH()` method to implement fallback strategy
  - [x] 1.2.1 Attempt IP resolution first (existing logic)
  - [x] 1.2.2 On IP failure, call `getResourceFQDN()` as fallback
  - [x] 1.2.3 Use either IP or FQDN as connection target
  - [x] 1.2.4 Track connection method ('ip' or 'fqdn') for logging
  - [x] 1.2.5 Update error messages to indicate both strategies failed
- [x] 1.3 Modify `getResourceIPAddress()` to support fallback flow
  - [x] 1.3.1 Return failure Result (not error) when IP is null
  - [x] 1.3.2 Maintain existing error messages for resource not found

## 2. Command Layer Implementation
- [x] 2.1 Update `ProxmoxVMConnect` command
  - [x] 2.1.1 Detect when FQDN fallback is used
  - [x] 2.1.2 Display "IP address not available for VM {vmid}, trying FQDN fallback..." message
  - [x] 2.1.3 Display "Connecting to VM {vmid} ({fqdn}) as {user}..." when using FQDN
  - [x] 2.1.4 Maintain existing message format when using IP
- [x] 2.2 Update `ProxmoxContainerConnect` command
  - [x] 2.2.1 Detect when FQDN fallback is used
  - [x] 2.2.2 Display "IP address not available for container {vmid}, trying FQDN fallback..." message
  - [x] 2.2.3 Display "Connecting to container {vmid} ({fqdn}) as {user}..." when using FQDN
  - [x] 2.2.4 Maintain existing message format when using IP

## 3. Testing - Service Layer
- [x] 3.1 Add tests for `getResourceFQDN()` in `test/services/proxmox-ssh.service.test.ts`
  - [x] 3.1.1 Test FQDN construction for VM
  - [x] 3.1.2 Test FQDN construction for container
  - [x] 3.1.3 Test resource not found error
  - [x] 3.1.4 Test repository failure handling
- [x] 3.2 Add tests for `connectSSH()` fallback logic
  - [x] 3.2.1 Test IP-based connection when IP is available (existing behavior)
  - [x] 3.2.2 Test FQDN fallback when IP is null
  - [x] 3.2.3 Test FQDN fallback when IP resolution fails
  - [x] 3.2.4 Test failure when both IP and FQDN resolution fail
  - [x] 3.2.5 Verify correct SSH command construction with FQDN
  - [x] 3.2.6 Test fallback with custom username
  - [x] 3.2.7 Test fallback with custom SSH key path

## 4. Testing - Command Layer
- [x] 4.1 Add tests for `ProxmoxVMConnect` command
  - [x] 4.1.1 Test output message when using IP (existing behavior)
  - [x] 4.1.2 Test fallback message display when FQDN is used
  - [x] 4.1.3 Test error message when both strategies fail
- [x] 4.2 Add tests for `ProxmoxContainerConnect` command
  - [x] 4.2.1 Test output message when using IP (existing behavior)
  - [x] 4.2.2 Test fallback message display when FQDN is used
  - [x] 4.2.3 Test error message when both strategies fail

## 5. Build and Validation
- [x] 5.1 Run build to verify TypeScript compilation: `pnpm run build`
- [x] 5.2 Run all tests to ensure no regressions: `pnpm test`
- [x] 5.3 Run linter to verify code style: `pnpm run lint`
- [x] 5.4 Manually test VM connect with IP available
- [x] 5.5 Manually test VM connect with FQDN fallback
- [x] 5.6 Manually test container connect with IP available
- [x] 5.7 Manually test container connect with FQDN fallback

## 6. Documentation
- [x] 6.1 Verify command help text is automatically updated by oclif
- [x] 6.2 Update README via `pnpm run prepack` (automatic)
- [x] 6.3 Review generated documentation for accuracy

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
