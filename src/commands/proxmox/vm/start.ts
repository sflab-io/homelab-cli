import {Args} from '@oclif/core'

import {ProxmoxVMFactory} from '../../../factories/proxmox-vm.factory.js'
import {BaseCommand} from '../../../lib/base-command.js'
import {promptForMultipleSelections} from '../../../utils/prompts.js'

export default class ProxmoxVmStart extends BaseCommand<typeof ProxmoxVmStart> {
  static args = {
    vmids: Args.integer({
      description: 'VM IDs to start',
      required: false,
    }),
  }
  static description = 'Start one or more stopped Proxmox VMs'
  static examples = [
    `<%= config.bin %> <%= command.id %> 100
Starting VM 100...
Successfully started VM 100 'web-server' on node 'pve1'`,
    `<%= config.bin %> <%= command.id %> 100 101 102
Starting 3 VMs...
Successfully started 3 VMs`,
    `<%= config.bin %> <%= command.id %>
# Interactive mode - select VMs from list of stopped VMs`,
    `<%= config.bin %> <%= command.id %> 100 --json
{
  "vmid": 100,
  "name": "web-server",
  "node": "pve1",
  "status": "started"
}`,
  ]
  static strict = false

  async run(): Promise<
    | void
    | {failed: Array<{error: string; vmid: number}>; started: Array<{name: string; node: string; vmid: number}>}
    | {name: string; node: string; status: string; vmid: number}
  > {
    await this.parse(ProxmoxVmStart)

    const jsonMode = this.jsonEnabled()

    // Get VMIDs from arguments (variadic)
    // Parse argv as integers, filter out any invalid values
    const providedVmids = this.argv
      .map((arg) => Number.parseInt(arg, 10))
      .filter((vmid) => !Number.isNaN(vmid))

    // Get service
    const service = ProxmoxVMFactory.createProxmoxVMService()

    let vmidsToStart: number[] = []

    // Interactive mode if no VMIDs provided
    if (providedVmids.length === 0) {
      if (jsonMode) {
        this.error('JSON mode requires explicit VM IDs', {exit: 1})
      }

      // List all VMs
      const listResult = await service.listVMs('qemu')
      if (!listResult.success) {
        this.error(`Failed to list VMs: ${listResult.error.message}`, {exit: 1})
      }

      const vms = listResult.data

      // Filter for stopped VMs only
      const stoppedVms = vms.filter((vm) => vm.status === 'stopped')

      if (stoppedVms.length === 0) {
        this.log('No stopped VMs available to start')
        return
      }

      // Format choices for selection prompt
      const choices = stoppedVms.map((vm) =>
        `${vm.vmid} - ${vm.name} (${vm.node}, ${vm.status})`
      )

      // Prompt for VM selection
      const selectionResult = await promptForMultipleSelections({
        choices,
        message: 'Select VMs to start (use space to toggle, enter to confirm):',
      })

      if (!selectionResult.success) {
        this.log('Selection cancelled')
        return
      }

      // Extract VMIDs from selected choices
      vmidsToStart = selectionResult.data.map((choice) =>
        Number.parseInt(choice.split(' - ')[0], 10)
      )

      if (vmidsToStart.length === 0) {
        this.log('No VMs selected')
        return
      }
    } else {
      vmidsToStart = providedVmids
    }

    // Load VM details for all VMIDs
    const listResult = await service.listVMs('qemu')
    if (!listResult.success) {
      this.error(`Failed to list VMs: ${listResult.error.message}`, {exit: 1})
    }

    const allVms = listResult.data
    const vmsToStart = vmidsToStart
      .map((vmid) => allVms.find((vm) => vm.vmid === vmid))
      .filter((vm) => vm !== undefined)

    // Check if any VMIDs not found
    const notFoundVmids = vmidsToStart.filter((vmid) => !allVms.some((vm) => vm.vmid === vmid))

    if (notFoundVmids.length > 0) {
      const errorMsg = `VM${notFoundVmids.length > 1 ? 's' : ''} ${notFoundVmids.join(', ')} not found. Use 'homelab proxmox vm list' to see available VMs.`
      if (jsonMode) {
        return {
          failed: notFoundVmids.map((vmid) => ({error: 'VM not found', vmid})),
          started: [],
        }
      }

      this.error(errorMsg, {exit: 1})
    }

    // Start VMs sequentially
    const started: Array<{name: string; node: string; vmid: number}> = []
    const failed: Array<{error: string; vmid: number}> = []

    // Note: Sequential start with await in loop is intentional for safety
    // and to provide progress feedback. Parallel start could overwhelm
    // the Proxmox API and make error tracking difficult.
    /* eslint-disable no-await-in-loop */
    for (const [index, vm] of vmsToStart.entries()) {
      const {vmid} = vm

      // Show progress for multiple VMs (not in JSON mode)
      if (!jsonMode && vmsToStart.length > 1) {
        this.log(`[${index + 1}/${vmsToStart.length}] Starting VM ${vmid} '${vm.name}' on node '${vm.node}'...`)
      } else if (!jsonMode) {
        this.log(`Starting VM ${vmid} '${vm.name}' on node '${vm.node}'...`)
      }

      const startResult = await service.startVM(vmid)

      if (startResult.success) {
        started.push(startResult.data)
        if (!jsonMode && vmsToStart.length === 1) {
          this.log(`Successfully started VM ${vmid} '${startResult.data.name}' on node '${startResult.data.node}'`)
        }
      } else {
        failed.push({error: startResult.error.message, vmid})
        if (!jsonMode && vmsToStart.length === 1) {
          // Display error message as-is (it's already user-friendly from service layer)
          this.error(startResult.error.message, {exit: 1})
        }
      }
    }
    /* eslint-enable no-await-in-loop */

    // Handle JSON output
    if (jsonMode) {
      if (vmsToStart.length === 1) {
        if (started.length === 1) {
          return {
            name: started[0].name,
            node: started[0].node,
            status: 'started',
            vmid: started[0].vmid,
          }
        }

        return {
          failed,
          started: [],
        }
      }

      return {
        failed,
        started,
      }
    }

    // Display summary for multiple VMs
    if (vmsToStart.length > 1) {
      this.log('\nStart Summary:')
      this.log(`  Successful: ${started.length}`)
      this.log(`  Failed: ${failed.length}`)

      if (failed.length > 0) {
        this.log('\nFailed starts:')
        for (const fail of failed) {
          this.log(`  VM ${fail.vmid}: ${fail.error}`)
        }
      }
    }

    // Exit with error if any starts failed
    if (failed.length > 0) {
      this.error('Some VM starts failed', {exit: 1})
    }
  }
}
