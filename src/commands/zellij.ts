import {Args, Flags} from '@oclif/core'
import {readdir} from 'node:fs/promises'
import {join} from 'node:path'

import {getCliConfig} from '../config/cli.config.js'
import {BaseCommand} from '../lib/base-command.js'
import {CommandExecutorService} from '../services/command-executor.service.js'
import {detectCurrentProject} from '../utils/detect-current-project.js'
import {promptForSelection} from '../utils/prompts.js'

export default class Zellij extends BaseCommand<typeof Zellij> {
  static args = {
    'module-name': Args.string({
      description: 'Name of the Zellij module from .config/zellij/ (optional, prompts for selection if not provided)',
      required: false,
    }),
  }
  static description = 'Open a Zellij session with a project-specific configuration'
  static examples = [
    '# Open Zellij session with interactive module selection and default layout\n<%= config.bin %> <%= command.id %>',
    '# Open Zellij session with module and default layout\n<%= config.bin %> <%= command.id %> my-module',
    '# Open Zellij session with specific module and layout\n<%= config.bin %> <%= command.id %> my-module --layout-name my-layout',
    '# Open Zellij session with specific module and layout (short flag)\n<%= config.bin %> <%= command.id %> my-module -l my-layout',
  ]
  static flags = {
    'layout-name': Flags.string({
      char: 'l',
      default: 'default',
      description: 'Name of the layout subdirectory (defaults to "default")',
      required: false,
    }),
  }

  async run(): Promise<void> {
    await this.parse(Zellij)

    // Load configuration
    const cliConfig = getCliConfig()
    const projectsDir = cliConfig.get('projectsDir')

    // Detect current project from working directory
    const projectName = detectCurrentProject(process.cwd(), projectsDir)

    if (!projectName) {
      this.error(
        'Could not detect current project. Please run the command from within a project directory.',
        {exit: 1},
      )
    }

    // Determine module name - prompt if not provided
    let moduleName = this.args['module-name']

    if (!moduleName) {
      // Get available Zellij modules from .config/zellij directory
      const zellijBaseDir = join(projectsDir, projectName, '.config/zellij')
      const availableModules = await this.getAvailableConfigurations(zellijBaseDir)

      if (availableModules.length === 0) {
        this.error(
          `No Zellij modules found in ${zellijBaseDir}. Create a directory structure like .config/zellij/<module-name>/<config-name>/`,
          {exit: 1},
        )
      }

      // Prompt user to select a module
      const moduleResult = await promptForSelection({
        choices: availableModules,
        message: 'Select a Zellij module:',
      })

      if (!moduleResult.success) {
        this.error(moduleResult.error.message, {exit: 1})
      }

      moduleName = moduleResult.data
    }

    // Get layout name from flag (defaults to 'default')
    const layoutName = this.flags['layout-name']

    // Construct Zellij config path
    // Layout name is now a directory containing the layout.kdl file
    const configPath = join(projectsDir, projectName, '.config/zellij', moduleName, layoutName + '.kdl')

    console.log(configPath)

    // Construct session name
    const sessionName = `${moduleName}-${layoutName}`

    // Check if session already exists
    const sessionAlreadyExists = await this.sessionExists(sessionName)

    if (sessionAlreadyExists) {
      this.log(`Attaching to existing Zellij session '${sessionName}'...`)
    } else {
      this.log(`Opening new Zellij session '${sessionName}' for project '${projectName}', module '${moduleName}', layout '${layoutName}'...`)
    }

    // Execute Zellij - either attach to existing session or create new one
    // We need to wait for the process to complete (unlike VSCode which detaches)
    // Choose the appropriate command based on whether session exists
    const zellijArgs = sessionAlreadyExists ? ['attach', sessionName] : ['-n', configPath, '-s', sessionName]

    const commandExecutor = new CommandExecutorService()
    const result = await commandExecutor.executeCommand('zellij', zellijArgs, {
      stdio: 'inherit', // Pass stdin/stdout/stderr to Zellij for interactive session
    })

    if (!result.success) {
      this.error(result.error.message, {exit: 1})
    }

    this.log('Zellij session closed.')
  }

  /**
   * Get available Zellij configurations from a directory
   * Reads all subdirectories in the given path
   */
  private async getAvailableConfigurations(configDir: string): Promise<string[]> {
    try {
      const entries = await readdir(configDir, {withFileTypes: true})

      // Filter for directories only
      const directories = entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort()

      return directories
    } catch {
      // If directory doesn't exist or can't be read, return empty array
      return []
    }
  }

  /**
   * Check if a Zellij session with the given name exists
   */
  private async sessionExists(sessionName: string): Promise<boolean> {
    const commandExecutor = new CommandExecutorService()
    const result = await commandExecutor.executeCommand('zellij', ['list-sessions'])

    if (!result.success || !result.data.stdout) {
      // If list-sessions fails, assume no sessions exist
      return false
    }

    // Check if the session name appears in the output
    // The output format is like: "session-name [Created...] (STATUS...)"
    return result.data.stdout.includes(sessionName)
  }
}
