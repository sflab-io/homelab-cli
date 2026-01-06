import { expect } from 'chai';

import type { RequiredProxmoxConfig } from '../../src/models/schemas/cli-config.schema.js';

import { ProxmoxRepository } from '../../src/repositories/proxmox.repository.js';

/**
 * Unit tests for ProxmoxRepository.
 *
 * Note: Due to ES module constraints, we cannot easily mock the proxmox module with sinon.
 * These tests verify the repository's behavior, error handling, and Result type patterns.
 * Integration tests in proxmox.integration.test.ts verify actual API communication.
 * Service-level tests verify the integration between service and repository layers.
 */
describe('ProxmoxRepository', () => {
  let repository: ProxmoxRepository;
  let config: RequiredProxmoxConfig;

  beforeEach(() => {
    // Setup test config with invalid host to ensure tests don't make real API calls
    config = {
      host: 'nonexistent-test-host.invalid',
      port: 8006,
      realm: 'pam',
      rejectUnauthorized: false,
      tokenKey: 'testtoken',
      tokenSecret: '12345678-1234-1234-1234-123456789abc',
      user: 'root',
    };

    repository = new ProxmoxRepository(config);
  });

  describe('setVMConfig', () => {
    it('should return Result type with failure when API connection fails', async () => {
      // Arrange
      const node = 'pve';
      const vmid = 100;
      const configParams = {
        cipassword: 'testpassword',
        ciupgrade: 1,
        ciuser: 'admin',
        ipconfig0: 'dhcp',
        sshkeys: encodeURIComponent('ssh-ed25519 AAAA... user@host'),
      };

      // Act - call with invalid host will fail
      const result = await repository.setVMConfig(node, vmid, configParams);

      // Assert - verify Result type structure
      expect(result).to.have.property('success');
      expect(result.success).to.be.false;

      if (!result.success) {
        expect(result.error).to.exist;
        expect(result.error.message).to.equal('Failed to set VM configuration');
        expect(result.error.context?.cause).to.exist;
      }
    });

    it('should include error context with node, vmid, and config when API fails', async () => {
      // Arrange
      const node = 'pve-node-1';
      const vmid = 250;
      const configParams = {
        ciuser: 'testuser',
        ipconfig0: 'ip=192.168.1.100/24',
      };

      // Act
      const result = await repository.setVMConfig(node, vmid, configParams);

      // Assert
      expect(result.success).to.be.false;
      if (!result.success) {
        expect(result.error.context).to.exist;
        expect(result.error.context?.context?.node).to.equal(node);
        expect(result.error.context?.context?.vmid).to.equal(vmid);
        expect(result.error.context?.context?.config).to.deep.equal(configParams);
        expect(result.error.context?.context?.message).to.be.a('string');
      }
    });

    it('should handle empty config parameters', async () => {
      // Arrange
      const node = 'pve';
      const vmid = 100;
      const configParams = {};

      // Act
      const result = await repository.setVMConfig(node, vmid, configParams);

      // Assert - Should still fail due to invalid host, but verify it handles empty config
      expect(result.success).to.be.false;
      if (!result.success) {
        expect(result.error.context).to.exist;
        expect(result.error.context?.context?.config).to.deep.equal({});
      }
    });

    it('should handle config with URL-encoded SSH keys', async () => {
      // Arrange
      const node = 'pve';
      const vmid = 100;
      const rawSshKey = 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIExampleKey user@host';
      const encodedSshKey = encodeURIComponent(rawSshKey);
      const configParams = {
        ciuser: 'admin',
        sshkeys: encodedSshKey,
      };

      // Act
      const result = await repository.setVMConfig(node, vmid, configParams);

      // Assert - Verify encoded SSH key is preserved in context
      expect(result.success).to.be.false;
      if (!result.success) {
        expect(result.error.context).to.exist;
        const config = result.error.context?.context?.config as Record<string, string>;
        expect(config.sshkeys).to.equal(encodedSshKey);
        expect(config.sshkeys).to.include('%20'); // Space should be encoded
        expect(config.sshkeys).to.not.include(' '); // No raw spaces
      }
    });

    it('should handle config with all cloud-init parameters', async () => {
      // Arrange
      const node = 'pve';
      const vmid = 100;
      const configParams = {
        cipassword: 'secure-password',
        ciupgrade: 1,
        ciuser: 'ubuntu',
        ipconfig0: 'ip=10.0.10.123/24,gw=10.0.10.1',
        sshkeys: encodeURIComponent('ssh-rsa AAAAB3... user@host'),
      };

      // Act
      const result = await repository.setVMConfig(node, vmid, configParams);

      // Assert - Verify all parameters are preserved in error context
      expect(result.success).to.be.false;
      if (!result.success) {
        expect(result.error.context).to.exist;
        const config = result.error.context?.context?.config as Record<string, number | string>;
        expect(config).to.deep.equal(configParams);
        expect(config.ciuser).to.equal('ubuntu');
        expect(config.cipassword).to.equal('secure-password');
        expect(config.ciupgrade).to.equal(1);
        expect(config.ipconfig0).to.equal('ip=10.0.10.123/24,gw=10.0.10.1');
      }
    });

    it('should preserve parameter types in error context', async () => {
      // Arrange
      const node = 'pve';
      const vmid = 100;
      const configParams = {
        ciupgrade: 1, // number
        ciuser: 'admin', // string
        ipconfig0: 'dhcp', // string
      };

      // Act
      const result = await repository.setVMConfig(node, vmid, configParams);

      // Assert - Verify types are preserved
      expect(result.success).to.be.false;
      if (!result.success) {
        expect(result.error.context).to.exist;
        const config = result.error.context?.context?.config as Record<string, number | string>;
        expect(typeof config.ciupgrade).to.equal('number');
        expect(typeof config.ciuser).to.equal('string');
        expect(typeof config.ipconfig0).to.equal('string');
      }
    });

    it('should handle numeric vmid values correctly', async () => {
      // Arrange
      const node = 'pve';
      const vmids = [100, 250, 999, 1000];

      // Act & Assert - Test multiple vmid values
      for (const vmid of vmids) {
        // eslint-disable-next-line no-await-in-loop
        const result = await repository.setVMConfig(node, vmid, { ciuser: 'test' });

        expect(result.success).to.be.false;
        if (!result.success) {
          expect(result.error.context).to.exist;
          expect(result.error.context?.context?.vmid).to.equal(vmid);
          expect(typeof result.error.context?.context?.vmid).to.equal('number');
        }
      }
    });
  });

  describe('startVM', () => {
    it('should return Result type with failure when API connection fails', async () => {
      // Arrange
      const node = 'pve';
      const vmid = 100;

      // Act - call with invalid host will fail
      const result = await repository.startVM(node, vmid);

      // Assert - verify Result type structure
      expect(result).to.have.property('success');
      expect(result.success).to.be.false;

      if (!result.success) {
        expect(result.error).to.exist;
        expect(result.error.message).to.include('Failed to start VM');
        expect(result.error.context?.cause).to.exist;
      }
    });

    it('should include error context with node and vmid when API fails', async () => {
      // Arrange
      const node = 'pve-node-1';
      const vmid = 250;

      // Act
      const result = await repository.startVM(node, vmid);

      // Assert
      expect(result.success).to.be.false;
      if (!result.success) {
        expect(result.error.context).to.exist;
        expect(result.error.context?.context?.node).to.equal(node);
        expect(result.error.context?.context?.vmid).to.equal(vmid);
      }
    });

    it('should handle different node names correctly', async () => {
      // Arrange
      const nodes = ['pve', 'pve-node-1', 'pve-node-2', 'proxmox'];
      const vmid = 100;

      // Act & Assert - Test multiple node values
      for (const node of nodes) {
        // eslint-disable-next-line no-await-in-loop
        const result = await repository.startVM(node, vmid);

        expect(result.success).to.be.false;
        if (!result.success) {
          expect(result.error.context).to.exist;
          expect(result.error.context?.context?.node).to.equal(node);
        }
      }
    });

    it('should handle numeric vmid values correctly', async () => {
      // Arrange
      const node = 'pve';
      const vmids = [100, 250, 999, 1000];

      // Act & Assert - Test multiple vmid values
      for (const vmid of vmids) {
        // eslint-disable-next-line no-await-in-loop
        const result = await repository.startVM(node, vmid);

        expect(result.success).to.be.false;
        if (!result.success) {
          expect(result.error.context).to.exist;
          expect(result.error.context?.context?.vmid).to.equal(vmid);
          expect(typeof result.error.context?.context?.vmid).to.equal('number');
        }
      }
    });

    it('should preserve error cause chain', async () => {
      // Arrange
      const node = 'pve';
      const vmid = 100;

      // Act
      const result = await repository.startVM(node, vmid);

      // Assert - Verify error cause is preserved for debugging
      expect(result.success).to.be.false;
      if (!result.success) {
        expect(result.error.context).to.exist;
        expect(result.error.context?.cause).to.exist;
        expect(result.error.context?.cause).to.be.instanceOf(Error);
      }
    });

    it('should include descriptive error message', async () => {
      // Arrange
      const node = 'pve';
      const vmid = 100;

      // Act
      const result = await repository.startVM(node, vmid);

      // Assert - Error message should be user-friendly
      expect(result.success).to.be.false;
      if (!result.success) {
        expect(result.error.message).to.be.a('string');
        expect(result.error.message).to.have.length.greaterThan(0);
        expect(result.error.message).to.include('Failed to start VM');
      }
    });
  });

  describe('stopVM', () => {
    it('should return Result type with failure when API connection fails', async () => {
      // Arrange
      const node = 'pve';
      const vmid = 100;

      // Act - call with invalid host will fail
      const result = await repository.stopVM(node, vmid);

      // Assert - verify Result type structure
      expect(result).to.have.property('success');
      expect(result.success).to.be.false;

      if (!result.success) {
        expect(result.error).to.exist;
        expect(result.error.message).to.include('Failed to stop VM');
        expect(result.error.context?.cause).to.exist;
      }
    });

    it('should include error context with node and vmid when API fails', async () => {
      // Arrange
      const node = 'pve-node-1';
      const vmid = 250;

      // Act
      const result = await repository.stopVM(node, vmid);

      // Assert
      expect(result.success).to.be.false;
      if (!result.success) {
        expect(result.error.context).to.exist;
        expect(result.error.context?.context?.node).to.equal(node);
        expect(result.error.context?.context?.vmid).to.equal(vmid);
      }
    });

    it('should handle different node names correctly', async () => {
      // Arrange
      const nodes = ['pve', 'pve-node-1', 'pve-node-2', 'proxmox'];
      const vmid = 100;

      // Act & Assert - Test multiple node values
      for (const node of nodes) {
        // eslint-disable-next-line no-await-in-loop
        const result = await repository.stopVM(node, vmid);

        expect(result.success).to.be.false;
        if (!result.success) {
          expect(result.error.context).to.exist;
          expect(result.error.context?.context?.node).to.equal(node);
        }
      }
    });

    it('should handle numeric vmid values correctly', async () => {
      // Arrange
      const node = 'pve';
      const vmids = [100, 250, 999, 1000];

      // Act & Assert - Test multiple vmid values
      for (const vmid of vmids) {
        // eslint-disable-next-line no-await-in-loop
        const result = await repository.stopVM(node, vmid);

        expect(result.success).to.be.false;
        if (!result.success) {
          expect(result.error.context).to.exist;
          expect(result.error.context?.context?.vmid).to.equal(vmid);
          expect(typeof result.error.context?.context?.vmid).to.equal('number');
        }
      }
    });

    it('should preserve error cause chain', async () => {
      // Arrange
      const node = 'pve';
      const vmid = 100;

      // Act
      const result = await repository.stopVM(node, vmid);

      // Assert - Verify error cause is preserved for debugging
      expect(result.success).to.be.false;
      if (!result.success) {
        expect(result.error.context).to.exist;
        expect(result.error.context?.cause).to.exist;
        expect(result.error.context?.cause).to.be.instanceOf(Error);
      }
    });

    it('should include descriptive error message', async () => {
      // Arrange
      const node = 'pve';
      const vmid = 100;

      // Act
      const result = await repository.stopVM(node, vmid);

      // Assert - Error message should be user-friendly
      expect(result.success).to.be.false;
      if (!result.success) {
        expect(result.error.message).to.be.a('string');
        expect(result.error.message).to.have.length.greaterThan(0);
        expect(result.error.message).to.include('Failed to stop VM');
      }
    });
  });
});
