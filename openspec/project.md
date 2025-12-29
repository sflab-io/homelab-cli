# Project Context

## Purpose
`homelab-cli` is a TypeScript-based command-line interface (CLI) application for managing homelab infrastructure. Built on the oclif framework, it provides a structured, extensible toolset for homelab operations. The binary is invoked as `homelab`.

## Tech Stack
- **Language**: TypeScript 5.x (ES2022 target, Node16 module system)
- **CLI Framework**: oclif v4 (provides command structure, plugin system, help generation)
- **Runtime**: Node.js >= 18.0.0
- **Package Manager**: pnpm
- **Testing**: Mocha + Chai + @oclif/test utilities
- **Linting**: ESLint with oclif and prettier configurations
- **Module System**: ES modules (`"type": "module"` in package.json)

## Project Conventions

### Code Style
- **Module Format**: ES modules (ESM) with `.js` extensions in import paths after compilation
- **TypeScript**: Strict mode enabled, declaration files generated
- **Formatting**: Uses `@oclif/prettier-config` (run via ESLint post-test)
- **Naming**:
  - Commands: kebab-case in directories (e.g., `hello/world.ts` → `homelab hello world`)
  - Classes: PascalCase extending oclif's `Command` base class
  - Files: kebab-case for commands, camelCase for utilities

### Architecture Patterns

#### Layered Architecture
The application follows a clean, layered architecture with clear separation of concerns:

1. **Command Layer** (`src/commands/`)
   - Thin CLI layer handling user interaction
   - Extends oclif's `Command` base class
   - Responsibilities:
     - Parse and validate CLI arguments/flags
     - Invoke service layer via Factory Pattern
     - Handle Result types and convert to oclif errors
     - Format and output results using `this.log()`
   - Static properties define args, flags, description, examples
   - `async run()` method orchestrates service calls

2. **Service Layer** (`src/services/`)
   - Contains all business logic
   - Pure TypeScript classes with constructor-based dependency injection
   - Returns `Result<T, E>` types for explicit error handling
   - Validates data using Zod schemas
   - Orchestrates repository calls
   - Stateless and highly testable

3. **Repository Layer** (`src/repositories/`)
   - Abstracts all data access (API calls, filesystem, databases)
   - Implements Repository Pattern with interfaces
   - Returns `Result<T, E>` types
   - Handles data persistence and retrieval
   - Easily mockable for testing
   - Swappable implementations (e.g., mock vs. real API)

4. **Model Layer** (`src/models/`)
   - Domain models and DTOs (Data Transfer Objects)
   - Zod schemas as source of truth
   - Type inference: `type ModelDTO = z.infer<typeof ModelSchema>`
   - Shared data structures across layers

5. **Error Layer** (`src/errors/`)
   - Custom error hierarchy extending base `Error`
   - Error types:
     - `BaseError` - Base class with context
     - `ValidationError` - Zod validation failures
     - `RepositoryError` - Data access errors
     - `ServiceError` - Business logic errors
     - `ExternalAPIError` - External service failures
   - Serializable for structured logging
   - Rich context for debugging

6. **Factory Layer** (`src/factories/`)
   - Service Factory for dependency composition
   - Centralized initialization of services with their dependencies
   - Async factory methods for resources requiring async setup
   - Singleton pattern for expensive resources
   - Commands obtain fully-wired service instances

#### Core Architectural Decisions

**Result Pattern** (Explicit Error Handling)
- Services and Repositories return `Result<T, E>` instead of throwing exceptions
- Type-safe error handling: `{ success: true, data: T } | { success: false, error: E }`
- Forces explicit error handling at each layer
- Functional programming style
- Commands convert Results to oclif-compatible errors

**Zod Validation** (Runtime Type Safety)
- Runtime validation with type inference
- Validates: DTOs, configuration, API responses, user input
- Single source of truth for data structures
- Compose-able schemas for complex types
- Integration with Result pattern for validation errors

**Constructor-based Dependency Injection**
- No DI framework/container needed
- Explicit dependencies via constructor parameters
- Highly testable (inject mocks via constructor)
- Clear dependency graph
- Factory pattern handles wiring

**Repository Pattern with Interfaces**
- Interface-based contracts for repositories
- Enables multiple implementations (in-memory, API, filesystem)
- Mock implementations for testing
- Dependency inversion principle

#### Data Flow
```
User Input
    ↓
Command (validates args/flags, formats output)
    ↓
Service Factory (provides fully-wired service)
    ↓
Service (business logic, validates with Zod, returns Result<T, E>)
    ↓
Repository (data access, returns Result<T, E>)
    ↓
Result flows back through layers
    ↓
Command handles Result:
  - Success: Format and output data
  - Failure: Convert to oclif error
```

#### Directory Structure
```
src/
├── commands/           # CLI layer (thin)
├── services/           # Business logic
├── repositories/       # Data access
│   └── interfaces/     # Repository contracts
├── models/             # Domain models & DTOs
│   └── schemas/        # Zod schemas
├── errors/             # Custom error classes
├── factories/          # Dependency composition
├── config/             # Configuration (Zod validated)
└── utils/              # Helpers (Result type, logger)
```

**oclif Framework Integration**:
- **Plugin Architecture**: Extensible via oclif plugins (@oclif/plugin-help, @oclif/plugin-plugins)
- **Build Artifacts**: Source in `src/`, compiled to `dist/`, manifest generated via `oclif manifest`
- **Entry Points**:
  - Development: `bin/dev.js` (uses ts-node with ESM support)
  - Production: `bin/run.js` (uses compiled dist/)

