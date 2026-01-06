import {getCliConfig} from '../config/cli.config.js';
import {ProxmoxRepository} from '../repositories/proxmox.repository.js';
import {ProxmoxSSHService} from '../services/proxmox-ssh.service.js';

/**
 * Factory for creating Proxmox SSH service instances with dependencies.
 * Centralizes dependency composition and configuration.
 */
export const ProxmoxSSHFactory = {
  /**
   * Creates a fully-configured ProxmoxSSHService instance.
   * Loads configuration from environment and wires all dependencies.
   * @returns ProxmoxSSHService with all dependencies wired
   * @throws Error if required Proxmox configuration fields are missing
   */
  createProxmoxSSHService(): ProxmoxSSHService {
    const cliConfig = getCliConfig();
    const config = cliConfig.get('proxmox');

    // Validate required Proxmox configuration fields
    if (!config.user) {
      throw new Error('PROXMOX_USER is required but not configured');
    }

    if (!config.realm) {
      throw new Error('PROXMOX_REALM is required but not configured');
    }

    if (!config.tokenKey) {
      throw new Error('PROXMOX_TOKEN_KEY is required but not configured');
    }

    if (!config.tokenSecret) {
      throw new Error('PROXMOX_TOKEN_SECRET is required but not configured');
    }

    if (!config.host) {
      throw new Error('PROXMOX_HOST is required but not configured');
    }

    const repository = new ProxmoxRepository(config as Required<typeof config>);
    return new ProxmoxSSHService(repository);
  },
};
