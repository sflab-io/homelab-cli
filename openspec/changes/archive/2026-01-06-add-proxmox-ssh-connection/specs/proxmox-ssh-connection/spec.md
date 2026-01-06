## ADDED Requirements

### Requirement: SSH Connection Service

The system SHALL provide a service for establishing SSH connections to Proxmox VMs and LXC containers with configurable credentials.

#### Scenario: Connect to VM with default credentials

- **GIVEN** a VM with vmid 100 has IP address 192.168.1.10
- **WHEN** the SSH service connects to the VM with default credentials
- **THEN** it SHALL execute `ssh -i ~/.ssh/admin_id_ecdsa admin@192.168.1.10`
- **AND** use `stdio: 'inherit'` for interactive terminal session
- **AND** return Result indicating success or failure

#### Scenario: Connect to container with custom username

- **GIVEN** a container with vmid 200 has IP address 192.168.1.20
- **WHEN** the SSH service connects with username 'root'
- **THEN** it SHALL execute `ssh -i ~/.ssh/admin_id_ecdsa root@192.168.1.20`
- **AND** use `stdio: 'inherit'` for interactive terminal session

#### Scenario: Connect with custom SSH key path

- **GIVEN** a VM with vmid 100 has IP address 192.168.1.10
- **WHEN** the SSH service connects with key path '/custom/path/id_rsa'
- **THEN** it SHALL execute `ssh -i /custom/path/id_rsa admin@192.168.1.10`
- **AND** use `stdio: 'inherit'` for interactive terminal session

#### Scenario: Handle missing IP address

- **GIVEN** a VM exists but has no IP address (guest agent unavailable)
- **WHEN** attempting to connect
- **THEN** it SHALL return failure Result with ServiceError
- **AND** error message SHALL indicate IP address unavailable
- **AND** suggest checking if VM is running and guest agent is installed

### Requirement: IP Address Resolution for SSH

The SSH service SHALL retrieve IP addresses by querying the Proxmox repository for resource details.

#### Scenario: Resolve IP for QEMU VM

- **GIVEN** a QEMU VM with vmid 100
- **WHEN** the SSH service resolves the IP address
- **THEN** it SHALL call `repository.listResources('qemu')`
- **AND** filter results to find resource with matching vmid
- **AND** extract ipv4Address from the resource
- **AND** return the IP address or error if not found

#### Scenario: Resolve IP for LXC container

- **GIVEN** an LXC container with vmid 200
- **WHEN** the SSH service resolves the IP address
- **THEN** it SHALL call `repository.listResources('lxc')`
- **AND** filter results to find resource with matching vmid
- **AND** extract ipv4Address from the resource
- **AND** return the IP address or error if not found

#### Scenario: Handle non-existent VMID

- **GIVEN** vmid 999 does not exist
- **WHEN** the SSH service attempts to resolve IP
- **THEN** it SHALL return failure Result
- **AND** error message SHALL indicate resource not found

#### Scenario: Handle null IP address

- **GIVEN** a VM exists but ipv4Address is null
- **WHEN** the SSH service attempts to resolve IP
- **THEN** it SHALL return failure Result
- **AND** error message SHALL suggest checking VM status and guest agent

### Requirement: VM SSH Connection Command

The system SHALL provide a command `homelab proxmox vm connect <vmid>` to establish SSH connection to a VM.

#### Scenario: Connect to VM with VMID

- **GIVEN** the command `homelab proxmox vm connect 100` is executed
- **WHEN** VM 100 has IP address 192.168.1.10
- **THEN** it SHALL establish SSH connection using default credentials
- **AND** open interactive terminal session
- **AND** user can type commands and see output in real-time

#### Scenario: Connect with custom user flag

- **GIVEN** the command `homelab proxmox vm connect 100 --user root` is executed
- **WHEN** VM 100 exists
- **THEN** it SHALL use 'root' as SSH username
- **AND** connect with `ssh -i ~/.ssh/admin_id_ecdsa root@<ip>`

#### Scenario: Connect with custom key flag

- **GIVEN** the command `homelab proxmox vm connect 100 --key ~/.ssh/custom_key` is executed
- **WHEN** VM 100 exists
- **THEN** it SHALL use '~/.ssh/custom_key' as SSH key path
- **AND** connect with `ssh -i ~/.ssh/custom_key admin@<ip>`

#### Scenario: Handle VM connection failure

- **GIVEN** VM 100 has no IP address
- **WHEN** the connect command is executed
- **THEN** it SHALL display error message with actionable guidance
- **AND** exit with code 1

### Requirement: Container SSH Connection Command

The system SHALL provide a command `homelab proxmox container connect <vmid>` to establish SSH connection to an LXC container.

#### Scenario: Connect to container with VMID

- **GIVEN** the command `homelab proxmox container connect 200` is executed
- **WHEN** container 200 has IP address 192.168.1.20
- **THEN** it SHALL establish SSH connection using default credentials
- **AND** open interactive terminal session
- **AND** user can type commands and see output in real-time

#### Scenario: Connect with custom user flag

- **GIVEN** the command `homelab proxmox container connect 200 --user ubuntu` is executed
- **WHEN** container 200 exists
- **THEN** it SHALL use 'ubuntu' as SSH username
- **AND** connect with `ssh -i ~/.ssh/admin_id_ecdsa ubuntu@<ip>`

#### Scenario: Connect with custom key flag

