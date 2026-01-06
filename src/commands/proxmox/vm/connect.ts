import {Args, Flags} from '@oclif/core';

import {ProxmoxSSHFactory} from '../../../factories/proxmox-ssh.factory.js';
import {BaseCommand} from '../../../lib/base-command.js';

export default class ProxmoxVMConnect extends BaseCommand<typeof ProxmoxVMConnect> {
  static args = {
    vmid: Args.integer({
      description: 'VMID of the VM to connect to',
      required: true,
    }),
  };
  static description = 'Establish SSH connection to a Proxmox VM';
  static examples = [
    {
      command: '<%= config.bin %> <%= command.id %> 100',
      description: 'Connect to VM with VMID 100 using default credentials',
    },
    {
      command: '<%= config.bin %> <%= command.id %> 100 --user root',
      description: 'Connect to VM with VMID 100 as root user',
    },
    {
      command: '<%= config.bin %> <%= command.id %> 100 --key ~/.ssh/custom_key',
      description: 'Connect to VM with VMID 100 using custom SSH key',
    },
    {
      command: '<%= config.bin %> <%= command.id %> 100 --user ubuntu --key ~/.ssh/id_rsa',
      description: 'Connect to VM with VMID 100 using custom user and SSH key',
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
      default: 'admin',
      description: 'SSH username',
    }),
  };

  async run(): Promise<void> {
    await this.parse(ProxmoxVMConnect);

    const {vmid} = this.args;
    const {key, user} = this.flags;

    // Create SSH service using factory
    const sshService = ProxmoxSSHFactory.createProxmoxSSHService();

    this.log(`Connecting to VM ${vmid} as ${user}...`);

    // Establish SSH connection
    const result = await sshService.connectSSH(vmid, 'qemu', user, key);

    if (!result.success) {
      this.error(result.error.message, {exit: 1});
    }

    // SSH session completed successfully
    this.log('SSH session closed.');
  }
}
