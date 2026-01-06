import {BaseCommand} from '../../lib/base-command.js'
import {
  promptForMultipleSelections,
  promptForPassword,
  promptForSelection,
  promptForText,
} from '../../utils/prompts.js'

/**
 * Demo command that showcases all available interactive prompt types
 */
export default class PromptDemo extends BaseCommand<typeof PromptDemo> {
  static description = 'Demonstrate interactive prompts (text, password, select, multi-select)'
  static examples = [
    '<%= config.bin %> <%= command.id %>',
  ]
  static isExperimental = true

  async run(): Promise<void> {
    await this.parse(PromptDemo)

    // Check for JSON flag - prompts are not compatible with JSON output
    if (this.flags.json) {
      this.error('Interactive prompts are not compatible with --json output mode', {exit: 1})
    }

    // Check for TTY - prompts require an interactive terminal
    if (!process.stdin.isTTY) {
      this.error('This command requires an interactive terminal', {exit: 1})
    }

    // Text input prompt
    const nameResult = await promptForText({
      initial: 'Guest',
      message: 'What is your name?',
    })

    if (!nameResult.success) {
      this.error(nameResult.error.message, {exit: 1})
    }

    const name = nameResult.data

    // Password input prompt
    const passwordResult = await promptForPassword({
      message: 'Enter your password:',
    })

    if (!passwordResult.success) {
      this.error(passwordResult.error.message, {exit: 1})
    }

    const password = passwordResult.data

    // Single selection prompt
    const optionResult = await promptForSelection({
      choices: ['option 1', 'option 2', 'option 3'],
      message: 'Choose an option:',
    })

    if (!optionResult.success) {
      this.error(optionResult.error.message, {exit: 1})
    }

    const selectedOption = optionResult.data

    // Multiple selection prompt
    const multiResult = await promptForMultipleSelections({
      choices: ['option A', 'option B', 'option C'],
      message: 'Select multiple options (use space to toggle, enter to confirm):',
    })

    if (!multiResult.success) {
      this.error(multiResult.error.message, {exit: 1})
    }

    const selectedMultiple = multiResult.data

    // Display summary
    this.log('\nDemo Results:')
    this.log('─'.repeat(50))
    this.log(`Name:              ${name}`)
    this.log(`Password:          ${'*'.repeat(password.length)}`)
    this.log(`Selected Option:   ${selectedOption}`)
    this.log(`Multiple Options:  ${selectedMultiple.length > 0 ? selectedMultiple.join(', ') : 'None'}`)
    this.log('─'.repeat(50))
  }
}
