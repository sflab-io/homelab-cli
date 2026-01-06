import {BaseCommand} from '../../lib/base-command.js'
import {CommandExecutionOptionsDto} from '../../models/command-execution-options.dto.js'
import {CommandExecutorService} from '../../services/command-executor.service.js'
import {
  formatExecutionComplete,
  formatExecutionError,
  formatExecutionStart,
} from '../../utils/command-output-formatter.js'

/**
 * Demo command showcasing various command execution scenarios
 */
export default class ExecDemo extends BaseCommand<typeof ExecDemo> {
  static description =
    'Demonstrate command execution capabilities (simple commands, working directory, environment variables, streaming, error handling)'
  static examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> # Run all demonstration scenarios',
  ]
  static isExperimental = true
  private scenarioResults: Array<{name: string; success: boolean}> = []
  private service = new CommandExecutorService()

  async run(): Promise<void> {
    await this.parse(ExecDemo)

    this.log('\n='.repeat(60))
    this.log('Command Execution Demo')
    this.log('='.repeat(60))
    this.log('')

    // Run all demo scenarios
    await this.demoSimpleCommand()
    await this.demoWorkingDirectory()
    await this.demoEnvironmentVariables()
    await this.demoStreamingOutput()
    await this.demoErrorHandlingNonZeroExit()
    await this.demoErrorHandlingCommandNotFound()

    // Display summary
    this.displaySummary()
  }

  /**
   * Demonstrate command execution with environment variables
   */
  private async demoEnvironmentVariables(): Promise<void> {
    const scenarioName = 'Environment Variables'
    this.log(`\n📋 Scenario: ${scenarioName}`)
    this.log('─'.repeat(60))

    const command = 'sh'
    const args = ['-c', 'echo "Custom variable: $DEMO_VAR"']
    const options = new CommandExecutionOptionsDto(undefined, {
      DEMO_VAR: 'Hello from custom env!',
    })

    this.log(formatExecutionStart(command, args, options))

    const result = await this.service.executeCommand(command, args, options)

    if (result.success) {
      this.log('\nOutput:')
      this.log(result.data.stdout?.trim() ?? '(no output captured)')
      this.log('')
      this.log(formatExecutionComplete(result.data))
      this.scenarioResults.push({name: scenarioName, success: true})
    } else {
      this.log(formatExecutionError(command, args, result.error))
      this.scenarioResults.push({name: scenarioName, success: false})
    }
  }

  /**
   * Demonstrate error handling for command not found
   */
  private async demoErrorHandlingCommandNotFound(): Promise<void> {
    const scenarioName = 'Error Handling (Command Not Found)'
    this.log(`\n📋 Scenario: ${scenarioName}`)
    this.log('─'.repeat(60))

    const command = 'nonexistent-command-12345'
    const args = ['arg1', 'arg2']

    this.log(formatExecutionStart(command, args))

    const result = await this.service.executeCommand(command, args)

    if (result.success) {
      this.log(formatExecutionComplete(result.data))
      this.scenarioResults.push({name: scenarioName, success: true})
    } else {
      this.log('')
      this.log(formatExecutionError(command, args, result.error))
      this.log(
        '\n✓ Error was handled correctly - command not found detected',
      )
      this.scenarioResults.push({name: scenarioName, success: true})
    }
  }

  /**
   * Demonstrate error handling for non-zero exit code
   */
  private async demoErrorHandlingNonZeroExit(): Promise<void> {
    const scenarioName = 'Error Handling (Non-Zero Exit)'
    this.log(`\n📋 Scenario: ${scenarioName}`)
    this.log('─'.repeat(60))

    const command = 'sh'
    const args = ['-c', 'echo "This will fail" && exit 1']

    this.log(formatExecutionStart(command, args))

    const result = await this.service.executeCommand(command, args)

    if (result.success) {
      // Even with non-zero exit, execa returns success (we use reject: false)
      // Check the exit code
      if (result.data.exitCode === 0) {
        this.log(formatExecutionComplete(result.data))
        this.scenarioResults.push({name: scenarioName, success: true})
      } else {
        this.log('\nCommand executed but returned non-zero exit code:')
        this.log(`Exit Code: ${result.data.exitCode}`)
        this.log('')
        this.log(formatExecutionComplete(result.data))
        this.scenarioResults.push({name: scenarioName, success: true})
      }
    } else {
      this.log(formatExecutionError(command, args, result.error))
      this.scenarioResults.push({name: scenarioName, success: false})
    }
  }

  /**
   * Demonstrate simple command execution
   */
  private async demoSimpleCommand(): Promise<void> {
    const scenarioName = 'Simple Command Execution'
    this.log(`\n📋 Scenario: ${scenarioName}`)
    this.log('─'.repeat(60))

    const command = 'echo'
    const args = ['Hello from homelab-cli!']

    this.log(formatExecutionStart(command, args))

    const result = await this.service.executeCommand(command, args)

    if (result.success) {
      this.log('\nOutput:')
      this.log(result.data.stdout?.trim() ?? '(no output captured)')
      this.log('')
      this.log(formatExecutionComplete(result.data))
      this.scenarioResults.push({name: scenarioName, success: true})
    } else {
      this.log(formatExecutionError(command, args, result.error))
      this.scenarioResults.push({name: scenarioName, success: false})
    }
  }

  /**
   * Demonstrate streaming output for long-running command
   */
  private async demoStreamingOutput(): Promise<void> {
    const scenarioName = 'Streaming Output'
    this.log(`\n📋 Scenario: ${scenarioName}`)
    this.log('─'.repeat(60))

    const command = 'sh'
    const args = [
      '-c',
      'for i in 1 2 3; do echo "Line $i"; sleep 0.1; done',
    ]

    this.log(formatExecutionStart(command, args))
    this.log('\nStreaming Output:')

    const result = await this.service.executeCommand(
      command,
      args,
      undefined,
      (data) => {
        process.stdout.write(data)
      },
    )

    if (result.success) {
      this.log('')
      this.log(formatExecutionComplete(result.data))
      this.scenarioResults.push({name: scenarioName, success: true})
    } else {
      this.log(formatExecutionError(command, args, result.error))
      this.scenarioResults.push({name: scenarioName, success: false})
    }
  }

  /**
   * Demonstrate command execution with working directory
   */
  private async demoWorkingDirectory(): Promise<void> {
    const scenarioName = 'Working Directory'
    this.log(`\n📋 Scenario: ${scenarioName}`)
    this.log('─'.repeat(60))

    const command = 'pwd'
    const args: string[] = []
    const options = new CommandExecutionOptionsDto('/tmp')

    this.log(formatExecutionStart(command, args, options))

    const result = await this.service.executeCommand(command, args, options)

    if (result.success) {
      this.log('\nOutput:')
      this.log(result.data.stdout?.trim() ?? '(no output captured)')
      this.log('')
      this.log(formatExecutionComplete(result.data))
      this.scenarioResults.push({name: scenarioName, success: true})
    } else {
      this.log(formatExecutionError(command, args, result.error))
      this.scenarioResults.push({name: scenarioName, success: false})
    }
  }

  /**
   * Display summary of all demo scenarios
   */
  private displaySummary(): void {
    this.log('\n' + '='.repeat(60))
    this.log('Demo Summary')
    this.log('='.repeat(60))

    const successCount = this.scenarioResults.filter((r) => r.success).length
    const totalCount = this.scenarioResults.length

    this.log(`\nTotal Scenarios: ${totalCount}`)
    this.log(`Successful: ${successCount}`)
    this.log(`Failed: ${totalCount - successCount}`)
    this.log('')

    for (const result of this.scenarioResults) {
      const status = result.success ? '✓' : '✗'
      this.log(`${status} ${result.name}`)
    }

    this.log('\n' + '='.repeat(60))
  }
}
