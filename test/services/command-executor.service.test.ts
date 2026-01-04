import {expect} from 'chai'

import {CommandExecutionOptionsDto} from '../../src/models/command-execution-options.dto.js'
import {CommandExecutorService} from '../../src/services/command-executor.service.js'

describe('CommandExecutorService', () => {
  let service: CommandExecutorService

  beforeEach(() => {
    service = new CommandExecutorService()
  })

  describe('executeCommand', () => {
    it('should execute simple command successfully', async () => {
      const result = await service.executeCommand('echo', ['hello'])

      expect(result.success).to.be.true
      if (result.success) {
        expect(result.data.command).to.equal('echo')
        expect(result.data.args).to.deep.equal(['hello'])
        expect(result.data.exitCode).to.equal(0)
        expect(result.data.stdout.trim()).to.equal('hello')
        expect(result.data.stderr).to.equal('')
        expect(result.data.executionTimeMs).to.be.greaterThan(0)
      }
    })

    it('should execute command with no arguments', async () => {
      const result = await service.executeCommand('pwd', [])

      expect(result.success).to.be.true
      if (result.success) {
        expect(result.data.command).to.equal('pwd')
        expect(result.data.args).to.deep.equal([])
        expect(result.data.exitCode).to.equal(0)
        expect(result.data.stdout).to.not.be.empty
      }
    })

    it('should execute command with working directory', async () => {
      const options = new CommandExecutionOptionsDto('/tmp')
      const result = await service.executeCommand('pwd', [], options)

      expect(result.success).to.be.true
      if (result.success) {
        expect(result.data.exitCode).to.equal(0)
        // On macOS, /tmp is a symlink to /private/tmp
        expect(result.data.stdout.trim()).to.match(/^\/(?:private\/)?tmp$/)
      }
    })

    it('should execute command with environment variables', async () => {
      const options = new CommandExecutionOptionsDto(undefined, {
        TEST_VAR: 'test_value',
      })
      const result = await service.executeCommand(
        'sh',
        ['-c', 'echo $TEST_VAR'],
        options,
      )

      expect(result.success).to.be.true
      if (result.success) {
        expect(result.data.exitCode).to.equal(0)
        expect(result.data.stdout.trim()).to.equal('test_value')
      }
    })

    it('should execute command with timeout within limit', async () => {
      const options = new CommandExecutionOptionsDto(undefined, undefined, 2000)
      const result = await service.executeCommand(
        'sh',
        ['-c', 'sleep 0.1 && echo done'],
        options,
      )

      expect(result.success).to.be.true
      if (result.success) {
        expect(result.data.exitCode).to.equal(0)
        expect(result.data.stdout.trim()).to.equal('done')
      }
    })

    // it('should handle command timeout', async () => {
    //   const options = new CommandExecutionOptionsDto(undefined, undefined, 500)
    //   const result = await service.executeCommand(
    //     'sh',
    //     ['-c', 'sleep 10'],
    //     options,
    //   )

    //   // Execa kills the process with a signal when timeout is exceeded
    //   expect(result.success).to.be.false
    //   if (!result.success) {
    //     expect(result.error.message).to.match(/terminated by signal|timeout/i)
    //   }
    // }).timeout(2000)

    it('should capture stdout from command', async () => {
      const result = await service.executeCommand('echo', [
        'line1',
        'line2',
        'line3',
      ])

      expect(result.success).to.be.true
      if (result.success) {
        expect(result.data.stdout).to.contain('line1')
        expect(result.data.stdout).to.contain('line2')
        expect(result.data.stdout).to.contain('line3')
      }
    })

    it('should capture stderr from command', async () => {
      const result = await service.executeCommand('sh', [
        '-c',
        'echo "error message" >&2',
      ])

      expect(result.success).to.be.true
      if (result.success) {
        expect(result.data.exitCode).to.equal(0)
        expect(result.data.stderr.trim()).to.equal('error message')
      }
    })

    it('should handle command not found error', async () => {
      const result = await service.executeCommand('nonexistent-command-xyz', [])

      // Execa with reject: false might still throw ENOENT as exception
      // Check if it's either error or a failed result
      if (result.success) {
        // If it succeeded, it means the error was not caught properly
        // This should not happen for ENOENT
        expect.fail('Expected command not found to return error result')
      } else {
        expect(result.error.message).to.contain('not found')
        expect(result.error.message).to.contain('nonexistent-command-xyz')
      }
    })

    it('should handle non-zero exit code', async () => {
      const result = await service.executeCommand('sh', ['-c', 'exit 42'])

      expect(result.success).to.be.true
      if (result.success) {
        // With reject: false, execa doesn't throw on non-zero exit
        expect(result.data.exitCode).to.equal(42)
      }
    })

    it('should stream output via callback', async () => {
      const chunks: string[] = []
      const result = await service.executeCommand(
        'sh',
        ['-c', 'echo line1 && echo line2 && echo line3'],
        undefined,
        (data) => {
          chunks.push(data)
        },
      )

      expect(result.success).to.be.true
      expect(chunks.length).to.be.greaterThan(0)
      const allOutput = chunks.join('')
      expect(allOutput).to.contain('line1')
      expect(allOutput).to.contain('line2')
      expect(allOutput).to.contain('line3')
    })

    it('should handle invalid working directory', async () => {
      const options = new CommandExecutionOptionsDto('/nonexistent/directory')
      const result = await service.executeCommand('pwd', [], options)

      // Execa with invalid cwd throws an exception
      if (result.success) {
        // If it succeeded, the error was not caught properly
        expect.fail('Expected invalid working directory to return error result')
      } else {
        expect(result.error.message).to.exist
      }
    })

    it('should measure execution time', async () => {
      const result = await service.executeCommand('sh', [
        '-c',
        'sleep 0.1 && echo done',
      ])

      expect(result.success).to.be.true
      if (result.success) {
        expect(result.data.executionTimeMs).to.be.greaterThanOrEqual(100)
        expect(result.data.executionTimeMs).to.be.lessThan(1000)
      }
    })

    it('should handle command with arguments containing spaces', async () => {
      const result = await service.executeCommand('echo', [
        'hello world',
        'foo bar',
      ])

      expect(result.success).to.be.true
      if (result.success) {
        expect(result.data.stdout.trim()).to.equal('hello world foo bar')
      }
    })
  })

  describe('stdio configuration', () => {
    it('should return null stdout/stderr when stdio is "inherit"', async () => {
      const result = await service.executeCommand('echo', ['test'], {
        stdio: 'inherit',
      })

      expect(result.success).to.be.true
      if (result.success) {
        expect(result.data.stdout).to.be.null
        expect(result.data.stderr).to.be.null
        expect(result.data.exitCode).to.equal(0)
      }
    })

    it('should return null stdout/stderr when stdio is "ignore"', async () => {
      const result = await service.executeCommand('echo', ['test'], {
        stdio: 'ignore',
      })

      expect(result.success).to.be.true
      if (result.success) {
        expect(result.data.stdout).to.be.null
        expect(result.data.stderr).to.be.null
        expect(result.data.exitCode).to.equal(0)
      }
    })

    it('should capture output when stdio is "pipe" (default)', async () => {
      const result = await service.executeCommand('echo', ['test'])

      expect(result.success).to.be.true
      if (result.success) {
        expect(result.data.stdout).to.not.be.null
        expect(result.data.stdout?.trim()).to.equal('test')
        expect(result.data.stderr).to.not.be.null
      }
    })

    it('should not invoke outputCallback when stdio is "inherit"', async () => {
      let callbackInvoked = false
      const callback = () => {
        callbackInvoked = true
      }

      const result = await service.executeCommand(
        'echo',
        ['test'],
        {stdio: 'inherit'},
        callback,
      )

      expect(result.success).to.be.true
      expect(callbackInvoked).to.be.false
    })
  })

  describe('detached option', () => {
    it('should execute command in detached mode', async () => {
      const result = await service.executeCommand('echo', ['test'], {
        detached: true,
        stdio: 'ignore',
      })

      expect(result.success).to.be.true
      if (result.success) {
        expect(result.data.exitCode).to.equal(0)
        expect(result.data.stdout).to.be.null
        expect(result.data.stderr).to.be.null
      }
    })
  })
})
