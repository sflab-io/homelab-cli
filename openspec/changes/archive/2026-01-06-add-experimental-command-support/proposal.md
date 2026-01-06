# Proposal: Add Experimental Command Support

## Overview

Add support for marking commands as experimental with conditional visibility in help output and runtime warnings. Experimental commands should only appear in help listings when the `--experimental` flag is set or the `HOMELAB_CLI_EXPERIMENTAL` environment variable is enabled.

## Motivation

As the CLI evolves, we need a mechanism to ship commands that are still under development or testing without exposing them to all users by default. This allows:

- Early testing of new features with opt-in users
- Iteration on command interfaces before stabilization
- Clear communication that certain features may change
- Gradual feature rollout

## Goals

1. Add `--experimental` global flag to BaseCommand
2. Support `HOMELAB_CLI_EXPERIMENTAL` environment variable override
3. Display warning message when experimental features are used
4. Filter help output to show only experimental commands when flag is set
5. Hide experimental commands from help when flag is not set
6. Mark specific commands as experimental via static property

## Non-Goals

- Preventing execution of experimental commands when flag is not set (they can still be invoked directly)
- Versioning or deprecation workflow for experimental features
- Feature flag system for partial feature rollouts

## Affected Components

- `src/lib/base-command.ts` - Add `--experimental` flag and `isExperimental` static property
- Command classes - Add `static isExperimental = true` to experimental commands
- Help system - Custom help command or hook to filter commands based on experimental flag

## Commands to Mark as Experimental

Initial set of experimental commands:
- `src/commands/config/read.ts`
- `src/commands/config/write.ts`
- `src/commands/exec/demo.ts`
- `src/commands/prompt/demo.ts`

## User Experience

### With `--experimental` flag or `HOMELAB_CLI_EXPERIMENTAL=true`

```bash
$ homelab --experimental help
Warning: You are using experimental features. These features are not yet stable and may change in future releases.

USAGE
  $ homelab [COMMAND]

COMMANDS
  config read       Read configuration values
  config write      Write configuration values
  exec demo         Demonstrate command execution capabilities
  prompt demo       Demonstrate interactive prompts
```

### Without flag (default behavior)

```bash
$ homelab help

USAGE
  $ homelab [COMMAND]

COMMANDS
  module list       List modules for a project
  project list      List all projects
  proxmox vm list   List VMs
  # ... experimental commands not shown
```

### Executing experimental command without flag

```bash
$ homelab config read
# Command still executes, no warning shown
```

### Executing experimental command with flag

```bash
$ homelab --experimental config read
Warning: You are using experimental features. These features are not yet stable and may change in future releases.
# ... command output
```

## Technical Approach

See `design.md` for detailed technical implementation strategy.

## Risks and Mitigations

**Risk**: oclif loads commands before init hooks, making dynamic filtering complex
**Mitigation**: Use custom help command that filters at runtime, or use oclif's help hooks

**Risk**: Users might accidentally discover hidden experimental commands
**Mitigation**: This is acceptable - commands are hidden from help but still executable

**Risk**: Breaking changes in experimental commands affect users who discovered them
**Mitigation**: Warning message clearly states features may change

## Success Criteria

- [ ] `--experimental` flag works as global flag
- [ ] `HOMELAB_CLI_EXPERIMENTAL` environment variable override works
- [ ] Warning message displays when experimental commands are executed with flag
- [ ] Help output shows only experimental commands when flag is set
- [ ] Help output hides experimental commands when flag is not set
- [ ] Four specified commands are marked as experimental
- [ ] Tests verify experimental command filtering behavior
- [ ] Documentation updated

## Related Specifications

- New capability: `experimental-command-filtering`
