# Design: Experimental Command Support

## Technical Context

### oclif Architecture Constraints

1. **Command Loading**: oclif loads all commands before running any init hooks, making dynamic command filtering challenging
2. **Help System**: The default help plugin generates help output by iterating through loaded commands
3. **Static Properties**: Command metadata (description, args, flags) are defined as static properties on command classes

### Existing Patterns

- BaseCommand in `src/lib/base-command.ts` provides global flags via `baseFlags`
- Environment variable overrides follow pattern in `src/config/cli.config.ts` with `HOMELAB_` prefix
- Commands extend BaseCommand and inherit base functionality

## Proposed Implementation

### 1. Add Experimental Flag to BaseCommand

**File**: `src/lib/base-command.ts`

Add experimental flag to `baseFlags`:

```typescript
static baseFlags = {
  'experimental': Flags.boolean({
    default: false,
    description: 'Enable experimental commands and features',
    helpGroup: 'GLOBAL',
  }),
  'log-level': Flags.option({
    // ... existing
  })(),
}
```

### 2. Add Static isExperimental Property

**Pattern**: Commands declare themselves as experimental

```typescript
export default class ConfigRead extends BaseCommand<typeof ConfigRead> {
  static isExperimental = true  // Mark as experimental
  // ... rest of command
}
```

**Type Definition**: Update BaseCommand to include optional static property:

```typescript
export abstract class BaseCommand<T extends typeof Command> extends Command {
  static isExperimental?: boolean  // Optional property for all commands
  // ... rest of class
}
```

### 3. Environment Variable Support

**Implementation**: Add environment variable check in BaseCommand.init()

```typescript
public async init(): Promise<void> {
  await super.init()

  // Parse flags
  const {args, flags} = await this.parse({...})

  // Check environment variable for experimental mode override
  const envExperimental = process.env.HOMELAB_CLI_EXPERIMENTAL?.toLowerCase() === 'true'

  // Flag takes precedence over env var
  if (flags.experimental || envExperimental) {
    this.flags = {...flags, experimental: true} as Flags<T>
  } else {
    this.flags = flags as Flags<T>
  }

  this.args = args as Args<T>
}
```

### 4. Warning Message Display

**Implementation**: Add warning in BaseCommand after init, before run

```typescript
protected async catch(err: Error & {exitCode?: number}): Promise<unknown> {
  return super.catch(err)
}

protected async finally(err: Error | undefined): Promise<unknown> {
  return super.finally(err)
}

public async init(): Promise<void> {
  // ... existing init code ...

  // Display warning if experimental mode is active and command is experimental
  if (this.flags.experimental && (this.ctor as typeof BaseCommand).isExperimental) {
    this.warn('You are using experimental features. These features are not yet stable and may change in future releases.')
  }
}
```

### 5. Help Command Filtering

**Approach A: Custom Help Class (Recommended)**

Create custom help class that extends oclif's HelpBase:

**File**: `src/lib/custom-help.ts`

```typescript
import {HelpBase, CommandHelp} from '@oclif/core'
import type {Command, Config} from '@oclif/core'

export class CustomHelp extends HelpBase {
  protected filterCommands(commands: Command.Loadable[]): Command.Loadable[] {
    // Check if experimental mode is active
    const experimentalFlag = this.config.pjson.oclif?.globalFlags?.experimental
    const envExperimental = process.env.HOMELAB_CLI_EXPERIMENTAL?.toLowerCase() === 'true'
    const isExperimentalMode = experimentalFlag || envExperimental

    return commands.filter(cmd => {
      const cmdClass = cmd.load()
      const isExperimental = (cmdClass as any).isExperimental === true

      // If experimental mode: show only experimental commands
      // If normal mode: show only non-experimental commands
      return isExperimentalMode ? isExperimental : !isExperimental
    })
  }

  async showHelp(argv: string[]): Promise<void> {
    const commands = this.filterCommands(this.config.commands)
    // ... use filtered commands for help output
  }
}
```

**Problem with Approach A**: Global flags are not yet parsed when help system initializes

**Approach B: Help Hook (Alternative)**

Use oclif's `command_incomplete` or custom help command:

**File**: `src/commands/help.ts`