- **GIVEN** the command `homelab proxmox container connect 200 --key /path/to/key` is executed
- **WHEN** container 200 exists
- **THEN** it SHALL use '/path/to/key' as SSH key path
- **AND** connect with `ssh -i /path/to/key admin@<ip>`

#### Scenario: Handle container connection failure

- **GIVEN** container 200 has no IP address
- **WHEN** the connect command is executed
- **THEN** it SHALL display error message with actionable guidance
- **AND** exit with code 1

### Requirement: Command Flag Defaults

The SSH connection commands SHALL provide sensible defaults for SSH credentials that match common homelab configurations.

#### Scenario: Default username

- **WHEN** no `--user` flag is provided
- **THEN** the username SHALL default to 'admin'

#### Scenario: Default SSH key path

- **WHEN** no `--key` flag is provided
- **THEN** the SSH key path SHALL default to '~/.ssh/admin_id_ecdsa'

#### Scenario: Both flags provided

- **WHEN** both `--user` and `--key` flags are provided
- **THEN** both custom values SHALL be used
- **AND** defaults SHALL be ignored

### Requirement: SSH Service Architecture

The ProxmoxSSHService SHALL follow the layered architecture pattern with dependency injection.

#### Scenario: Service depends on repository interface

- **GIVEN** ProxmoxSSHService is instantiated
- **THEN** it SHALL accept IProxmoxRepository via constructor
- **AND** use repository to retrieve IP addresses
- **AND** NOT directly call Proxmox API

#### Scenario: Service uses CommandExecutorService

- **GIVEN** ProxmoxSSHService needs to execute SSH command
- **THEN** it SHALL use CommandExecutorService.executeCommand()
- **AND** pass `stdio: 'inherit'` for interactive session
- **AND** handle Result pattern for error handling

#### Scenario: Service returns Result type

- **GIVEN** any ProxmoxSSHService method
- **THEN** it SHALL return `Promise<Result<void, ServiceError>>`
- **AND** use success() for successful connections
- **AND** use failure() with ServiceError for errors

### Requirement: Error Messages and User Guidance

SSH connection errors SHALL provide clear, actionable error messages to help users resolve issues.

#### Scenario: IP address unavailable error

- **WHEN** SSH connection fails due to missing IP address
- **THEN** error message SHALL include:
  - Resource type (VM or container)
  - VMID
  - Suggestion to check if resource is running
  - Suggestion to verify guest agent is installed

#### Scenario: SSH command execution error

- **WHEN** SSH command fails (e.g., key not found, connection refused)
- **THEN** error message SHALL include the underlying SSH error
- **AND** maintain original error context via Result pattern

#### Scenario: Resource not found error

- **WHEN** VMID does not exist
- **THEN** error message SHALL clearly indicate resource was not found
- **AND** suggest using list command to see available resources

### Requirement: Command Integration with Base Architecture

The SSH connection commands SHALL extend BaseCommand and integrate with existing CLI infrastructure.

#### Scenario: Extend BaseCommand

- **GIVEN** VM and container connect commands
- **THEN** both SHALL extend BaseCommand<typeof CommandClass>
- **AND** use this.parse() for argument/flag parsing
- **AND** access parsed values via this.args and this.flags

#### Scenario: Use factory pattern for service instantiation

- **GIVEN** SSH connection commands need ProxmoxSSHService
- **THEN** they SHOULD use a factory method to instantiate the service
- **OR** instantiate service directly with required dependencies
- **AND** follow existing patterns from other Proxmox commands

#### Scenario: Handle service errors with oclif error method

- **GIVEN** service returns failure Result
- **THEN** command SHALL call this.error() with error message
- **AND** set exit code 1

### Requirement: Testing Coverage

The SSH connection feature SHALL have comprehensive test coverage across all layers.

#### Scenario: Service tests with mock repository

- **GIVEN** ProxmoxSSHService tests
- **THEN** tests SHALL mock IProxmoxRepository
- **AND** test successful IP resolution
- **AND** test missing IP address scenarios
- **AND** test non-existent VMID scenarios
- **AND** verify correct SSH command construction

#### Scenario: Command tests

- **GIVEN** VM and container connect command tests
- **THEN** tests SHALL use runCommand() from @oclif/test
- **AND** test default flag values
- **AND** test custom --user and --key flags
- **AND** test error handling and exit codes

#### Scenario: Integration testing considerations

- **GIVEN** SSH connection involves external systems
- **THEN** unit tests SHALL mock command execution
- **AND** integration tests (if added) SHALL clearly document prerequisites
- **AND** tests SHALL NOT require actual Proxmox infrastructure

### Requirement: Documentation and Help Text

SSH connection commands SHALL provide clear documentation via help text and examples.

#### Scenario: VM connect command description

- **GIVEN** `homelab proxmox vm connect --help` is executed
- **THEN** description SHALL clearly state purpose: "Establish SSH connection to a Proxmox VM"
- **AND** show VMID argument as required
- **AND** document --user and --key flags with defaults

#### Scenario: Container connect command description

- **GIVEN** `homelab proxmox container connect --help` is executed
- **THEN** description SHALL clearly state purpose: "Establish SSH connection to a Proxmox LXC container"
- **AND** show VMID argument as required
- **AND** document --user and --key flags with defaults

#### Scenario: Command examples

- **GIVEN** help text for connect commands
- **THEN** examples SHALL include:
  - Basic connection with default credentials
  - Connection with custom username
  - Connection with custom SSH key
  - Connection with both custom user and key
