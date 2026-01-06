# interactive-vm-selection Specification

## Purpose
Enable users to interactively select running VMs or containers when connecting via SSH, without needing to know the VMID in advance.

## MODIFIED Requirements

### Requirement: Optional VMID Argument for VM Connect Command

The `homelab proxmox vm connect` command SHALL accept VMID as an optional argument instead of required.

**Priority**: P0
**Type**: Functional

#### Scenario: Connect with explicit VMID (backward compatibility)

**Given** a running VM with VMID 100
**When** the user runs `homelab proxmox vm connect 100`
**Then** the command SHALL connect directly to VM 100 without prompting
**And** no interactive prompt SHALL be displayed
**And** existing connection behavior SHALL remain unchanged

#### Scenario: Connect without VMID shows interactive prompt

**Given** multiple running VMs exist in the Proxmox cluster
**When** the user runs `homelab proxmox vm connect` without providing a VMID
**Then** the command SHALL display an interactive selection prompt
**And** the prompt SHALL list all running VMs
**And** the prompt message SHALL be "Select a VM to connect to:"

#### Scenario: Help text reflects optional argument

**Given** the user runs `homelab proxmox vm connect --help`
**Then** the VMID argument description SHALL indicate it is optional
**And** the description SHALL mention that a prompt will appear if not provided
**And** existing examples with explicit VMID SHALL remain valid

### Requirement: Optional VMID Argument for Container Connect Command

The `homelab proxmox container connect` command SHALL accept VMID as an optional argument instead of required.

**Priority**: P0
**Type**: Functional

#### Scenario: Connect with explicit VMID (backward compatibility)

**Given** a running container with VMID 200
**When** the user runs `homelab proxmox container connect 200`
**Then** the command SHALL connect directly to container 200 without prompting
**And** no interactive prompt SHALL be displayed
**And** existing connection behavior SHALL remain unchanged

#### Scenario: Connect without VMID shows interactive prompt

**Given** multiple running containers exist in the Proxmox cluster
**When** the user runs `homelab proxmox container connect` without providing a VMID
**Then** the command SHALL display an interactive selection prompt
**And** the prompt SHALL list all running containers
**And** the prompt message SHALL be "Select a container to connect to:"

#### Scenario: Help text reflects optional argument

**Given** the user runs `homelab proxmox container connect --help`
**Then** the VMID argument description SHALL indicate it is optional
**And** the description SHALL mention that a prompt will appear if not provided
**And** existing examples with explicit VMID SHALL remain valid

## ADDED Requirements

### Requirement: Running Resources Service Method

The ProxmoxSSHService SHALL provide a method to retrieve only running VMs or containers for interactive selection.

**Priority**: P0
**Type**: Functional

#### Scenario: Get running VMs

**Given** the Proxmox cluster has 3 VMs:
  - VM 100 (status: 'running')
  - VM 101 (status: 'stopped')
  - VM 102 (status: 'running')
**When** the service method `getRunningResources('qemu')` is called
**Then** it SHALL return a Result containing 2 VMs (100 and 102)
**And** VM 101 SHALL be excluded from the results
**And** the returned VMs SHALL include vmid, name, status, and ipv4Address fields

#### Scenario: Get running containers

**Given** the Proxmox cluster has 2 containers:
  - Container 200 (status: 'running')
  - Container 201 (status: 'stopped')
**When** the service method `getRunningResources('lxc')` is called
**Then** it SHALL return a Result containing 1 container (200)
**And** container 201 SHALL be excluded from the results
**And** the returned container SHALL include vmid, name, status, and ipv4Address fields

#### Scenario: No running resources available

**Given** all VMs in the cluster are stopped
**When** the service method `getRunningResources('qemu')` is called
**Then** it SHALL return a success Result with an empty array
**And** the command layer SHALL handle the empty list appropriately

#### Scenario: Repository error when fetching resources

**Given** the Proxmox repository fails to list resources
**When** the service method `getRunningResources('qemu')` is called
**Then** it SHALL return a failure Result with a ServiceError
**And** the error SHALL include the underlying repository error as cause
**And** the error message SHALL indicate failure to retrieve resources

#### Scenario: Service method uses repository interface

**Given** ProxmoxSSHService is instantiated with a repository
**When** `getRunningResources()` is called
**Then** it SHALL delegate to `repository.listResources(resourceType)`
**And** it SHALL filter results where `status === 'running'`
**And** it SHALL NOT make direct API calls

### Requirement: Interactive VM Selection Prompt

When VMID is not provided, the VM connect command SHALL display an interactive prompt listing running VMs.

**Priority**: P0
**Type**: Functional

