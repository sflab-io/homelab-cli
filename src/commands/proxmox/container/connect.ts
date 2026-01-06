import {Args, Flags} from '@oclif/core';

import {ProxmoxSSHFactory} from '../../../factories/proxmox-ssh.factory.js';
import {BaseCommand} from '../../../lib/base-command.js';
import {promptForSelection} from '../../../utils/prompts.js';

export default class ProxmoxContainerConnect extends BaseCommand<typeof ProxmoxContainerConnect> {
  static args = {
    vmid: Args.integer({
      description: 'VMID of the container to connect to (optional, prompts if not provided)',
      required: false,
    }),
  };
  static description = 'Establish SSH connection to a Proxmox LXC container';
  static examples = [
    {
      command: '<%= config.bin %> <%= command.id %>',
      description: 'Interactively select a running container to connect to',
    },
    {
      command: '<%= config.bin %> <%= command.id %> 200',
      description: 'Connect to container with VMID 200 using default credentials',
    },
    {
      command: '<%= config.bin %> <%= command.id %> 200 --user root',
      description: 'Connect to container with VMID 200 as root user',
    },
    {
      command: '<%= config.bin %> <%= command.id %> 200 --key ~/.ssh/custom_key',
      description: 'Connect to container with VMID 200 using custom SSH key',
    },
    {
      command: '<%= config.bin %> <%= command.id %> 200 --user ubuntu --key ~/.ssh/id_rsa',
      description: 'Connect to container with VMID 200 using custom user and SSH key',
    },
  ];
  static flags = {
    key: Flags.string({
      char: 'k',
      default: '~/.ssh/admin_id_ecdsa',
      description: 'Path to SSH private key',
    }),
    user: Flags.string({
      char: 'u',
      default: 'root',
      description: 'SSH username',
    }),
  };

  async run(): Promise<void> {
    await this.parse(ProxmoxContainerConnect);

    let {vmid} = this.args;
    const {key, user} = this.flags;

    // Create SSH service using factory
    const sshService = ProxmoxSSHFactory.createProxmoxSSHService();

    // If VMID not provided, prompt user to select from running containers
    if (vmid === undefined) {
      const runningResult = await sshService.getRunningResources('lxc');

      if (!runningResult.success) {
        this.error(runningResult.error.message, {exit: 1});
      }

      if (runningResult.data.length === 0) {
        this.error(
          'No running containers found. Start a container first or provide a VMID explicitly.',
          {exit: 1},
        );
      }

      // Format choices for selection prompt
      const choices = runningResult.data.map((container) => {
        const ipDisplay = container.ipv4Address ?? 'No IP';
        return `${container.vmid} - ${container.name} (${ipDisplay})`;
      });

      // Show selection prompt
      const selectionResult = await promptForSelection({
        choices,
        message: 'Select a container to connect to:',
      });

      if (!selectionResult.success) {
        // User cancelled (Ctrl+C)
        this.log('Selection cancelled.');
        return;
      }

      // Extract VMID from selected choice
      vmid = Number.parseInt(selectionResult.data.split(' - ')[0], 10);
    }

    // Check connection method first to display appropriate message
    const ipResult = await sshService.getResourceIPAddress(vmid, 'lxc');

    if (ipResult.success) {
      // IP available - use IP-based connection
      this.log(`Connecting to container ${vmid} as ${user}...`);
    } else {
      // IP not available - try FQDN fallback
      this.log(`IP address not available for container ${vmid}, trying FQDN fallback...`);

      const fqdnResult = await sshService.getResourceFQDN(vmid, 'lxc');

      if (fqdnResult.success) {
        this.log(`Connecting to container ${vmid} (${fqdnResult.data}) as ${user}...`);
      }
    }

    // Establish SSH connection (will handle fallback internally)
    const result = await sshService.connectSSH(vmid, 'lxc', user, key);

    if (!result.success) {
      this.error(result.error.message, {exit: 1});
    }

    // SSH session completed successfully
    this.log('SSH session closed.');
  }
}
