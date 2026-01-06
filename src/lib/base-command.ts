import {Command, Flags, Interfaces} from '@oclif/core'

export type Flags<T extends typeof Command> = Interfaces.InferredFlags<T['flags'] & typeof BaseCommand['baseFlags']>
export type Args<T extends typeof Command> = Interfaces.InferredArgs<T['args']>

export abstract class BaseCommand<T extends typeof Command> extends Command {
  // define flags that can be inherited by any command that extends BaseCommand
  static baseFlags = {
    'experimental': Flags.boolean({
      default: false,
      description: 'Enable experimental commands and features',
      helpGroup: 'GLOBAL',
    }),
    'log-level': Flags.option({
      default: 'info',
      helpGroup: 'GLOBAL',
      options: ['debug', 'warn', 'error', 'info', 'trace'] as const,
      summary: 'Specify level for logging.',
    })(),
  }
  // add the --json flag
  static enableJsonFlag = true
  /**
   * Optional static property to mark a command as experimental.
   * Experimental commands are hidden from help output by default and only shown when
   * the --experimental flag or HOMELAB_CLI_EXPERIMENTAL environment variable is set.
   *
   * @example
   * export default class MyCommand extends BaseCommand<typeof MyCommand> {
   *   static isExperimental = true
   *   // ... rest of command
   * }
   */
  static isExperimental?: boolean
  protected args!: Args<T>
  protected flags!: Flags<T>

  protected async catch(err: Error & {exitCode?: number}): Promise<unknown> {
    // add any custom logic to handle errors from the command
    // or simply return the parent class error handling
    return super.catch(err)
  }

  protected async finally(err: Error | undefined): Promise<unknown> {
    // called after run and catch regardless of whether or not the command errored
    return super.finally(err)
  }

  public async init(): Promise<void> {
    await super.init()
    const {args, flags} = await this.parse({
      args: this.ctor.args,
      baseFlags: (super.ctor as typeof BaseCommand).baseFlags,
      enableJsonFlag: this.ctor.enableJsonFlag,
      flags: this.ctor.flags,
      strict: this.ctor.strict,
    })

    // Check environment variable for experimental mode override
    const envExperimental = process.env.HOMELAB_CLI_EXPERIMENTAL?.toLowerCase() === 'true'

    // Environment variable or flag can enable experimental mode
    const experimentalMode = (flags as Record<string, unknown>).experimental || envExperimental

    // Update flags with merged experimental value
    this.flags = {...flags, experimental: experimentalMode} as Flags<T>
    this.args = args as Args<T>

    // Display warning if experimental mode is active and command is marked as experimental
    if (experimentalMode && (this.ctor as typeof BaseCommand).isExperimental) {
      this.warn(
        'You are using experimental features. These features are not yet stable and may change in future releases.',
      )
    }
  }
}
