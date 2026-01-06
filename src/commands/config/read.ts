import {Args, Flags} from '@oclif/core'

import type {CliConfig} from '../../models/schemas/cli-config.schema.js'

import {getCliConfig} from '../../config/cli.config.js'
import {BaseCommand} from '../../lib/base-command.js'

export default class ConfigRead extends BaseCommand<typeof ConfigRead> {
  static args = {
    key: Args.string({
      description: 'Configuration key to read',
      required: false,
    }),
  }
  static description = 'Read configuration values'
  static examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> logLevel',
    '<%= config.bin %> <%= command.id %> --path',
  ]
  static flags = {
    path: Flags.boolean({
      char: 'p',
      default: false,
      description: 'Show path to config file',
    }),
  }
  static isExperimental = true

  async run(): Promise<void> {
    await this.parse(ConfigRead)
    const config = getCliConfig()

    if (this.flags.path) {
      this.log(`Config file: ${config.getPath()}`)

      return
    }

    if (this.args.key) {
      // Read specific key
      const key = this.args.key as keyof CliConfig
      const value = config.get(key)

      this.log(`${this.args.key}: ${value}`)
    } else {
      // Read all config
      const allConfig = config.getAll()

      this.log(JSON.stringify(allConfig, null, 2))
    }
  }
}
