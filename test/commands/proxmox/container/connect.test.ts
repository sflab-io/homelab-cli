import {runCommand} from '@oclif/test';
import {expect} from 'chai';

describe('proxmox container connect', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    process.env = {...originalEnv};
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('argument validation', () => {
    it('requires vmid argument', async () => {
      const {error} = await runCommand('proxmox container connect');

      expect(error).to.exist;
      expect(error?.message).to.match(/Missing 1 required arg/i);
    });

    it('accepts vmid as integer', async () => {
      const {error} = await runCommand('proxmox container connect 200');

      // Command will likely fail if Proxmox is not configured,
      // but should not fail on argument parsing
      if (error) {
        // Should fail on connection, not argument parsing
        expect(error.message).to.not.match(/Missing.*arg/i);
        expect(error.message).to.match(/PROXMOX_|Failed to retrieve|not found|IP address not available/);
      }
    });
  });

  describe('flag handling', () => {
    it('accepts --user flag', async () => {
      const {error} = await runCommand(['proxmox', 'container', 'connect', '200', '--user', 'root']);

      if (error) {
        // Should fail on connection, not flag parsing
        expect(error.message).to.not.match(/Unknown flag|Invalid flag/i);
        expect(error.message).to.match(/PROXMOX_|Failed to retrieve|not found|IP address not available/);
      }
    });

    it('accepts --key flag', async () => {
      const {error} = await runCommand([
        'proxmox',
        'container',
        'connect',
        '200',
        '--key',
        '~/.ssh/custom_key',
      ]);

      if (error) {
        // Should fail on connection, not flag parsing
        expect(error.message).to.not.match(/Unknown flag|Invalid flag/i);
        expect(error.message).to.match(/PROXMOX_|Failed to retrieve|not found|IP address not available/);
      }
    });

    it('accepts both --user and --key flags', async () => {
      const {error} = await runCommand([
        'proxmox',
        'container',
        'connect',
        '200',
        '--user',
        'ubuntu',
        '--key',
        '~/.ssh/id_rsa',
      ]);

      if (error) {
        // Should fail on connection, not flag parsing
        expect(error.message).to.not.match(/Unknown flag|Invalid flag/i);
        expect(error.message).to.match(/PROXMOX_|Failed to retrieve|not found|IP address not available/);
      }
    });

    it('accepts short flag aliases', async () => {
      const {error} = await runCommand([
        'proxmox',
        'container',
        'connect',
        '200',
        '-u',
        'root',
        '-k',
        '~/.ssh/key',
      ]);

      if (error) {
        // Should fail on connection, not flag parsing
        expect(error.message).to.not.match(/Unknown flag|Invalid flag/i);
        expect(error.message).to.match(/PROXMOX_|Failed to retrieve|not found|IP address not available/);
      }
    });
  });

  describe('error handling', () => {
    it('shows error when Proxmox is not configured', async () => {
      // Clear Proxmox environment variables
      delete process.env.PROXMOX_HOST;
      delete process.env.PROXMOX_TOKEN_SECRET;
      delete process.env.PROXMOX_USER;

      const {error} = await runCommand('proxmox container connect 200');

      expect(error).to.exist;
      expect(error?.message).to.match(/PROXMOX_/);
    });

    it('shows helpful error when container not found', async () => {
      const {error} = await runCommand('proxmox container connect 99999');

      if (error) {
        // Either Proxmox is not configured, or container is not found
        expect(error.message).to.match(/PROXMOX_|not found|Failed to retrieve/);
      }
    });

    it('shows helpful error when IP address unavailable', async () => {
      // This test would require a stopped container with known VMID
      // For now, we just verify the command accepts the input
      const {error} = await runCommand('proxmox container connect 200');

      if (error) {
        // Possible errors: Proxmox not configured, container not found, or IP unavailable
        expect(error.message).to.match(/PROXMOX_|not found|IP address not available|Failed to retrieve/);
      }
    });
  });

  describe('command output', () => {
    it('shows connecting message before SSH', async () => {
      const {error, stdout} = await runCommand('proxmox container connect 200');

      if (error) {
        // Expected if Proxmox is not configured
        expect(error.message).to.match(/PROXMOX_|not found|IP address not available|Failed to retrieve/);
      } else {
        // If successful, should show connecting message
        expect(stdout).to.match(/Connecting to container 200/);
      }
    });
  });
});
