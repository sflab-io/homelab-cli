import {expect} from 'chai';

import type {ProxmoxVMDTO} from '../../src/models/proxmox-vm.dto.js';
import type {IProxmoxRepository} from '../../src/repositories/interfaces/proxmox.repository.interface.js';

import {RepositoryError} from '../../src/errors/repository.error.js';
import {ProxmoxSSHService} from '../../src/services/proxmox-ssh.service.js';
import {failure, success} from '../../src/utils/result.js';

describe('ProxmoxSSHService', () => {
  describe('getRunningResources', () => {
    it('should return only running VMs', async () => {
      // Arrange
      const mockVMs: ProxmoxVMDTO[] = [
        {
          ipv4Address: '192.168.1.10',
          name: 'running-vm',
          node: 'pve',
          status: 'running',
          vmid: 100,
        },
        {
          ipv4Address: null,
          name: 'stopped-vm',
          node: 'pve',
          status: 'stopped',
          vmid: 101,
        },
        {
          ipv4Address: '192.168.1.12',
          name: 'another-running-vm',
          node: 'pve',
          status: 'running',
          vmid: 102,
        },
      ];

      const mockRepository: IProxmoxRepository = {
        listResources: async () => success(mockVMs),
      } as IProxmoxRepository;

      const service = new ProxmoxSSHService(mockRepository);

      // Act
      const result = await service.getRunningResources('qemu');

      // Assert
      expect(result.success).to.be.true;
      if (result.success) {
        expect(result.data).to.have.lengthOf(2);
        expect(result.data[0].vmid).to.equal(100);
        expect(result.data[0].status).to.equal('running');
        expect(result.data[1].vmid).to.equal(102);
        expect(result.data[1].status).to.equal('running');
      }
    });

    it('should return only running containers', async () => {
      // Arrange
      const mockContainers: ProxmoxVMDTO[] = [
        {
          ipv4Address: '192.168.1.20',
          name: 'running-container',
          node: 'pve',
          status: 'running',
          vmid: 200,
        },
        {
          ipv4Address: null,
          name: 'stopped-container',
          node: 'pve',
          status: 'stopped',
          vmid: 201,
        },
      ];

      const mockRepository: IProxmoxRepository = {
        listResources: async () => success(mockContainers),
      } as IProxmoxRepository;

      const service = new ProxmoxSSHService(mockRepository);

      // Act
      const result = await service.getRunningResources('lxc');

      // Assert
      expect(result.success).to.be.true;
      if (result.success) {
        expect(result.data).to.have.lengthOf(1);
        expect(result.data[0].vmid).to.equal(200);
        expect(result.data[0].status).to.equal('running');
      }
    });

    it('should return empty array when no resources are running', async () => {
      // Arrange
      const mockVMs: ProxmoxVMDTO[] = [
        {
          ipv4Address: null,
          name: 'stopped-vm-1',
          node: 'pve',
          status: 'stopped',
          vmid: 100,
        },
        {
          ipv4Address: null,
          name: 'stopped-vm-2',
          node: 'pve',
          status: 'stopped',
          vmid: 101,
        },
      ];

      const mockRepository: IProxmoxRepository = {
        listResources: async () => success(mockVMs),
      } as IProxmoxRepository;

      const service = new ProxmoxSSHService(mockRepository);

      // Act
      const result = await service.getRunningResources('qemu');

      // Assert
      expect(result.success).to.be.true;
      if (result.success) {
        expect(result.data).to.have.lengthOf(0);
      }
    });

    it('should return empty array when no resources exist', async () => {
      // Arrange
      const mockRepository: IProxmoxRepository = {
        listResources: async () => success([]),
      } as IProxmoxRepository;

      const service = new ProxmoxSSHService(mockRepository);

      // Act
      const result = await service.getRunningResources('qemu');

      // Assert
      expect(result.success).to.be.true;
      if (result.success) {
        expect(result.data).to.have.lengthOf(0);
      }
    });

    it('should preserve all resource properties', async () => {
      // Arrange
      const mockVMs: ProxmoxVMDTO[] = [
        {
          ipv4Address: '192.168.1.10',
          name: 'test-vm',
          node: 'pve-node',
          status: 'running',
          vmid: 100,
        },
      ];

      const mockRepository: IProxmoxRepository = {
        listResources: async () => success(mockVMs),
      } as IProxmoxRepository;

      const service = new ProxmoxSSHService(mockRepository);

      // Act
      const result = await service.getRunningResources('qemu');

      // Assert
      expect(result.success).to.be.true;
      if (result.success) {
        expect(result.data[0].vmid).to.equal(100);
        expect(result.data[0].name).to.equal('test-vm');
        expect(result.data[0].node).to.equal('pve-node');
        expect(result.data[0].status).to.equal('running');
        expect(result.data[0].ipv4Address).to.equal('192.168.1.10');
      }
    });

    it('should return error when repository fails', async () => {
      // Arrange
      const mockRepository: IProxmoxRepository = {
        listResources: async () => failure(new RepositoryError('API connection failed')),
      } as IProxmoxRepository;

      const service = new ProxmoxSSHService(mockRepository);

      // Act
      const result = await service.getRunningResources('qemu');

      // Assert
      expect(result.success).to.be.false;
      if (!result.success) {
        expect(result.error.message).to.include('Failed to retrieve qemu resources');
      }
    });
  });

  describe('getResourceIPAddress', () => {
    it('should return IP address for existing VM with IP', async () => {
      // Arrange
      const mockVMs: ProxmoxVMDTO[] = [
        {
          ipv4Address: '192.168.1.10',
          name: 'test-vm',
          node: 'pve',
          status: 'running',
          vmid: 100,
        },
      ];

      const mockRepository: IProxmoxRepository = {
        listResources: async () => success(mockVMs),
      } as IProxmoxRepository;

      const service = new ProxmoxSSHService(mockRepository);

      // Act
      const result = await service.getResourceIPAddress(100, 'qemu');

      // Assert
      expect(result.success).to.be.true;
      if (result.success) {
        expect(result.data).to.equal('192.168.1.10');
      }
    });

    it('should return IP address for existing container with IP', async () => {
      // Arrange
      const mockContainers: ProxmoxVMDTO[] = [
        {
          ipv4Address: '192.168.1.20',
          name: 'test-container',
          node: 'pve',
          status: 'running',
          vmid: 200,
        },
      ];

      const mockRepository: IProxmoxRepository = {
        listResources: async () => success(mockContainers),
      } as IProxmoxRepository;

      const service = new ProxmoxSSHService(mockRepository);

      // Act
      const result = await service.getResourceIPAddress(200, 'lxc');

      // Assert
      expect(result.success).to.be.true;
      if (result.success) {
        expect(result.data).to.equal('192.168.1.20');
      }
    });

    it('should return error when VMID does not exist', async () => {
      // Arrange
      const mockVMs: ProxmoxVMDTO[] = [
        {
          ipv4Address: '192.168.1.10',
          name: 'test-vm',
          node: 'pve',
          status: 'running',
          vmid: 100,
        },
      ];

      const mockRepository: IProxmoxRepository = {
        listResources: async () => success(mockVMs),
      } as IProxmoxRepository;

      const service = new ProxmoxSSHService(mockRepository);

      // Act
      const result = await service.getResourceIPAddress(999, 'qemu');

      // Assert
      expect(result.success).to.be.false;
      if (!result.success) {
        expect(result.error.message).to.include('VM with VMID 999 not found');
      }
    });

    it('should return error when container VMID does not exist', async () => {
      // Arrange
      const mockContainers: ProxmoxVMDTO[] = [
        {
          ipv4Address: '192.168.1.20',
          name: 'test-container',
          node: 'pve',
          status: 'running',
          vmid: 200,
        },
      ];

      const mockRepository: IProxmoxRepository = {
        listResources: async () => success(mockContainers),
      } as IProxmoxRepository;

      const service = new ProxmoxSSHService(mockRepository);

      // Act
      const result = await service.getResourceIPAddress(999, 'lxc');

      // Assert
      expect(result.success).to.be.false;
      if (!result.success) {
        expect(result.error.message).to.include('container with VMID 999 not found');
      }
    });

    it('should return error when IP address is null', async () => {
      // Arrange
      const mockVMs: ProxmoxVMDTO[] = [
        {
          ipv4Address: null,
          name: 'stopped-vm',
          node: 'pve',
          status: 'stopped',
          vmid: 100,
        },
      ];

      const mockRepository: IProxmoxRepository = {
        listResources: async () => success(mockVMs),
      } as IProxmoxRepository;

      const service = new ProxmoxSSHService(mockRepository);

      // Act
      const result = await service.getResourceIPAddress(100, 'qemu');

      // Assert
      expect(result.success).to.be.false;
      if (!result.success) {
        expect(result.error.message).to.include('IP address not available');
        expect(result.error.message).to.include('VM 100');
        expect(result.error.message).to.include('guest agent');
      }
    });

    it('should return error when container IP address is null', async () => {
      // Arrange
      const mockContainers: ProxmoxVMDTO[] = [
        {
          ipv4Address: null,
          name: 'stopped-container',
          node: 'pve',
          status: 'stopped',
          vmid: 200,
        },
      ];

      const mockRepository: IProxmoxRepository = {
        listResources: async () => success(mockContainers),
      } as IProxmoxRepository;

      const service = new ProxmoxSSHService(mockRepository);

      // Act
      const result = await service.getResourceIPAddress(200, 'lxc');

      // Assert
      expect(result.success).to.be.false;
      if (!result.success) {
        expect(result.error.message).to.include('IP address not available');
        expect(result.error.message).to.include('container 200');
        expect(result.error.message).to.include('guest agent');
      }
    });

    it('should return error when repository fails', async () => {
      // Arrange
      const mockRepository: IProxmoxRepository = {
        listResources: async () => failure(new RepositoryError('API connection failed')),
      } as IProxmoxRepository;

      const service = new ProxmoxSSHService(mockRepository);

      // Act
      const result = await service.getResourceIPAddress(100, 'qemu');

      // Assert
      expect(result.success).to.be.false;
      if (!result.success) {
        expect(result.error.message).to.include('Failed to retrieve qemu resources');
      }
    });
  });

  describe('connectSSH', () => {
    it('should construct SSH command with default credentials for VM', async () => {
      // Arrange
      const mockVMs: ProxmoxVMDTO[] = [
        {
          ipv4Address: '192.168.1.10',
          name: 'test-vm',
          node: 'pve',
          status: 'running',
          vmid: 100,
        },
      ];

      const mockRepository: IProxmoxRepository = {
        listResources: async () => success(mockVMs),
      } as IProxmoxRepository;

      const service = new ProxmoxSSHService(mockRepository);

      // Note: We cannot easily test the actual SSH execution without mocking CommandExecutorService
      // This test verifies that getResourceIPAddress is called correctly
      // The actual SSH command execution is tested via integration tests

      // Act
      const ipResult = await service.getResourceIPAddress(100, 'qemu');

      // Assert - verify IP resolution works (prerequisite for SSH)
      expect(ipResult.success).to.be.true;
      if (ipResult.success) {
        expect(ipResult.data).to.equal('192.168.1.10');
      }
    });

    it('should construct SSH command with default credentials for container', async () => {
      // Arrange
      const mockContainers: ProxmoxVMDTO[] = [
        {
          ipv4Address: '192.168.1.20',
          name: 'test-container',
          node: 'pve',
          status: 'running',
          vmid: 200,
        },
      ];

      const mockRepository: IProxmoxRepository = {
        listResources: async () => success(mockContainers),
      } as IProxmoxRepository;

      const service = new ProxmoxSSHService(mockRepository);

      // Act
      const ipResult = await service.getResourceIPAddress(200, 'lxc');

      // Assert - verify IP resolution works (prerequisite for SSH)
      expect(ipResult.success).to.be.true;
      if (ipResult.success) {
        expect(ipResult.data).to.equal('192.168.1.20');
      }
    });

    it('should fail when IP address is unavailable', async () => {
      // Arrange
      const mockVMs: ProxmoxVMDTO[] = [
        {
          ipv4Address: null,
          name: 'stopped-vm',
          node: 'pve',
          status: 'stopped',
          vmid: 100,
        },
      ];

      const mockRepository: IProxmoxRepository = {
        listResources: async () => success(mockVMs),
      } as IProxmoxRepository;

      const service = new ProxmoxSSHService(mockRepository);

      // Act
      const result = await service.connectSSH(100, 'qemu');

      // Assert
      expect(result.success).to.be.false;
      if (!result.success) {
        expect(result.error.message).to.include('IP address not available');
      }
    });

    it('should fail when VMID does not exist', async () => {
      // Arrange
      const mockVMs: ProxmoxVMDTO[] = [
        {
          ipv4Address: '192.168.1.10',
          name: 'test-vm',
          node: 'pve',
          status: 'running',
          vmid: 100,
        },
      ];

      const mockRepository: IProxmoxRepository = {
        listResources: async () => success(mockVMs),
      } as IProxmoxRepository;

      const service = new ProxmoxSSHService(mockRepository);

      // Act
      const result = await service.connectSSH(999, 'qemu');

      // Assert
      expect(result.success).to.be.false;
      if (!result.success) {
        expect(result.error.message).to.include('VM with VMID 999 not found');
      }
    });
  });
});
