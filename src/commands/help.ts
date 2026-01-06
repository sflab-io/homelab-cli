import {Args, Command, Config, Help} from '@oclif/core'

import {BaseCommand} from '../lib/base-command.js'

/**
 * Extended Help class that filters commands and topics based on experimental mode.
 */
class FilteredHelp extends Help {
  private filteredCommandIds: null | Set<string> = null
  private isExperimentalMode: boolean

  constructor(config: Config, opts: {isExperimentalMode: boolean}) {
    super(config, {})
    this.isExperimentalMode = opts.isExperimentalMode
  }

  /**
   * Get all commands, filtered by experimental status.
   */
  protected override get sortedCommands(): Command.Loadable[] {
    if (this.filteredCommandIds === null) {
      // Filtering not initialized yet, return all commands
      return super.sortedCommands
    }

    return super.sortedCommands.filter((cmd) => this.filteredCommandIds!.has(cmd.id))
  }

  /**
   * Get all topics, filtered to only show topics that have matching commands.
   */
  protected override get sortedTopics() {
    if (this.filteredCommandIds === null) {
      // Filtering not initialized yet, return all topics
      return super.sortedTopics
    }

    const allTopics = super.sortedTopics

    // Filter topics to only include those that have at least one filtered command
    return allTopics.filter((topic) =>
      [...this.filteredCommandIds!].some(
        (cmdId) => cmdId.startsWith(topic.name + ':') || cmdId === topic.name,
      ),
    )
  }

  /**
   * Override showHelp to initialize filtering before rendering.
   */
  override async showHelp(argv: string[]): Promise<void> {
    await this.initializeFiltering()
    await super.showHelp(argv)
  }

  /**
   * Initialize filtering by loading all commands and determining which are experimental.
   * This must be called before rendering help.
   */
  private async initializeFiltering(): Promise<void> {
    if (this.filteredCommandIds !== null) return // Already initialized

    const allCommands = this.config.commands
    const filteredIds = new Set<string>()

    // Load all commands in parallel and check if they're experimental
    const results = await Promise.allSettled(
      allCommands.map(async (cmd) => {
        const cmdClass = await cmd.load()
        const isExperimental = (cmdClass as unknown as typeof BaseCommand).isExperimental === true

        // In experimental mode: include only experimental commands
        // In normal mode: include only non-experimental commands
        const shouldInclude = this.isExperimentalMode ? isExperimental : !isExperimental

        return {id: cmd.id, shouldInclude}
      }),
    )

    // Add filtered command IDs
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.shouldInclude) {
        filteredIds.add(result.value.id)
      }
    }

    this.filteredCommandIds = filteredIds
  }
}

/**
 * Custom help command that filters experimental commands based on the --experimental flag
 * or HOMELAB_CLI_EXPERIMENTAL environment variable.
 *
 * When experimental mode is active:
 * - Shows ONLY experimental commands
 * - Hides stable commands
 *
 * When experimental mode is inactive (default):
 * - Shows ONLY stable commands
 * - Hides experimental commands
 */
export default class HelpCommand extends BaseCommand<typeof HelpCommand> {
  static args = {
    commands: Args.string({description: 'Command to show help for.', required: false}),
  }
static description = 'Display help for homelab.'
static flags = {}
static strict = false

  async run(): Promise<void> {
    const {argv} = await this.parse(HelpCommand)

    // Check if experimental mode is active (from flag or environment variable)
    const envExperimental = process.env.HOMELAB_CLI_EXPERIMENTAL?.toLowerCase() === 'true'
    const isExperimentalMode = this.flags.experimental || envExperimental

    // If showing help for a specific command, use default help (no filtering)
    if (argv.length > 0) {
      const help = new Help(this.config)
      await help.showHelp(argv as string[])
      return
    }

    // Use filtered help for root help
    const help = new FilteredHelp(this.config, {isExperimentalMode})
    await help.showHelp(argv as string[])
  }
}
