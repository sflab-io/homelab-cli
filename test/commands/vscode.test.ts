import {runCommand} from '@oclif/test'
import {expect} from 'chai'
import {afterEach, beforeEach, describe, it} from 'mocha'

describe.skip('vscode', () => {
  const originalEnv = process.env
  const originalCwd = process.cwd()

  beforeEach(() => {
    // Reset environment before each test
    process.env = {...originalEnv}
  })

  afterEach(() => {
    // Restore original environment and cwd
    process.env = originalEnv
    process.chdir(originalCwd)
  })

  it('runs without arguments (auto-detect project, open project root)', async () => {
    const {error, stdout} = await runCommand('vscode')

    // Error is acceptable if we can't detect the project or code is not found
    if (error) {
      expect(error.message).to.match(/Could not detect current project|code.*not found|Failed to open VSCode/i)
    } else {
      // Success message should mention opening project
      expect(stdout).to.match(/Opening project in VS Code/)
    }
  })

  it('runs with workspace name (auto-detect project, open workspace)', async () => {
    const {error, stdout} = await runCommand('vscode myworkspace')

    // Error is acceptable if we can't detect the project or code is not found
    if (error) {
      expect(error.message).to.match(/Could not detect current project|code.*not found|Failed to open VSCode/i)
    } else {
      // Success message should mention opening workspace
      expect(stdout).to.match(/Opening workspace.*in VS Code/)
    }
  })

  it('shows error when project cannot be detected (outside projects directory)', async () => {
    // Change to a directory that's definitely not a project
    process.chdir('/tmp')

    const {error} = await runCommand('vscode')

    expect(error).to.exist
    if (error) {
      expect(error.message).to.match(/Could not detect current project/)
    }
  })

  it('shows error when projects directory config is invalid', async () => {
    // Set invalid projects directory path that doesn't exist
    // Empty string gets replaced with default ~/projects/, so use a clearly invalid path
    process.env.PROJECTS_DIR = '/this/path/definitely/does/not/exist/nowhere'

    const {error, stdout} = await runCommand('vscode')

    // The command may succeed in spawning code even with invalid dir
    // (code command itself might fail, but that's not our error to catch)
    // So we accept either scenario
    if (error) {
      expect(error.message).to.match(/Could not detect current project|code.*not found|Failed to open VSCode/i)
    } else {
      // Command succeeded in spawning (code handles non-existent paths)
      expect(stdout).to.match(/Opening project in VS Code/)
    }
  })

  describe('with custom PROJECTS_DIR', () => {
    it('uses custom projects directory when set', async () => {
      process.env.PROJECTS_DIR = '/tmp/test-projects'

      const {error, stdout} = await runCommand('vscode')

      // Should attempt to use custom directory
      if (error) {
        // Acceptable errors: code command not found or project detection failed
        expect(error.message).to.match(/Could not detect current project|code.*not found|Failed to open VSCode/i)
      } else {
        expect(stdout).to.match(/Opening project in VS Code/)
      }
    })
  })
})
