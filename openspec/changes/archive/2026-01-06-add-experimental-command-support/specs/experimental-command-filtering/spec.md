# Specification: Experimental Command Filtering

## ADDED Requirements

### Requirement: Experimental flag support in BaseCommand
The system MUST provide a global `--experimental` flag that can be used with any command.

#### Scenario: User runs command with experimental flag
**Given** the user wants to use experimental features
**When** they invoke any command with `--experimental` flag
**Then** the flag is recognized and available to all commands
**And** the experimental mode is activated

#### Scenario: User runs command without experimental flag
**Given** the user runs a command without specifying experimental flag
**When** the command executes
**Then** experimental mode is NOT activated
**And** normal command behavior occurs

### Requirement: Environment variable override
The system MUST support `HOMELAB_CLI_EXPERIMENTAL` environment variable to enable experimental mode.

#### Scenario: Environment variable enables experimental mode
**Given** the user sets `HOMELAB_CLI_EXPERIMENTAL=true`
**When** they invoke any command without the `--experimental` flag
**Then** experimental mode is activated as if the flag was set

#### Scenario: Environment variable is set to false
**Given** the user sets `HOMELAB_CLI_EXPERIMENTAL=false`
**When** they invoke a command
**Then** experimental mode is NOT activated

#### Scenario: Flag takes precedence over environment variable
**Given** `HOMELAB_CLI_EXPERIMENTAL=false` is set
**When** the user runs a command with `--experimental` flag
**Then** experimental mode is activated (flag overrides env var)

### Requirement: Experimental command marker
Commands MUST be able to declare themselves as experimental via a static property.

#### Scenario: Command declares itself as experimental
**Given** a command class extends BaseCommand
**When** the command sets `static isExperimental = true`
**Then** the command is recognized as experimental by the system

#### Scenario: Command does not declare experimental property
**Given** a command class extends BaseCommand
**When** the command does NOT set `static isExperimental` property
**Then** the command is treated as stable (non-experimental)

### Requirement: Warning message for experimental features
The system MUST display a warning message when experimental mode is active.

#### Scenario: Warning shown when executing experimental command with flag
**Given** a command has `static isExperimental = true`
**When** the user executes it with `--experimental` flag
**Then** a warning message is displayed: "Warning: You are using experimental features. These features are not yet stable and may change in future releases."

#### Scenario: Warning shown when experimental mode enabled via env var
**Given** `HOMELAB_CLI_EXPERIMENTAL=true` is set
**When** the user executes an experimental command
**Then** the warning message is displayed

#### Scenario: No warning for stable commands
**Given** a command does NOT have `static isExperimental = true`
**When** the user executes it with `--experimental` flag
**Then** no warning message is displayed

### Requirement: Help output filtering based on experimental mode
The help system MUST filter command listings based on experimental mode.

#### Scenario: Help shows only experimental commands when flag is set
**Given** the CLI has both experimental and stable commands
**When** the user runs `homelab --experimental help`
**Then** only commands with `static isExperimental = true` are shown in help output
**And** stable commands are hidden

#### Scenario: Help shows only stable commands by default
**Given** the CLI has both experimental and stable commands
**When** the user runs `homelab help` without experimental flag
**Then** only stable commands (without `static isExperimental = true`) are shown
**And** experimental commands are hidden

#### Scenario: Help for specific experimental command
**Given** a command has `static isExperimental = true`
**When** the user runs `homelab [experimental-command] --help` without experimental flag
**Then** the command help is still displayed (command is executable)

### Requirement: Initial experimental commands
The following commands MUST be marked as experimental in the initial implementation.

#### Scenario: Config read command is experimental
**Given** the `config read` command exists
**When** the command class is reviewed
**Then** it has `static isExperimental = true`

#### Scenario: Config write command is experimental
**Given** the `config write` command exists
**When** the command class is reviewed
**Then** it has `static isExperimental = true`

#### Scenario: Exec demo command is experimental
**Given** the `exec demo` command exists
**When** the command class is reviewed
**Then** it has `static isExperimental = true`

#### Scenario: Prompt demo command is experimental
**Given** the `prompt demo` command exists
**When** the command class is reviewed
**Then** it has `static isExperimental = true`

### Requirement: Experimental commands remain executable
Experimental commands MUST be executable regardless of experimental flag state.

#### Scenario: Execute experimental command without flag
**Given** a command has `static isExperimental = true`
**When** the user executes it directly without `--experimental` flag
**Then** the command executes normally
**And** no warning is shown

#### Scenario: Execute experimental command with flag
**Given** a command has `static isExperimental = true`
**When** the user executes it with `--experimental` flag
**Then** the command executes normally
**And** warning message is shown before execution
