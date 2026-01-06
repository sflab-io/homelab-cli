import type {ProxmoxVMDTO} from '../models/proxmox-vm.dto.js';
import type {IProxmoxRepository} from '../repositories/interfaces/proxmox.repository.interface.js';
import type {Result} from '../utils/result.js';

import {ServiceError} from '../errors/service.error.js';
import {failure, success} from '../utils/result.js';
import {CommandExecutorService} from './command-executor.service.js';

/**
 * Service for establishing SSH connections to Proxmox VMs and LXC containers.
 * Handles IP address resolution and SSH command execution.
 */
export class ProxmoxSSHService {
  private readonly commandExecutor: CommandExecutorService;

  constructor(private readonly repository: IProxmoxRepository) {
    this.commandExecutor = new CommandExecutorService();
  }

  /**
   * Establishes an SSH connection to a Proxmox resource.
   * @param vmid The VMID of the resource
   * @param resourceType Type of resource ('qemu' for VM, 'lxc' for container)
   * @param username SSH username (default: 'admin')
   * @param keyPath Path to SSH private key (default: '~/.ssh/admin_id_ecdsa')
   * @returns Result indicating success or ServiceError
   */
  async connectSSH(
    vmid: number,
    resourceType: 'lxc' | 'qemu',
    username = 'admin',
    keyPath = '~/.ssh/admin_id_ecdsa',
  ): Promise<Result<void, ServiceError>> {
    // Resolve IP address
    const ipResult = await this.getResourceIPAddress(vmid, resourceType);

    if (!ipResult.success) {
      return failure(ipResult.error);
    }

    const ipAddress = ipResult.data;

    // Construct SSH command
    const sshArgs = ['-i', keyPath, `${username}@${ipAddress}`];

    // Execute SSH command with inherited stdio for interactive session
    const execResult = await this.commandExecutor.executeCommand('ssh', sshArgs, {
      stdio: 'inherit',
    });

    if (!execResult.success) {
      return failure(
        new ServiceError(`SSH connection failed: ${execResult.error.message}`, {
          cause: execResult.error,
          ipAddress,
          keyPath,
          resourceType,
          username,
          vmid,
        }),
      );
    }

    // eslint-disable-next-line unicorn/no-useless-undefined
    return success(undefined);
  }

  /**
   * Resolves the IP address of a Proxmox resource (VM or container).
   * @param vmid The VMID of the resource
   * @param resourceType Type of resource ('qemu' for VM, 'lxc' for container)
   * @returns Result containing IP address or ServiceError
   */
  async getResourceIPAddress(
    vmid: number,
    resourceType: 'lxc' | 'qemu',
  ): Promise<Result<string, ServiceError>> {
    // Fetch resources from repository
    const resourcesResult = await this.repository.listResources(resourceType);

    if (!resourcesResult.success) {
      return failure(
        new ServiceError(`Failed to retrieve ${resourceType} resources from Proxmox API`, {
          cause: resourcesResult.error,
          resourceType,
          vmid,
        }),
      );
    }

    // Find resource with matching VMID
    const resource = resourcesResult.data.find((r) => r.vmid === vmid);

    if (!resource) {
      const resourceTypeName = resourceType === 'qemu' ? 'VM' : 'container';
      return failure(
        new ServiceError(`${resourceTypeName} with VMID ${vmid} not found`, {
          resourceType,
          vmid,
        }),
      );
    }

    // Check if IP address is available
    if (!resource.ipv4Address) {
      const resourceTypeName = resourceType === 'qemu' ? 'VM' : 'container';
      return failure(
        new ServiceError(
          `Cannot connect to ${resourceTypeName} ${vmid}: IP address not available. Ensure ${resourceTypeName} is running and guest agent is installed.`,
          {
            resourceType,
            vmid,
          },
        ),
      );
    }

    return success(resource.ipv4Address);
  }

  /**
   * Retrieves running VMs or containers for interactive selection.
   * @param resourceType Type of resource ('qemu' for VMs, 'lxc' for containers)
   * @returns Result containing array of running resources or ServiceError
   */
  async getRunningResources(
    resourceType: 'lxc' | 'qemu',
  ): Promise<Result<ProxmoxVMDTO[], ServiceError>> {
    // Fetch all resources from repository
    const resourcesResult = await this.repository.listResources(resourceType);

    if (!resourcesResult.success) {
      return failure(
        new ServiceError(`Failed to retrieve ${resourceType} resources from Proxmox API`, {
          cause: resourcesResult.error,
          resourceType,
        }),
      );
    }

    // Filter to only running resources
    const runningResources = resourcesResult.data.filter(
      (resource) => resource.status === 'running',
    );

    return success(runningResources);
  }
}