#### Scenario: Display formatted VM choices

**Given** running VMs:
  - VM 100: name='ubuntu-web', ip='192.168.1.10'
  - VM 102: name='alpine-cache', ip='192.168.1.12'
**When** the interactive prompt is displayed
**Then** the choices SHALL be formatted as:
  - "100 - ubuntu-web (192.168.1.10)"
  - "102 - alpine-cache (192.168.1.12)"
**And** users SHALL navigate with arrow keys
**And** users SHALL select with Enter key

#### Scenario: Display VM without IP address

**Given** a running VM 103 with name='debian-test' and ipv4Address=null
**When** the interactive prompt is displayed
**Then** the choice SHALL be formatted as "103 - debian-test (No IP)"
**And** the user SHALL still be able to select this VM
**And** the connection attempt SHALL proceed (may fail at SSH stage)

#### Scenario: User selects a VM from prompt

**Given** the interactive prompt displays 2 running VMs
**When** the user navigates to "100 - ubuntu-web (192.168.1.10)" and presses Enter
**Then** the command SHALL extract VMID 100 from the selection
**And** the command SHALL proceed to connect via SSH to VMID 100
**And** the connection flow SHALL be identical to explicit VMID usage

#### Scenario: User cancels the selection prompt

**Given** the interactive prompt is displayed
**When** the user presses Ctrl+C to cancel
**Then** the command SHALL exit gracefully without error
**And** the command SHALL log "Selection cancelled."
**And** the exit code SHALL be 0 (not an error condition)

### Requirement: Interactive Container Selection Prompt

When VMID is not provided, the container connect command SHALL display an interactive prompt listing running containers.

**Priority**: P0
**Type**: Functional

#### Scenario: Display formatted container choices

**Given** running containers:
  - Container 200: name='web-app', ip='192.168.1.20'
  - Container 201: name='database', ip='192.168.1.21'
**When** the interactive prompt is displayed
**Then** the choices SHALL be formatted as:
  - "200 - web-app (192.168.1.20)"
  - "201 - database (192.168.1.21)"
**And** users SHALL navigate with arrow keys
**And** users SHALL select with Enter key

#### Scenario: Display container without IP address

**Given** a running container 202 with name='cache' and ipv4Address=null
**When** the interactive prompt is displayed
**Then** the choice SHALL be formatted as "202 - cache (No IP)"
**And** the user SHALL still be able to select this container
**And** the connection attempt SHALL proceed (may fail at SSH stage)

#### Scenario: User selects a container from prompt

**Given** the interactive prompt displays 2 running containers
**When** the user navigates to "200 - web-app (192.168.1.20)" and presses Enter
**Then** the command SHALL extract VMID 200 from the selection
**And** the command SHALL proceed to connect via SSH to VMID 200
**And** the connection flow SHALL be identical to explicit VMID usage

#### Scenario: User cancels the selection prompt

**Given** the interactive prompt is displayed
**When** the user presses Ctrl+C to cancel
**Then** the command SHALL exit gracefully without error
**And** the command SHALL log "Selection cancelled."
**And** the exit code SHALL be 0 (not an error condition)

### Requirement: Empty Running Resources Handling

The connect commands SHALL provide helpful error messages when no running resources are available.

**Priority**: P0
**Type**: Functional

#### Scenario: No running VMs available

**Given** all VMs in the cluster are stopped
**When** the user runs `homelab proxmox vm connect` without VMID
**Then** the command SHALL display an error message
**And** the error message SHALL be "No running VMs found. Start a VM first or provide a VMID explicitly."
**And** the command SHALL exit with code 1

#### Scenario: No running containers available

**Given** all containers in the cluster are stopped
**When** the user runs `homelab proxmox container connect` without VMID
**Then** the command SHALL display an error message
**And** the error message SHALL be "No running containers found. Start a container first or provide a VMID explicitly."
**And** the command SHALL exit with code 1

### Requirement: VMID Extraction from Selection

The commands SHALL correctly extract VMID from the formatted selection string.

**Priority**: P0
**Type**: Functional

#### Scenario: Extract VMID from standard format

**Given** a user selects "100 - ubuntu-web (192.168.1.10)"
**When** the command extracts the VMID
**Then** it SHALL parse and return integer 100
**And** the integer SHALL be used for SSH connection

#### Scenario: Extract VMID from no-IP format

**Given** a user selects "103 - debian-test (No IP)"
**When** the command extracts the VMID
**Then** it SHALL parse and return integer 103
**And** the integer SHALL be used for SSH connection

#### Scenario: Handle malformed selection string

