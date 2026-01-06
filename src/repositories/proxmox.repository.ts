import proxmoxApi from 'proxmox-api';

import { RepositoryError } from '../errors/repository.error.js';
import { type ProxmoxTemplateDTO } from '../models/proxmox-template.dto.js';
import { type ProxmoxVMDTO } from '../models/proxmox-vm.dto.js';
import { type RequiredProxmoxConfig } from '../models/schemas/cli-config.schema.js';
import { logDebugError } from '../utils/debug-logger.js';
import { failure, type Result, success } from '../utils/result.js';
import { type IProxmoxRepository } from './interfaces/proxmox.repository.interface.js';


/**
 * Implementation of Proxmox repository using proxmox-api npm package.
 * Provides an alternative implementation to the fetch-based repository.
 */
export class ProxmoxRepository implements IProxmoxRepository {
  private readonly config: RequiredProxmoxConfig;

  constructor(config: RequiredProxmoxConfig) {
    this.config = config;
  }

  /**
   * Clones a VM template to create a new VM using full clone mode.
   * @param node Node where template resides
   * @param templateVmid VMID of the template to clone
   * @param newVmid VMID for the new VM
   * @param vmName Name for the new VM
   * @returns Result containing task UPID or an error
   */
  async cloneFromTemplate(
    node: string,
    templateVmid: number,
    newVmid: number,
    vmName: string,
  ): Promise<Result<string, RepositoryError>> {
    try {
      // Construct tokenID from user@realm!tokenKey format
      const tokenID = `${this.config.user}@${this.config.realm}!${this.config.tokenKey}`;
      const { tokenSecret } = this.config;

      // Disable SSL verification for self-signed certificates if configured
      if (!this.config.rejectUnauthorized) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      }

      // Create proxmox client with token authentication
      const proxmox = proxmoxApi({
        host: this.config.host,
        port: this.config.port,
        tokenID,
        tokenSecret,
      });

      // Clone the template: POST /nodes/{node}/qemu/{vmid}/clone
      // Using full clone mode (full: true)
      const response = await proxmox.nodes.$(node).qemu.$(templateVmid).clone.$post({
        full: true,
        name: vmName,
        newid: newVmid,
      });

      // Response should contain task UPID
      if (!response || typeof response !== 'string') {
        return failure(new RepositoryError('Unexpected API response format from clone operation'));
      }

      return success(response);
    } catch (error) {
      logDebugError('Proxmox API error during cloneFromTemplate', error, {
        host: this.config.host,
        newVmid,
        node,
        port: this.config.port,
        templateVmid,
        vmName,
      });

      return failure(
        new RepositoryError('Failed to clone VM from template', {
          cause: error instanceof Error ? error : undefined,
          context: {
            message: error instanceof Error ? error.message : 'Unknown error',
            newVmid,
            node,
            templateVmid,
            vmName,
          },
        }),
      );
    }
  }

  /**
   * Deletes a VM and all its owned volumes.
   * This operation destroys the VM permanently and cannot be undone.
   * @param node Node where VM resides
   * @param vmid VM ID to delete
   * @returns Result containing task UPID for async operation tracking or an error
   */
  async deleteVM(node: string, vmid: number): Promise<Result<string, RepositoryError>> {
    try {
      // Construct tokenID from user@realm!tokenKey format
      const tokenID = `${this.config.user}@${this.config.realm}!${this.config.tokenKey}`;
      const { tokenSecret } = this.config;

      // Disable SSL verification for self-signed certificates if configured
      if (!this.config.rejectUnauthorized) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      }

      // Create proxmox client with token authentication
      const proxmox = proxmoxApi({
        host: this.config.host,
        port: this.config.port,
        tokenID,
        tokenSecret,
      });

      // Delete the VM: DELETE /nodes/{node}/qemu/{vmid}
      const response = await proxmox.nodes.$(node).qemu.$(vmid).$delete();

      // Response should contain task UPID
      if (!response || typeof response !== 'string') {
        return failure(new RepositoryError('Unexpected API response format from delete operation'));
      }

      return success(response);
    } catch (error) {
      logDebugError('Proxmox API error during deleteVM', error, {
        host: this.config.host,
        node,
        port: this.config.port,
        vmid,
      });

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Check if VM is running (common error that needs user action)
      if (errorMessage.includes('is running') || errorMessage.includes('destroy failed')) {
        return failure(
          new RepositoryError(`Delete failed: VM ${vmid} is running - Stop the VM and rerun the delete command`, {
            cause: error instanceof Error ? error : undefined,
            context: {
              node,
              vmid,
            },
          }),
        );
      }

      return failure(
        new RepositoryError(`Failed to delete VM: ${errorMessage}`, {
          cause: error instanceof Error ? error : undefined,
          context: {
            node,
            vmid,
          },
        }),
      );
    }
  }

  /**
   * Finds the next available VMID in the Proxmox cluster.
   * Searches for gaps in the VMID sequence starting from 100 (Proxmox convention).
   * @returns Result containing next available VMID or an error
   */
  async getNextAvailableVmid(): Promise<Result<number, RepositoryError>> {
    try {
      // Construct tokenID from user@realm!tokenKey format
      const tokenID = `${this.config.user}@${this.config.realm}!${this.config.tokenKey}`;
      const { tokenSecret } = this.config;

      // Disable SSL verification for self-signed certificates if configured
      if (!this.config.rejectUnauthorized) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      }

      // Create proxmox client with token authentication
      const proxmox = proxmoxApi({
        host: this.config.host,
        port: this.config.port,
        tokenID,
        tokenSecret,
      });

      // Get all VMs and templates from cluster resources
      const response = await proxmox.cluster.resources.$get({ type: 'vm' });

      // Validate response
      if (!response || !Array.isArray(response)) {
        return failure(new RepositoryError('Unexpected API response format when fetching cluster resources'));
      }

      // Extract all VMIDs and sort them
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const vmids = (response as any[])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((resource: any) => resource.vmid)
        .filter((vmid: number) => typeof vmid === 'number')
        .sort((a: number, b: number) => a - b);

      // If no VMs exist, start from 100 (Proxmox convention)
      if (vmids.length === 0) {
        return success(100);
      }

      // Find first gap >= 100, or return max + 1
      const minVmid = 100;
      for (let i = 0; i < vmids.length; i++) {
        const currentVmid = vmids[i];
        const expectedVmid = i === 0 ? minVmid : vmids[i - 1] + 1;

        // If there's a gap and the gap is >= minVmid, use it
        if (currentVmid > expectedVmid && expectedVmid >= minVmid) {
          return success(expectedVmid);
        }

        // If current VMID is below min, check if next slot (min) is available
        if (currentVmid < minVmid && (i === vmids.length - 1 || vmids[i + 1] > minVmid)) {
          return success(minVmid);
        }
      }

      // No gaps found, return max + 1
      const maxVmid = vmids.at(-1);
      return success(Math.max(maxVmid + 1, minVmid));
    } catch (error) {
      logDebugError('Proxmox API error during getNextAvailableVmid', error, {
        host: this.config.host,
        port: this.config.port,
      });

      return failure(
        new RepositoryError('Failed to fetch cluster resources for VMID allocation', {
          cause: error instanceof Error ? error : undefined,
          context: {
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        }),
      );
    }
  }

  /**
   * Retrieves resources (VMs or LXC containers) from Proxmox API with network information.
   * @param resourceType Type of resource to list: 'qemu' for VMs or 'lxc' for containers
   * @returns Result containing array of resources or an error
   */
  async listResources(resourceType: 'lxc' | 'qemu'): Promise<Result<ProxmoxVMDTO[], RepositoryError>> {
    try {
      // Construct tokenID from user@realm!tokenKey format
      const tokenID = `${this.config.user}@${this.config.realm}!${this.config.tokenKey}`;
      const { tokenSecret } = this.config;

      // Disable SSL verification for self-signed certificates if configured
      if (!this.config.rejectUnauthorized) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      }

      // Create proxmox client with token authentication
      const proxmox = proxmoxApi({
        host: this.config.host,
        port: this.config.port,
        tokenID,
        tokenSecret,
      });

      // Get cluster resources (type=vm)
      const response = await proxmox.cluster.resources.$get({ type: 'vm' });

      // Validate response - proxmox-api returns array directly
      if (!response || !Array.isArray(response)) {
        return failure(new RepositoryError('Unexpected API response format'));
      }

      // Filter resources based on type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resources = (response as any[]).filter((resource: any) =>
        // For QEMU: filter by type 'qemu' and exclude templates
        // For LXC: filter by type 'lxc'
        resourceType === 'qemu'
          ? resource.type === 'qemu' && resource.template !== 1
          : resource.type === 'lxc',
      );

      // Process each resource to get network information
      const resourcesWithNetworkInfo: ProxmoxVMDTO[] = [];

      for (const resource of resources) {
        // Sequential processing is intentional to avoid overwhelming the API
        // eslint-disable-next-line no-await-in-loop
        const ipv4Address = await this.fetchVMIPAddress(proxmox, resource.node, resource.vmid, resourceType);

        resourcesWithNetworkInfo.push({
          ipv4Address,
          name: resource.name || '',
          node: resource.node || '',
          status: resource.status || '',
          vmid: resource.vmid || 0,
        });
      }

      return success(resourcesWithNetworkInfo);
    } catch (error) {
      logDebugError(`Proxmox API error during listResources (${resourceType})`, error, {
        host: this.config.host,
        port: this.config.port,
        resourceType,
      });

      return failure(
        new RepositoryError(`Failed to retrieve ${resourceType} resources from Proxmox API`, {
          cause: error instanceof Error ? error : undefined,
          context: {
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        }),
      );
    }
  }

  /**
   * Retrieves all VM templates from Proxmox API using proxmox-api package.
   * @returns Result containing array of templates or an error
   */
  async listTemplates(): Promise<Result<ProxmoxTemplateDTO[], RepositoryError>> {
    try {
      // Construct tokenID from user@realm!tokenKey format
      const tokenID = `${this.config.user}@${this.config.realm}!${this.config.tokenKey}`;
      const { tokenSecret } = this.config;

      // Disable SSL verification for self-signed certificates if configured
      if (!this.config.rejectUnauthorized) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      }

      // Create proxmox client with token authentication
      const proxmox = proxmoxApi({
        host: this.config.host,
        port: this.config.port,
        tokenID,
        tokenSecret,
      });

      // Get cluster resources (type=vm)
      const response = await proxmox.cluster.resources.$get({ type: 'vm' });

      // Validate response - proxmox-api returns array directly
      if (!response || !Array.isArray(response)) {
        return failure(new RepositoryError('Unexpected API response format'));
      }

      // Filter and map to templates only (template === 1)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const templates: ProxmoxTemplateDTO[] = (response as any[])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((resource: any) => resource.template === 1)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((resource: any) => ({
          name: resource.name || '',
          node: resource.node || '',
          template: 1 as const,
          vmid: resource.vmid || 0,
        }));

      return success(templates);
    } catch (error) {
      logDebugError('Proxmox API error during listTemplates', error, {
        host: this.config.host,
        port: this.config.port,
        // Exclude sensitive data: tokenSecret, tokenKey
      });

      return failure(
        new RepositoryError('Failed to connect to Proxmox API', {
          cause: error instanceof Error ? error : undefined,
          context: {
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        }),
      );
    }
  }

  /**
   * Sets configuration parameters for a VM via Proxmox API.
   * Used for cloud-init and other VM configuration settings.
   * @param node Node where VM resides
   * @param vmid VM ID
   * @param config Configuration parameters as key-value pairs
   * @returns Result indicating success or error
   */
  async setVMConfig(
    node: string,
    vmid: number,
    config: Record<string, boolean | number | string>,
  ): Promise<Result<void, RepositoryError>> {
    try {
      // Construct tokenID from user@realm!tokenKey format
      const tokenID = `${this.config.user}@${this.config.realm}!${this.config.tokenKey}`;
      const { tokenSecret } = this.config;

      // Disable SSL verification for self-signed certificates if configured
      if (!this.config.rejectUnauthorized) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      }

      // Create proxmox client with token authentication
      const proxmox = proxmoxApi({
        host: this.config.host,
        port: this.config.port,
        tokenID,
        tokenSecret,
      });

      // Set VM configuration: PUT /nodes/{node}/qemu/{vmid}/config
      await proxmox.nodes.$(node).qemu.$(vmid).config.$put(config);

      // eslint-disable-next-line unicorn/no-useless-undefined
      return success(undefined);
    } catch (error) {
      logDebugError('Proxmox API error during setVMConfig', error, {
        config,
        host: this.config.host,
        node,
        port: this.config.port,
        vmid,
      });

      return failure(
        new RepositoryError('Failed to set VM configuration', {
          cause: error instanceof Error ? error : undefined,
          context: {
            config,
            message: error instanceof Error ? error.message : 'Unknown error',
            node,
            vmid,
          },
        }),
      );
    }
  }

  /**
   * Starts a stopped Proxmox VM.
   * @param node Node where VM resides
   * @param vmid VM ID to start
   * @returns Result containing task UPID for async operation tracking or an error
   */
  async startVM(node: string, vmid: number): Promise<Result<string, RepositoryError>> {
    try {
      // Construct tokenID from user@realm!tokenKey format
      const tokenID = `${this.config.user}@${this.config.realm}!${this.config.tokenKey}`;
      const { tokenSecret } = this.config;

      // Disable SSL verification for self-signed certificates if configured
      if (!this.config.rejectUnauthorized) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      }

      // Create proxmox client with token authentication
      const proxmox = proxmoxApi({
        host: this.config.host,
        port: this.config.port,
        tokenID,
        tokenSecret,
      });

      // Start the VM: POST /nodes/{node}/qemu/{vmid}/status/start
      const response = await proxmox.nodes.$(node).qemu.$(vmid).status.start.$post();

      // Response should contain task UPID
      if (!response || typeof response !== 'string') {
        return failure(new RepositoryError('Unexpected API response format from start operation'));
      }

      return success(response);
    } catch (error) {
      logDebugError('Proxmox API error during startVM', error, {
        host: this.config.host,
        node,
        port: this.config.port,
        vmid,
      });

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return failure(
        new RepositoryError(`Failed to start VM: ${errorMessage}`, {
          cause: error instanceof Error ? error : undefined,
          context: {
            node,
            vmid,
          },
        }),
      );
    }
  }

  /**
   * Stops a running Proxmox VM using graceful shutdown.
   * @param node Node where VM resides
   * @param vmid VM ID to stop
   * @returns Result containing task UPID for async operation tracking or an error
   */
  async stopVM(node: string, vmid: number): Promise<Result<string, RepositoryError>> {
    try {
      // Construct tokenID from user@realm!tokenKey format
      const tokenID = `${this.config.user}@${this.config.realm}!${this.config.tokenKey}`;
      const { tokenSecret } = this.config;

      // Disable SSL verification for self-signed certificates if configured
      if (!this.config.rejectUnauthorized) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      }

      // Create proxmox client with token authentication
      const proxmox = proxmoxApi({
        host: this.config.host,
        port: this.config.port,
        tokenID,
        tokenSecret,
      });

      // Stop the VM: POST /nodes/{node}/qemu/{vmid}/status/stop
      const response = await proxmox.nodes.$(node).qemu.$(vmid).status.stop.$post();

      // Response should contain task UPID
      if (!response || typeof response !== 'string') {
        return failure(new RepositoryError('Unexpected API response format from stop operation'));
      }

      return success(response);
    } catch (error) {
      logDebugError('Proxmox API error during stopVM', error, {
        host: this.config.host,
        node,
        port: this.config.port,
        vmid,
      });

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return failure(
        new RepositoryError(`Failed to stop VM: ${errorMessage}`, {
          cause: error instanceof Error ? error : undefined,
          context: {
            node,
            vmid,
          },
        }),
      );
    }
  }

  /**
   * Waits for a Proxmox task to complete with timeout support.
   * Polls the task status endpoint every 2 seconds until completion or timeout.
   * @param node Node where task is running
   * @param upid Task UPID
   * @param timeoutMs Timeout in milliseconds (default 300000 = 5 minutes)
   * @returns Result indicating success or error
   */
  async waitForTask(node: string, upid: string, timeoutMs = 300_000): Promise<Result<void, RepositoryError>> {
    try {
      // Construct tokenID from user@realm!tokenKey format
      const tokenID = `${this.config.user}@${this.config.realm}!${this.config.tokenKey}`;
      const { tokenSecret } = this.config;

      // Disable SSL verification for self-signed certificates if configured
      if (!this.config.rejectUnauthorized) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      }

      // Create proxmox client with token authentication
      const proxmox = proxmoxApi({
        host: this.config.host,
        port: this.config.port,
        tokenID,
        tokenSecret,
      });

      const startTime = Date.now();
      const pollInterval = 2000; // 2 seconds

      // Poll until task completes or timeout
      while (true) {
        // Check timeout
        if (Date.now() - startTime > timeoutMs) {
          return failure(
            new RepositoryError(`Task timed out after ${timeoutMs}ms`, {
              context: {
                node,
                timeoutMs,
                upid,
              },
            }),
          );
        }

        // Get task status: GET /nodes/{node}/tasks/{upid}/status
        // eslint-disable-next-line no-await-in-loop
        const taskStatus = await proxmox.nodes.$(node).tasks.$(upid).status.$get();

        // Check if task status was returned
        // Note: proxmox-api returns the data directly, not wrapped in a 'data' property
        if (!taskStatus) {
          // Wait before next poll if no task status
          // eslint-disable-next-line no-await-in-loop
          await new Promise((resolve) => {
            setTimeout(resolve, pollInterval);
          });
          continue;
        }

        const { exitstatus, status } = taskStatus;

        // If task is still running, continue polling
        if (status === 'running') {
          // Wait before next poll
          // eslint-disable-next-line no-await-in-loop
          await new Promise((resolve) => {
            setTimeout(resolve, pollInterval);
          });
          continue;
        }

        // Task is not running anymore, check exit status
        if (exitstatus === 'OK') {
          // eslint-disable-next-line unicorn/no-useless-undefined
          return success(undefined);
        }

        return failure(
          new RepositoryError(`Task failed: ${exitstatus || 'unknown error'}`, {
            context: {
              exitstatus,
              node,
              upid,
            },
          }),
        );
      }
    } catch (error) {
      logDebugError('Proxmox API error during waitForTask', error, {
        host: this.config.host,
        node,
        port: this.config.port,
        upid,
      });

      return failure(
        new RepositoryError('Failed to poll task status', {
          cause: error instanceof Error ? error : undefined,
          context: {
            message: error instanceof Error ? error.message : 'Unknown error',
            node,
            upid,
          },
        }),
      );
    }
  }

  /**
   * Extracts IPv4 address from a network interface object.
   * @param iface Network interface object
   * @returns IPv4 address or null
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractIPv4FromInterface(iface: any): null | string {
    if (iface['ip-addresses'] && Array.isArray(iface['ip-addresses'])) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const addr of iface['ip-addresses'] as any[]) {
        // Look for IPv4 addresses only
        if (addr['ip-address-type'] === 'ipv4' && addr['ip-address']) {
          return addr['ip-address'];
        }
      }
    }

    return null;
  }

  /**
   * Fetches the primary IPv4 address for a resource (VM or LXC) from the guest agent.
   * Returns null if guest agent is not available or no IPv4 address is found.
   * @param proxmox Proxmox API client
   * @param node Node name where resource is hosted
   * @param vmid Virtual Machine or Container ID
   * @param resourceType Type of resource ('qemu' or 'lxc')
   * @returns Primary IPv4 address or null
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async fetchVMIPAddress(proxmox: any, node: string, vmid: number, resourceType: 'lxc' | 'qemu'): Promise<null | string> {
    try {
      // Call guest agent to get network interfaces
      // Use dynamic path based on resource type: /nodes/{node}/{resourceType}/{vmid}/agent/network-get-interfaces
      const networkInfo = await proxmox.nodes.$(node)[resourceType].$(vmid).agent['network-get-interfaces'].$get();

      if (!networkInfo || !networkInfo.result || !Array.isArray(networkInfo.result)) {
        return null;
      }

      // Find the first non-loopback interface with an IPv4 address
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const iface of networkInfo.result as any[]) {
        // Skip loopback interfaces
        if (iface.name && iface.name.toLowerCase().includes('lo')) {
          continue;
        }

        // Check if interface has IP addresses and find IPv4
        const ipv4 = this.extractIPv4FromInterface(iface);
        if (ipv4) {
          return ipv4;
        }
      }

      return null;
    } catch {
      // Guest agent may not be installed or resource may be stopped
      // Return null instead of failing the entire operation
      return null;
    }
  }
}
