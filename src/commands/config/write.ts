import {Args} from '@oclif/core'

import type {CliConfig} from '../../models/schemas/cli-config.schema.js'

import {getCliConfig} from '../../config/cli.config.js'
import {BaseCommand} from '../../lib/base-command.js'

export default class ConfigWrite extends BaseCommand<typeof ConfigWrite> {
  static args = {
    key: Args.string({
      description: 'Configuration key to set',
      required: true,
    }),
    value: Args.string({
      description: 'Configuration value',
      required: true,
    }),
  }
  static description = 'Write configuration values'
  static examples = [
    '<%= config.bin %> <%= command.id %> logLevel debug',
    '<%= config.bin %> <%= command.id %> colorOutput false',
  ]
  static isExperimental = true

  async run(): Promise<void> {
    await this.parse(ConfigWrite)
    const config = getCliConfig()

    // Type-aware parsing
    let parsedValue: boolean | string = this.args.value

    // Parse boolean values
    if (this.args.value === 'true' || this.args.value === 'false') {
      parsedValue = this.args.value === 'true'
    }

    // Set the value (with type assertion as we're doing runtime validation)
    const key = this.args.key as keyof CliConfig
    config.set(key, parsedValue as CliConfig[typeof key])

    this.log(`Set ${this.args.key} = ${parsedValue}`)
    this.log(`Config file: ${config.getPath()}`)
  }
}
