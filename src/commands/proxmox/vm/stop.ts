import {Args} from '@oclif/core'

import {ProxmoxVMFactory} from '../../../factories/proxmox-vm.factory.js'
import {BaseCommand} from '../../../lib/base-command.js'
import {promptForMultipleSelections} from '../../../utils/prompts.js'

export default class ProxmoxVmStop extends BaseCommand<typeof ProxmoxVmStop> {
  static args = {
    vmids: Args.integer({
      description: 'VM IDs to stop',
      required: false,
    }),
  }
  static description = 'Stop one or more running Proxmox VMs'
  static examples = [
    `<%= config.bin %> <%= command.id %> 100
Stopping VM 100...
Successfully stopped VM 100 'web-server' on node 'pve1'`,
    `<%= config.bin %> <%= command.id %> 100 101 102
Stopping 3 VMs...
Successfully stopped 3 VMs`,
    `<%= config.bin %> <%= command.id %>
# Interactive mode - select VMs from list of running VMs`,
    `<%= config.bin %> <%= command.id %> 100 --json
{
  "vmid": 100,
  "name": "web-server",
  "node": "pve1",
  "status": "stopped"
}`,
  ]
  static strict = false

  async run(): Promise<
    | void
    | {failed: Array<{error: string; vmid: number}>; stopped: Array<{name: string; node: string; vmid: number}>}
    | {name: string; node: string; status: string; vmid: number}
  > {
    await this.parse(ProxmoxVmStop)

    const jsonMode = this.jsonEnabled()

    // Get VMIDs from arguments (variadic)
    // Parse argv as integers, filter out any invalid values
    const providedVmids = this.argv
      .map((arg) => Number.parseInt(arg, 10))
      .filter((vmid) => !Number.isNaN(vmid))

    // Get service
    const service = ProxmoxVMFactory.createProxmoxVMService()

    let vmidsToStop: number[] = []

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

      // Filter for running VMs only
      const runningVms = vms.filter((vm) => vm.status === 'running')

      if (runningVms.length === 0) {
        this.log('No running VMs available to stop')
        return
      }

      // Format choices for selection prompt
      const choices = runningVms.map((vm) =>
        `${vm.vmid} - ${vm.name} (${vm.node}, ${vm.status})`
      )

      // Prompt for VM selection
      const selectionResult = await promptForMultipleSelections({
        choices,
        message: 'Select VMs to stop (use space to toggle, enter to confirm):',
      })

      if (!selectionResult.success) {
        this.log('Selection cancelled')
        return
      }

      // Extract VMIDs from selected choices
      vmidsToStop = selectionResult.data.map((choice) =>
        Number.parseInt(choice.split(' - ')[0], 10)
      )

      if (vmidsToStop.length === 0) {
        this.log('No VMs selected')
        return
      }
    } else {
      vmidsToStop = providedVmids
    }

    // Load VM details for all VMIDs
    const listResult = await service.listVMs('qemu')
    if (!listResult.success) {
      this.error(`Failed to list VMs: ${listResult.error.message}`, {exit: 1})
    }

    const allVms = listResult.data
    const vmsToStop = vmidsToStop
      .map((vmid) => allVms.find((vm) => vm.vmid === vmid))
      .filter((vm) => vm !== undefined)

    // Check if any VMIDs not found
    const notFoundVmids = vmidsToStop.filter((vmid) => !allVms.some((vm) => vm.vmid === vmid))

    if (notFoundVmids.length > 0) {
      const errorMsg = `VM${notFoundVmids.length > 1 ? 's' : ''} ${notFoundVmids.join(', ')} not found. Use 'homelab proxmox vm list' to see available VMs.`
      if (jsonMode) {
        return {
          failed: notFoundVmids.map((vmid) => ({error: 'VM not found', vmid})),
          stopped: [],
        }
      }

      this.error(errorMsg, {exit: 1})
    }

    // Stop VMs sequentially
    const stopped: Array<{name: string; node: string; vmid: number}> = []
    const failed: Array<{error: string; vmid: number}> = []

    // Note: Sequential stop with await in loop is intentional for safety
    // and to provide progress feedback. Parallel stop could overwhelm
    // the Proxmox API and make error tracking difficult.
    /* eslint-disable no-await-in-loop */
    for (const [index, vm] of vmsToStop.entries()) {
      const {vmid} = vm

      // Show progress for multiple VMs (not in JSON mode)
      if (!jsonMode && vmsToStop.length > 1) {
        this.log(`[${index + 1}/${vmsToStop.length}] Stopping VM ${vmid} '${vm.name}' on node '${vm.node}'...`)
      } else if (!jsonMode) {
        this.log(`Stopping VM ${vmid} '${vm.name}' on node '${vm.node}'...`)
      }

      const stopResult = await service.stopVM(vmid)

      if (stopResult.success) {
        stopped.push(stopResult.data)
        if (!jsonMode && vmsToStop.length === 1) {
          this.log(`Successfully stopped VM ${vmid} '${stopResult.data.name}' on node '${stopResult.data.node}'`)
        }
      } else {
        failed.push({error: stopResult.error.message, vmid})
        if (!jsonMode && vmsToStop.length === 1) {
          // Display error message as-is (it's already user-friendly from service layer)
          this.error(stopResult.error.message, {exit: 1})
        }
      }
    }
    /* eslint-enable no-await-in-loop */

    // Handle JSON output
    if (jsonMode) {
      if (vmsToStop.length === 1) {
        if (stopped.length === 1) {
          return {
            name: stopped[0].name,
            node: stopped[0].node,
            status: 'stopped',
            vmid: stopped[0].vmid,
          }
        }

        return {
          failed,
          stopped: [],
        }
      }

      return {
        failed,
        stopped,
      }
    }

    // Display summary for multiple VMs
    if (vmsToStop.length > 1) {
      this.log('\nStop Summary:')
      this.log(`  Successful: ${stopped.length}`)
      this.log(`  Failed: ${failed.length}`)

      if (failed.length > 0) {
        this.log('\nFailed stops:')
        for (const fail of failed) {
          this.log(`  VM ${fail.vmid}: ${fail.error}`)
        }
      }
    }

    // Exit with error if any stops failed
    if (failed.length > 0) {
      this.error('Some VM stops failed', {exit: 1})
    }
  }
}