```typescript
import {Help} from '@oclif/plugin-help'
import {BaseCommand} from '../lib/base-command.js'

export default class HelpCommand extends BaseCommand<typeof HelpCommand> {
  static description = 'Display help for homelab'

  async run(): Promise<void> {
    await this.parse(HelpCommand)

    const help = new Help(this.config)
    const isExperimentalMode = this.flags.experimental

    // Get all commands and filter based on experimental mode
    const commands = this.config.commands.filter(cmd => {
      const isExperimental = (cmd as any).isExperimental === true
      return isExperimentalMode ? isExperimental : !isExperimental
    })

    // Display filtered help
    await help.showHelp(['help'])
  }
}
```

**Problem with Approach B**: Need to override default help behavior

**Approach C: Command Discovery Hook (Most Robust)**

Override command loading in bin/run.js or bin/dev.js:

This approach modifies how commands are loaded based on experimental flag detection from env var or args.

**Recommended Solution: Combination Approach**

1. Use environment variable `HOMELAB_CLI_EXPERIMENTAL` for command filtering at load time
2. Use `--experimental` flag for runtime warning messages
3. Implement custom help command that respects both

### 6. Implementation Strategy

**Phase 1: Basic Infrastructure**
1. Add `isExperimental` static property support to BaseCommand
2. Add `--experimental` flag to baseFlags
3. Add environment variable check in init()
4. Display warning message when experimental command is executed with flag

**Phase 2: Help Filtering**
1. Create custom help command that filters based on experimental mode
2. Test help filtering with experimental and non-experimental commands

**Phase 3: Mark Commands**
1. Add `static isExperimental = true` to four specified commands
2. Update tests to verify experimental behavior

## Alternative Approaches Considered

### Alternative 1: Use oclif's `hidden` Property
- **Pro**: Native oclif support
- **Con**: Cannot toggle visibility dynamically based on flag
- **Verdict**: Not suitable for this requirement

### Alternative 2: Separate Plugin for Experimental Commands
- **Pro**: Complete isolation of experimental features
- **Con**: Adds complexity, requires plugin management
- **Verdict**: Overkill for this use case

### Alternative 3: Conditional Command Export
- **Pro**: Commands truly not loaded when not needed
- **Con**: Requires build-time configuration, not runtime
- **Verdict**: Not flexible enough

## Testing Strategy

### Unit Tests

**Test BaseCommand experimental flag**:
- Flag defaults to false
- Environment variable sets flag to true
- Warning message displays when experimental command executed with flag

**Test experimental command marker**:
- Commands with `isExperimental = true` are recognized
- Commands without property are treated as stable

### Integration Tests

**Test help filtering**:
- Help shows only experimental commands with flag
- Help shows only stable commands without flag
- Help for specific command still works

**Test warning display**:
- Warning shown for experimental command with flag
- No warning for stable command with flag
- No warning for experimental command without flag

## Security Considerations

None - this is a UX feature with no security implications.

## Performance Considerations

Minimal - one additional boolean check per command execution and help generation.

## Documentation Requirements

1. Update README.md with `--experimental` flag documentation
2. Add section explaining experimental commands concept
3. Update CLAUDE.md with experimental command guidelines
4. Add comments in BaseCommand explaining the pattern

## Migration Path

1. Implement infrastructure (Phase 1)
2. Mark four commands as experimental (Phase 3)
3. Test with users
4. Graduate experimental commands to stable by removing `isExperimental` property
5. Add new experimental commands as needed

## Open Questions

1. **Should we prevent execution of experimental commands without flag?**
   - Current design: No, commands are executable but hidden from help
   - Alternative: Error when executing experimental command without flag
   - **Decision**: Allow execution, only filter help (better UX)

2. **How to handle command help (`homelab config read --help`) for experimental commands?**
   - Option A: Show help even without experimental flag
   - Option B: Require experimental flag to see help
   - **Decision**: Show help always (command is still executable)

3. **Should help command show both experimental and stable with experimental flag?**
   - Current design: Show ONLY experimental commands
   - Alternative: Show both, mark experimental with badge
   - **Decision**: Show only experimental (cleaner, matches requirement)
