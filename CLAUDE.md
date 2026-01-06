<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript CLI application built with [oclif](https://oclif.io), a framework for building command-line tools. The CLI binary is named `homelab` and manages homelab infrastructure.

The project follows a layered architecture pattern:
- **Commands**: Entry points for CLI commands (oclif framework)
- **Services**: Business logic layer
- **Repositories**: Data access layer with interface abstraction
- **Models**: DTOs and Zod schemas for validation
- **Factories**: Entity creation and mapping
- **Config**: Configuration management with environment variables
- **Errors**: Custom error types for different layers

### Key Dependencies

- **oclif**: CLI framework (`@oclif/core`, `@oclif/plugin-help`, `@oclif/plugin-plugins`)
- **proxmox-api**: Proxmox VE API client
- **cli-table3**: Terminal tables for formatted output
- **zod**: Runtime type validation and schema definitions
- **tsx**: Fast TypeScript execution for testing
- **enquirer**: Interactive command-line prompts
- **date-fns**: Modern JavaScript date utility library
- **configstore**: Persistent configuration storage with environment variable overrides

## Development Commands

### Building
```bash
pnpm run build
```
This removes the `dist/` directory and compiles TypeScript using `tsc -b`.

### Testing
```bash
# Run all tests
pnpm test

# Run a single test file
pnpm exec mocha --forbid-only "test/path/to/file.test.ts"
```
Tests use Mocha with Chai assertions and `@oclif/test` utilities. The `--forbid-only` flag prevents committing focused tests.

### Linting
```bash
pnpm run lint
```
Uses ESLint with oclif and prettier configurations. Runs automatically after tests.

### Running the CLI Locally
```bash
# During development
./bin/dev.js <command>

# After building
./bin/run.js <command>
```

## Architecture

### Project Structure

```
src/
├── commands/             # CLI command implementations
│   ├── module/          # Module-related commands
│   │   └── list.ts      # List modules for a project
│   ├── project/         # Project-related commands
│   │   ├── list.ts      # List all projects
│   │   └── vscode.ts    # Open project/workspace in VS Code
│   ├── prompt/          # Interactive prompt demos
│   │   └── demo.ts      # Demonstrate interactive prompts
│   └── proxmox/         # Proxmox-related commands
│       ├── container/
│       │   └── list.ts  # List LXC containers
│       ├── template/
│       │   └── list.ts  # List VM templates
│       └── vm/
│           ├── cloudinit.ts  # Configure cloud-init for VMs
│           ├── create.ts     # Create VM from template
│           └── list.ts       # List VMs
├── config/              # Configuration management
│   ├── schemas/         # Zod schemas for configs
│   │   ├── proxmox-config.schema.ts
│   │   └── projects-dir.schema.ts
│   ├── proxmox.config.ts
│   └── projects-dir.config.ts
├── errors/              # Custom error types
│   ├── base.error.ts
│   ├── repository.error.ts
│   └── service.error.ts
├── factories/           # Entity factories
│   ├── module.factory.ts
│   ├── project.factory.ts
│   ├── proxmox-template.factory.ts
│   └── proxmox-vm.factory.ts
├── lib/                 # Shared libraries
│   └── base-command.ts  # Base command class
├── models/              # DTOs and schemas
│   ├── schemas/         # Zod validation schemas
│   ├── cloud-init-config.dto.ts
│   ├── module-fs.dto.ts
│   ├── project-context.dto.ts
│   ├── project-fs.dto.ts
│   ├── project.dto.ts
│   ├── proxmox-template.dto.ts
│   └── proxmox-vm.dto.ts
├── repositories/        # Data access layer
│   ├── interfaces/      # Repository contracts
│   │   ├── module-fs.repository.interface.ts
│   │   ├── project-fs.repository.interface.ts
│   │   ├── project.repository.interface.ts
│   │   └── proxmox.repository.interface.ts
│   ├── module-fs.repository.ts
│   ├── project-fs.repository.ts
│   └── proxmox-api.repository.ts
├── services/            # Business logic layer
│   ├── module-fs.service.ts
│   ├── project-fs.service.ts
│   ├── project.service.ts
│   ├── proxmox-template.service.ts
│   └── proxmox-vm.service.ts
├── utils/               # Utility functions
│   ├── detect-current-project.ts  # Project detection utility
│   ├── prompts.ts       # Interactive prompt utilities
│   ├── prompts.types.ts # Prompt type definitions
│   └── result.ts        # Result type for error handling
└── index.ts             # Entry point

test/
├── commands/            # Command tests
│   ├── module/
│   ├── project/
│   ├── prompt/
│   └── proxmox/
│       ├── container/
│       ├── template/
│       └── vm/
├── config/              # Config tests
├── integration/         # Integration tests
├── repositories/        # Repository tests
├── services/            # Service tests
└── utils/               # Utility tests
```

### Command Structure

Commands follow oclif conventions and are organized in `src/commands/`:
- Each command is a TypeScript class extending `Command` from `@oclif/core`
- Commands can be nested using directories (e.g., `proxmox/template/list.ts` creates `homelab proxmox template list`)
- After building, commands are loaded from `dist/commands/`

**Implemented Commands:**

*Project Management:*
- `homelab project list` - Lists all projects from filesystem
- `homelab project vscode [project-name] [workspace-name]` - Opens VS Code for a project or workspace (supports auto-detection)

*Module Management:*
- `homelab module list [project-name]` - Lists modules for a project (auto-detects current project if not specified)

*Interactive Prompts:*
- `homelab prompt demo` - Demonstrates interactive prompts (text, password, select, multi-select)

*Proxmox Infrastructure:*
- `homelab proxmox container list` - Lists all LXC containers
- `homelab proxmox vm list` - Lists all VMs (non-templates)
- `homelab proxmox vm create <template-name> <vm-name>` - Creates a new VM from a template
- `homelab proxmox vm cloudinit <vmid>` - Configures cloud-init settings for a VM
- `homelab proxmox template list` - Lists VM templates

**Command Anatomy:**
```typescript
import {Args, Flags} from '@oclif/core'
import {BaseCommand} from '../../lib/base-command.js'

export default class MyCommand extends BaseCommand<typeof MyCommand> {
  static description = 'Brief description'

  static args = {
    argName: Args.string({description: 'Arg description', required: true}),
  }

  static flags = {
    flagName: Flags.string({char: 'f', description: 'Flag description'}),
  }

  async run(): Promise<void> {
    await this.parse(MyCommand)
    // this.args and this.flags are available from BaseCommand
    // Implementation
  }
}
```

**Note**: Commands extend `BaseCommand` which provides:
- Automatic parsing of args and flags in `init()`
- Access to parsed values via `this.args` and `this.flags`
- Global flags like `--log-level`, `--json`, and `--experimental`
- Consistent error handling

**Experimental Commands:**

Commands can be marked as experimental to hide them from default help output. Experimental commands are useful for:
- Testing new features with opt-in users
- Iterating on command interfaces before stabilization
- Features that may change or be removed

To mark a command as experimental, add the `isExperimental` static property:

```typescript
export default class MyCommand extends BaseCommand<typeof MyCommand> {
  static isExperimental = true  // Marks command as experimental
  static description = 'My experimental feature'

  async run(): Promise<void> {
    // Implementation
  }
}
```

**Experimental Command Behavior:**
- Hidden from `homelab help` by default
- Shown in `homelab --experimental help` or when `HOMELAB_CLI_EXPERIMENTAL=true`
- Still executable without the flag (just hidden from help)
- Shows warning message when executed with `--experimental` flag or environment variable

**Current Experimental Commands:**
- `homelab config read` - Read CLI configuration
- `homelab config write` - Write CLI configuration
- `homelab exec demo` - Command execution demonstration
- `homelab prompt demo` - Interactive prompts demonstration

### Testing Pattern

Tests use `runCommand` from `@oclif/test`:
```typescript
import {runCommand} from '@oclif/test'
import {expect} from 'chai'

describe('command-name', () => {
  it('runs command', async () => {
    const {stdout} = await runCommand('command-name arg --flag value')
    expect(stdout).to.contain('expected output')
  })
})
```

### Build System

- **TypeScript**: Configured for ES2022 with Node16 modules (ESM)
- **Module System**: ES modules (`"type": "module"` in package.json)
- **Output**: Compiled to `dist/` with declaration files
- **Manifest**: Generated via `oclif manifest` during `prepack` to optimize command loading

### Plugin System

The CLI uses oclif's plugin architecture:
- `@oclif/plugin-help`: Automatic help documentation
- `@oclif/plugin-plugins`: Plugin management capabilities

### Layered Architecture Pattern

The project follows a strict layered architecture:

1. **Command Layer** (`src/commands/`): Handles CLI interaction, parsing args/flags
2. **Service Layer** (`src/services/`): Contains business logic, orchestrates repositories
3. **Repository Layer** (`src/repositories/`): Abstracts data access, implements interfaces
4. **Model Layer** (`src/models/`): Defines DTOs with Zod schemas for validation
5. **Factory Layer** (`src/factories/`): Creates and maps domain entities

**Benefits:**
- Clear separation of concerns
- Testability through dependency injection
- Type safety with Zod runtime validation
- Easy to mock repositories for unit testing

### Configuration Management

Configuration is managed through environment variables and validated with Zod schemas.

**Proxmox Configuration** (see `src/config/proxmox.config.ts`):

Required environment variables:
- `PROXMOX_USER`: Proxmox user (e.g., 'root')
- `PROXMOX_REALM`: Authentication realm (e.g., 'pam')
- `PROXMOX_TOKEN_KEY`: Token identifier (e.g., 'homelabcli')
- `PROXMOX_TOKEN_SECRET`: Token secret (UUID format)
- `PROXMOX_HOST`: Hostname without protocol (e.g., 'proxmox.home.sflab.io')

Optional environment variables:
- `PROXMOX_PORT`: Port number (defaults to 8006)
- `PROXMOX_REJECT_UNAUTHORIZED`: Verify SSL certificates (defaults to true, set to 'false' for self-signed certs)

**Loading Configuration:**
```typescript
import {loadProxmoxConfig} from './config/proxmox.config.js'

const config = loadProxmoxConfig() // Throws if validation fails
```

**Projects Directory Configuration** (see `src/config/projects-dir.config.ts`):

Optional environment variable:
- `PROJECTS_DIR`: Path to projects directory (defaults to `~/projects/`)

**Loading Configuration:**
```typescript
import {loadProjectsDirConfig} from './config/projects-dir.config.js'

const config = loadProjectsDirConfig() // Returns {projectsDir: '/absolute/path'}
```

**CLI Configuration with Configstore** (see `src/config/cli.config.ts`):

The CLI uses `configstore` for persistent configuration management with a three-tier precedence hierarchy:

1. **Environment variables** (highest priority) - for CI/CD and overrides
2. **Configstore** (fallback) - persistent user configuration
3. **Schema defaults** (lowest priority) - hardcoded sensible defaults

**Available Settings:**
- `logLevel`: Log level ('debug', 'info', 'warn', 'error') - defaults to 'info'
- `colorOutput`: Enable colored output (boolean) - defaults to true

**Environment Variable Overrides:**
Environment variables use the `HOMELAB_` prefix with uppercase snake_case:
- `HOMELAB_LOG_LEVEL`: Override logLevel
- `HOMELAB_COLOR_OUTPUT`: Override colorOutput ('true' or 'false')

**Using CLI Configuration:**
```typescript
import {getCliConfig} from './config/cli.config.js'

const config = getCliConfig() // Returns singleton instance

// Read configuration values
const logLevel = config.get('logLevel')
const colorOutput = config.get('colorOutput')

// Write configuration values
config.set('logLevel', 'debug')
config.set('colorOutput', false)

// Get all configuration
const allConfig = config.getAll()

// Get config file path
const path = config.getPath()
```

**CLI Commands for Configuration:**
```bash
# Read all configuration
homelab config read

# Read specific key
homelab config read logLevel

# Show config file location
homelab config read --path

# Write configuration
homelab config write logLevel debug
homelab config write colorOutput false
```

**Configuration File Locations:**
Configstore automatically determines the config file location based on OS:
- **Linux**: `~/.config/homelab-cli/config.json`
- **macOS**: `~/Library/Preferences/homelab-cli/config.json`
- **Windows**: `%APPDATA%\homelab-cli\config.json`

**Testing with Configstore:**
When writing tests for configstore-backed configurations:
- Use unique package names for test instances to avoid conflicts
- Clean up test config files in afterEach hooks if needed
- Use environment variables to override config in tests
- Example:
```typescript
const config = new CliConfigManager('test-unique-name')
config.set('logLevel', 'debug')

// Verify persistence with new instance
const config2 = new CliConfigManager('test-unique-name')
expect(config2.get('logLevel')).to.equal('debug')
```

**Utilities:**

*Project Detection* (see `src/utils/detect-current-project.ts`):
```typescript
import {detectCurrentProject} from './utils/detect-current-project.js'

const projectName = detectCurrentProject(process.cwd(), '/Users/user/projects')
// Returns 'myproject' if cwd is '/Users/user/projects/myproject/src/foo'
// Returns null if cwd is outside the projects directory
```

*Interactive Prompts* (see `src/utils/prompts.ts`):
```typescript
import {promptText, promptPassword, promptSelect, promptMultiSelect} from './utils/prompts.js'

// Text input
const name = await promptText('Enter your name')

// Password input (hidden)
const password = await promptPassword('Enter password')

// Single selection
const choice = await promptSelect('Choose an option', ['Option 1', 'Option 2', 'Option 3'])

// Multiple selection
const choices = await promptMultiSelect('Select features', ['Feature A', 'Feature B', 'Feature C'])
```

The prompt utilities are built on top of the `enquirer` library and provide a consistent interface for interactive command-line prompts. See `src/commands/prompt/demo.ts` for examples.

*Debug Logging* (see `src/utils/debug-logger.ts`):

All repository methods include enhanced debug logging that activates when the `--log-level debug` flag is used. This provides detailed error information for troubleshooting:

```typescript
import {logDebugError} from './utils/debug-logger.js'

// In repository catch blocks
try {
  // ... repository operation
} catch (error) {
  logDebugError('Description of operation that failed', error, {
    // Include non-sensitive context
    host: this.config.host,
    port: this.config.port,
    // EXCLUDE sensitive data: tokenSecret, passwords, keys
  })

  return failure(new RepositoryError('User-friendly error message'))
}
```

**Using Debug Mode:**
```bash
# Enable debug logging via flag
homelab --log-level debug proxmox template list

# Enable debug logging via environment variable
HOMELAB_LOG_LEVEL=debug homelab proxmox template list
```

**Debug Output Includes:**
- Full error stack traces
- Error cause chain (nested errors)
- Contextual information (parameters, configuration)
- Clear separation from normal output

**Security Note:** Debug logging deliberately excludes sensitive information such as API tokens, passwords, and private keys. Only include non-sensitive diagnostic information in the context parameter.

## Key Patterns

### Architecture Decision: When to Use Service/Repository Layers

The project supports two architectural patterns depending on command complexity:

**Layered Architecture** (Service + Repository):
- Use when the command interacts with external APIs or databases
- Use when business logic is complex or reusable
- Examples: Proxmox commands, project/module listing

**Command-Only Architecture**:
- Use for simple shell/filesystem operations
- Use when there's no reusable business logic
- Examples: `project vscode` command (just spawns VS Code process)

**Decision Criteria:**
- Does the command need to interact with external services? → Use layers
- Is there reusable business logic? → Use layers
- Is it a simple one-off operation? → Command-only
- Will other commands need similar functionality? → Use layers

### Adding a New Command with Layered Architecture

When adding a new command that requires service/repository layers, follow this pattern:

1. **Define the Model** (`src/models/`):
   ```typescript
   // src/models/my-entity.dto.ts
   export class MyEntityDto {
     constructor(
       public readonly id: string,
       public readonly name: string,
     ) {}
   }
   ```

2. **Create Zod Schema** (`src/models/schemas/`):
   ```typescript
   // src/models/schemas/my-entity.schema.ts
   import {z} from 'zod'

   export const MyEntitySchema = z.object({
     id: z.string().uuid(),
     name: z.string().min(1),
   })
   ```

3. **Create Factory** (`src/factories/`):
   ```typescript
   // src/factories/my-entity.factory.ts
   import {MyEntityDto} from '../models/my-entity.dto.js'
   import {MyEntitySchema} from '../models/schemas/my-entity.schema.js'

   export class MyEntityFactory {
     static fromApiResponse(raw: unknown): MyEntityDto {
       const validated = MyEntitySchema.parse(raw)
       return new MyEntityDto(validated.id, validated.name)
     }
   }
   ```

4. **Define Repository Interface** (`src/repositories/interfaces/`):
   ```typescript
   // src/repositories/interfaces/my-entity.repository.interface.ts
   import type {Result} from '../../utils/result.js'
   import type {MyEntityDto} from '../../models/my-entity.dto.js'

   export interface IMyEntityRepository {
     findAll(): Promise<Result<MyEntityDto[]>>
   }
   ```

5. **Implement Repository** (`src/repositories/`):
   ```typescript
   // src/repositories/my-entity.repository.ts
   import type {IMyEntityRepository} from './interfaces/my-entity.repository.interface.js'

   export class MyEntityRepository implements IMyEntityRepository {
     async findAll(): Promise<Result<MyEntityDto[]>> {
       // Implementation
     }
   }
   ```

6. **Create Service** (`src/services/`):
   ```typescript
   // src/services/my-entity.service.ts
   import type {IMyEntityRepository} from '../repositories/interfaces/my-entity.repository.interface.js'

   export class MyEntityService {
     constructor(private repository: IMyEntityRepository) {}

     async list(): Promise<Result<MyEntityDto[]>> {
       return this.repository.findAll()
     }
   }
   ```

7. **Create Command** (`src/commands/`):
   ```typescript
   // src/commands/myentity/list.ts
   import Table from 'cli-table3'
   import {BaseCommand} from '../../lib/base-command.js'
   import {MyEntityFactory} from '../../factories/my-entity.factory.js'

   export default class MyEntityList extends BaseCommand<typeof MyEntityList> {
     static description = 'List all my entities'

     async run(): Promise<void> {
       await this.parse(MyEntityList)

       // Use factory to get fully-wired service
       const service = MyEntityFactory.createMyEntityService()
       const result = await service.list()

       if (!result.success) {
         this.error(result.error.message, {exit: 1})
       }

       const table = new Table({head: ['ID', 'Name']})
       for (const entity of result.data) {
         table.push([entity.id, entity.name])
       }
       this.log(table.toString())
     }
   }
   ```

8. **Add Tests** for each layer:
   - `test/repositories/my-entity.repository.test.ts`
   - `test/services/my-entity.service.test.ts`
   - `test/commands/myentity/list.test.ts`

9. Build and test: `pnpm run build && pnpm test`

10. Update README: `pnpm run prepack`

### Error Handling Pattern

The project uses a `Result<T>` type for error handling instead of throwing exceptions:

```typescript
// src/utils/result.ts
export type Result<T> =
  | {success: true; data: T}
  | {success: false; error: Error}

// Usage in services/repositories
async findAll(): Promise<Result<MyEntityDto[]>> {
  try {
    const data = await this.apiCall()
    return {success: true, data}
  } catch (error) {
    return {success: false, error: new RepositoryError('Failed to fetch')}
  }
}

// Usage in commands
const result = await service.list()
if (!result.success) {
  this.error(result.error.message) // oclif's error method
}
// Use result.data safely here
```

**Custom Error Types:**
- `BaseError` - Base error class
- `RepositoryError` - Data access errors
- `ServiceError` - Business logic errors

### Updating README

The README is auto-generated from oclif manifest:
```bash
pnpm run prepack  # Generates manifest and updates README
```
This happens automatically during `pnpm pack` or version bumps.

## OpenSpec Integration

This project uses OpenSpec for managing changes and proposals. OpenSpec is a framework for systematic change management.

**Key OpenSpec Commands:**
- `/openspec:proposal` - Create a new change proposal
- `/openspec:apply` - Implement an approved change
- `/openspec:archive` - Archive a deployed change

**OpenSpec Structure:**
- `openspec/AGENTS.md` - Instructions for AI assistants
- `openspec/project.md` - Project-level specs
- `openspec/changes/` - Individual change proposals with specs and tasks

When making significant changes (new features, architecture changes, breaking changes), consult `openspec/AGENTS.md` first.

## Important Files

- `package.json`: Contains oclif configuration in the `oclif` section
- `src/index.ts`: Entry point that exports oclif's `run` function
- `bin/run.js`: Production CLI entry point
- `bin/dev.js`: Development CLI entry point with tsx/ts-node support
- `tsconfig.json`: TypeScript configuration for Node16 modules
- `test/tsconfig.json`: Test-specific TypeScript configuration

## Environment Setup

Create a `.env` file or set environment variables:

```bash
# Proxmox Configuration (for proxmox commands)
PROXMOX_USER=root
PROXMOX_REALM=pam
PROXMOX_TOKEN_KEY=homelabcli
PROXMOX_TOKEN_SECRET=your-token-secret-uuid
PROXMOX_HOST=proxmox.home.sflab.io
PROXMOX_PORT=8006  # Optional, defaults to 8006
PROXMOX_REJECT_UNAUTHORIZED=false  # Optional, set to false for self-signed certificates

# Project Configuration (for project commands)
PROJECTS_DIR=~/projects/  # Optional, defaults to ~/projects/
```

## Requirements

- Node.js >= 18.0.0
- pnpm package manager

## Testing

Tests are organized by layer:
- **Unit tests**: Test individual components in isolation
- **Integration tests**: Test interaction with external services (e.g., Proxmox API)

Test execution uses `tsx` for fast TypeScript execution:
```bash
# All tests
pnpm test

# Single test file
pnpm exec mocha --forbid-only "test/path/to/file.test.ts"

# Integration tests (may require environment setup)
pnpm exec mocha --forbid-only "test/integration/**/*.test.ts"
```

**Test Patterns:**
- Use `@oclif/test` utilities for command testing
- Mock repositories in service tests using interfaces
- Use factories to create test data
- Integration tests may require actual Proxmox credentials
