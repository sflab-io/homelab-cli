import {getCliConfig} from '../config/cli.config.js'
import {ProxmoxRepository} from '../repositories/proxmox.repository.js'
import {ProxmoxTemplateService} from '../services/proxmox-template.service.js'

/**
 * Factory for creating Proxmox template service instances with dependencies.
 * Centralizes dependency composition and configuration.
 */
export const ProxmoxTemplateFactory = {
  /**
   * Creates a fully-configured ProxmoxTemplateService instance.
   * Loads configuration from environment and wires all dependencies.
   * @returns ProxmoxTemplateService with all dependencies wired
   * @throws Error if required Proxmox configuration fields are missing
   */
  createProxmoxTemplateService(): ProxmoxTemplateService {
    const cliConfig = getCliConfig()
    const config = cliConfig.get('proxmox')

    // Validate required Proxmox configuration fields
    if (!config.user) {
      throw new Error('PROXMOX_USER is required but not configured')
    }

    if (!config.realm) {
      throw new Error('PROXMOX_REALM is required but not configured')
    }

    if (!config.tokenKey) {
      throw new Error('PROXMOX_TOKEN_KEY is required but not configured')
    }

    if (!config.tokenSecret) {
      throw new Error('PROXMOX_TOKEN_SECRET is required but not configured')
    }

    if (!config.host) {
      throw new Error('PROXMOX_HOST is required but not configured')
    }

    const repository = new ProxmoxRepository(config as Required<typeof config>)
    return new ProxmoxTemplateService(repository)
  },
}