### Testing Strategy
- **Framework**: Mocha with `--forbid-only` to prevent focused tests in commits
- **Assertions**: Chai expect-style
- **Test Utilities**: `@oclif/test` provides `runCommand()` helper
- **Test Location**: Mirror structure in `test/` matching `src/`
- **Coverage**: Every command, service, and repository MUST have corresponding tests
- **Test Execution**: `pnpm test` runs all tests, followed by automatic linting
- **Single Test**: `pnpm exec mocha --forbid-only "test/path/to/file.test.ts"`
- **Philosophy**: Test behavior, not implementation; clear test names describing scenario

#### Testing Layers

**Unit Tests - Services** (`test/services/`)
- Test business logic in isolation
- Mock repositories via constructor injection
- Test both success and failure Result paths
- Validate Zod schema integration
- Example:
  ```typescript
  const mockRepo = createMockRepository();
  const service = new MyService(mockRepo);
  const result = await service.doSomething(input);
  expect(result.success).to.be.true;
  ```

**Unit Tests - Repositories** (`test/repositories/`)
- Test data access logic
- Mock external APIs/filesystem
- Verify Result types returned correctly
- Test error scenarios (network failures, invalid data)

**Integration Tests - Commands** (`test/commands/`)
- Use `runCommand()` from `@oclif/test`
- Test full command execution with real or mock services
- Verify output formatting
- Test flag/argument parsing
- Test error messages presented to users

**Test Doubles**
- **Mock Repositories**: In-memory implementations for tests
- **Mock Factories**: Return services with mock dependencies
- **Test Fixtures**: Zod-validated test data

### Git Workflow
- **Main Branch**: `main` (used for PRs)
- **Commit Style**: Clear messages explaining "why" over "what" using a conventional commits style
- **Pre-commit**: Hooks may run formatters/linters
- **README Updates**: Auto-generated via `oclif readme` during `prepack` (don't edit manually)
- **Versioning**: `pnpm version` automatically updates README and stages changes

## Domain Context
Homelab infrastructure management involves:
- Server/service orchestration
- Configuration management
- Network management
- Container/VM lifecycle management on Proxmox, Docker, Kubernetes

The CLI should provide:
- Idempotent operations where possible
- Clear error messages with actionable guidance
- Structured output suitable for scripting (consider --json flags)
- Safe defaults with explicit flags for destructive operations

## Important Constraints
- **Node Version**: Must support Node >= 18.0.0
- **ES Modules**: All code uses ESM (no CommonJS)
- **Compilation Required**: Code must be built before distribution (TypeScript → JavaScript)
- **Manifest Generation**: `oclif manifest` must run during packaging for optimal command loading
- **Testing Gate**: All tests must pass before commits; never use `--no-verify`
- **No Focused Tests**: `--forbid-only` prevents `.only()` in tests from being committed

## External Dependencies

### Core Dependencies
- `@oclif/core`: CLI framework providing command structure, parsing, help system
- `@oclif/plugin-help`: Automatic help documentation generation
- `@oclif/plugin-plugins`: Plugin management capabilities
- `zod`: Runtime validation library with TypeScript type inference (~8kb)
  - Used for: DTOs, configuration validation, input validation
  - Replaces need for separate validation libraries
  - Provides both runtime safety and compile-time types

### Development Dependencies
- `oclif`: CLI for generating manifests and README
- `shx`: Cross-platform shell commands (used in build scripts)
- `ts-node`: TypeScript execution for development mode

### Infrastructure
- **Repository**: https://github.com/sflab-io/homelab-cli
- **Issues**: https://github.com/sflab-io/homelab-cli/issues
- **License**: MIT
- **Distribution**: Published as npm package with bin command `homelab`

## Architecture Benefits

### Maintainability
- Clear separation of concerns across layers
- Easy to add new commands (thin layer, delegates to services)
- Swappable repositories without affecting business logic
- Single source of truth for data structures (Zod schemas)

### Testability
- Services testable in isolation with mock repositories
- Result pattern makes error scenarios explicit and testable
- Constructor injection enables easy mocking
- No framework magic - straightforward testing

### Type Safety
- Zod provides runtime validation + compile-time types
- Result pattern forces error handling at compile time
- TypeScript strict mode catches issues early
- Type inference reduces manual type definitions

### Error Handling
- Explicit error handling with Result pattern
- Rich error context via custom error classes
- No silent failures - all paths handled
- User-friendly error messages in CLI layer

### Scalability
- Layered architecture supports growing complexity
- Factory pattern centralizes dependency management
- Repository pattern allows data source changes
- Services remain independent and composable

## Development Workflow

### Adding a New Feature
1. Define Zod schemas in `src/models/schemas/`
2. Create repository interface in `src/repositories/interfaces/`
3. Implement repository with Result returns
4. Create service using repository, returning Results
5. Update factory to wire new service
6. Create command that uses factory and handles Results
7. Write tests for each layer
8. Build and validate: `pnpm run build && pnpm test`

### Key Principles
- **Fail Fast**: Validate early with Zod at system boundaries
- **Explicit Over Implicit**: Result types make errors visible
- **Thin Commands**: Business logic belongs in services
- **Mock at Boundaries**: Repository layer is the mocking boundary
- **Type Safety**: Leverage TypeScript and Zod for safety