**Given** a selection string that doesn't match expected format
**When** the command attempts to extract VMID
**And** parsing results in NaN
**Then** the command SHALL handle the error gracefully
**And** display an appropriate error message

### Requirement: Service Layer Architecture Compliance

The running resources feature SHALL follow the project's layered architecture pattern.

**Priority**: P0
**Type**: Non-Functional

#### Scenario: Service depends on repository interface

**Given** ProxmoxSSHService needs to fetch running resources
**Then** it SHALL use IProxmoxRepository.listResources()
**And** it SHALL NOT directly call Proxmox API
**And** filtering logic SHALL reside in the service layer

#### Scenario: Service returns Result type

**Given** the getRunningResources() method
**Then** it SHALL return `Promise<Result<ProxmoxVMDTO[], ServiceError>>`
**And** use success() for successful operations
**And** use failure() with ServiceError for errors

#### Scenario: Command layer uses service factory

**Given** the connect commands need ProxmoxSSHService
**Then** they SHALL use ProxmoxSSHFactory.createProxmoxSSHService()
**And** the factory SHALL provide a fully-wired service instance

### Requirement: Testing Coverage for Interactive Selection

The interactive selection feature SHALL have comprehensive test coverage.

**Priority**: P0
**Type**: Non-Functional

#### Scenario: Service tests for getRunningResources

**Given** ProxmoxSSHService tests
**Then** tests SHALL verify:
  - Only running resources are returned
  - Stopped resources are filtered out
  - Empty list is handled correctly
  - Repository errors are propagated
  - Resource properties are preserved

#### Scenario: Command tests for VM connect with prompt

**Given** VM connect command tests
**Then** tests SHALL verify:
  - VMID provided → no prompt displayed
  - VMID not provided → prompt displayed
  - User selection → VMID extracted correctly
  - User cancellation → graceful exit
  - No running VMs → error message displayed

#### Scenario: Command tests for container connect with prompt

**Given** container connect command tests
**Then** tests SHALL verify:
  - VMID provided → no prompt displayed
  - VMID not provided → prompt displayed
  - User selection → VMID extracted correctly
  - User cancellation → graceful exit
  - No running containers → error message displayed

#### Scenario: Mock prompt utility in tests

**Given** command tests need to test prompt scenarios
**Then** tests SHALL mock promptForSelection function
**And** avoid requiring actual user interaction
**And** verify prompt is called with correct parameters

### Requirement: Prompt Integration with Existing Utilities

The commands SHALL use existing prompt utilities for consistency.

**Priority**: P0
**Type**: Functional

#### Scenario: Use promptForSelection from utils

**Given** the connect commands need to display a selection prompt
**Then** they SHALL import and use `promptForSelection` from `src/utils/prompts.ts`
**And** they SHALL NOT implement custom prompt logic
**And** they SHALL follow the Result pattern for handling prompt results

#### Scenario: Prompt configuration matches project patterns

**Given** the selection prompt is configured
**Then** it SHALL use the `message` property for prompt text
**And** it SHALL use the `choices` property for the list of VMs/containers
**And** it SHALL handle cancellation via Result error handling

### Requirement: Documentation and Examples

The enhanced commands SHALL provide clear documentation via help text and examples.

**Priority**: P1
**Type**: Non-Functional

#### Scenario: VM connect help includes interactive example

**Given** the user runs `homelab proxmox vm connect --help`
**Then** examples SHALL include:
  - Interactive selection: `homelab proxmox vm connect`
  - Explicit VMID: `homelab proxmox vm connect 100`
**And** the description SHALL mention optional VMID and interactive prompt

#### Scenario: Container connect help includes interactive example

**Given** the user runs `homelab proxmox container connect --help`
**Then** examples SHALL include:
  - Interactive selection: `homelab proxmox container connect`
  - Explicit VMID: `homelab proxmox container connect 200`
**And** the description SHALL mention optional VMID and interactive prompt

### Requirement: Performance Considerations

The interactive selection SHALL minimize additional API calls when VMID is provided.

**Priority**: P1
**Type**: Non-Functional

#### Scenario: No extra API calls with explicit VMID

**Given** a user provides VMID explicitly
**When** the command executes
**Then** it SHALL NOT call getRunningResources()
**And** it SHALL NOT make any additional API calls beyond existing behavior
**And** performance SHALL be identical to previous implementation

#### Scenario: One additional API call without VMID

**Given** a user omits the VMID argument
**When** the command executes
**Then** it SHALL make exactly 1 additional API call to list resources
**And** filtering SHALL happen in-memory
**And** the performance impact SHALL be acceptable (<500ms on local network)
