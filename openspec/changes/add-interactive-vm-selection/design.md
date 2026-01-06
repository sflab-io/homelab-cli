# Design: Interactive VM/Container Selection

## Architecture Overview
This change enhances the SSH connection commands with interactive prompts while maintaining the existing layered architecture pattern (Command → Service → Repository).

## Component Design

### 1. Service Layer Enhancement

**New Method: `ProxmoxSSHService.getRunningResources()`**

```typescript
/**
 * Retrieves running VMs or containers for interactive selection.
 * @param resourceType Type of resource ('qemu' for VMs, 'lxc' for containers)
 * @returns Result containing array of running resources or ServiceError
 */
async getRunningResources(
  resourceType: 'qemu' | 'lxc'
): Promise<Result<ProxmoxVMDTO[], ServiceError>>
```

**Responsibilities:**
- Delegate to repository's `listResources(resourceType)`
- Filter results to only include resources where `status === 'running'`
- Return filtered list via Result pattern

**Rationale:**
- Keeps filtering logic in service layer (business logic)
- Repository remains agnostic to filtering criteria
- Service layer is responsible for "running" concept
- Reusable for future features requiring running resources

### 2. Command Layer Changes

**Modified Commands:**
- `src/commands/proxmox/vm/connect.ts`
- `src/commands/proxmox/container/connect.ts`

**Key Changes:**

1. **Argument Requirement**
```typescript
// Before
static args = {
  vmid: Args.integer({
    description: 'VMID of the VM to connect to',
    required: true,  // ← Change this
  }),
};

// After
static args = {
  vmid: Args.integer({
    description: 'VMID of the VM to connect to (optional, prompts if not provided)',
    required: false,  // ← Now optional
  }),
};
```

2. **Run Method Logic Flow**
```
┌─────────────────────────────┐
│ Parse arguments & flags     │
└──────────┬──────────────────┘
           │
           ▼
    ┌──────────────┐
    │ VMID given?  │
    └──┬────────┬──┘
       │        │
      Yes       No
       │        │
       │        ▼
       │  ┌──────────────────────────┐
       │  │ Call service.            │
       │  │ getRunningResources()    │
       │  └──────────┬───────────────┘
       │             │
       │             ▼
       │  ┌──────────────────────────┐
       │  │ Check if list is empty   │
       │  └──┬────────────────────┬──┘
       │     │                    │
       │    Empty             Not Empty
       │     │                    │
       │     ▼                    ▼
       │  ┌─────────┐  ┌────────────────────┐
       │  │ Error   │  │ Format choices &   │
       │  │ exit    │  │ show prompt        │
       │  └─────────┘  └─────────┬──────────┘
       │                          │
       │                          ▼
       │               ┌──────────────────────┐
       │               │ User selects or      │
       │               │ cancels (Ctrl+C)     │
       │               └──┬────────────────┬──┘
       │                  │                │
       │                Cancel          Select
       │                  │                │
       │                  ▼                ▼
       │            ┌─────────┐  ┌──────────────┐
       │            │ Exit 0  │  │ Extract VMID │
       │            └─────────┘  └──────┬───────┘
       │                                 │
       └─────────────────────────────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │ Continue with SSH    │
          │ connection (existing │
          │ logic unchanged)     │
          └──────────────────────┘
```

### 3. Prompt Design

**Choice Format:**
```typescript
// Format: "{vmid} - {name} ({ip})"
// Examples:
"100 - ubuntu-web (192.168.1.10)"
"102 - alpine-cache (192.168.1.12)"
"103 - debian-test (No IP)"  // When ipv4Address is null
```

**VMID Extraction:**
```typescript
// Parse selected string to extract VMID
const vmid = parseInt(selectedChoice.split(' - ')[0], 10);
```

**Prompt Configuration:**
```typescript
const result = await promptForSelection({
  message: 'Select a VM to connect to:',  // or "Select a container to connect to:"
  choices: formattedChoices,
});
```

### 4. Data Flow

```
User runs: homelab proxmox vm connect
                   ↓
         Command (no vmid arg)
                   ↓
    ProxmoxSSHService.getRunningResources('qemu')
                   ↓
    ProxmoxRepository.listResources('qemu')
                   ↓
         Proxmox API (fetch VMs)
                   ↓
    Service filters: status === 'running'
                   ↓
         Return to Command
                   ↓
       Format choices for prompt
                   ↓
    promptForSelection (enquirer)
                   ↓
         User selects VM
                   ↓
         Extract VMID
                   ↓
    ProxmoxSSHService.connectSSH(vmid, ...)
                   ↓
         SSH connection established
```

## Error Handling

### No Running Resources
```typescript
const runningResult = await service.getRunningResources(resourceType);

if (!runningResult.success) {
  this.error(runningResult.error.message, { exit: 1 });
}

if (runningResult.data.length === 0) {
  const resourceName = resourceType === 'qemu' ? 'VMs' : 'containers';
  this.error(
    `No running ${resourceName} found. Start a ${resourceName} first or provide a VMID explicitly.`,
    { exit: 1 }
  );
}
```

### User Cancellation
```typescript
const selectionResult = await promptForSelection({...});

if (!selectionResult.success) {
  // User pressed Ctrl+C - exit gracefully without error
  this.log('Selection cancelled.');
  return;  // Exit with code 0
}
```

### API/Network Errors
Existing error handling from `getRunningResources()` → service returns failure Result → command displays error and exits with code 1.

## Testing Strategy

### Unit Tests - Service Layer
**File:** `test/services/proxmox-ssh.service.test.ts`

Test `getRunningResources()`:
- Returns only running resources
- Filters out stopped resources
- Handles empty list
- Handles repository errors
- Preserves resource properties (vmid, name, ipAddress)

### Unit Tests - Command Layer
**Files:**
- `test/commands/proxmox/vm/connect.test.ts`
- `test/commands/proxmox/container/connect.test.ts`

Test scenarios:
- VMID provided → skip prompt, connect directly
- VMID not provided + running resources → show prompt
- VMID not provided + no running resources → show error
- User cancels prompt → exit gracefully
- Invalid VMID in selection → handle parsing errors

### Integration Considerations
- Mock `promptForSelection` in command tests to avoid interactive input
- Mock `ProxmoxSSHService` methods for command testing
- Service tests use mock repository (no real Proxmox API calls)

## Alternative Approaches Considered

### 1. Auto-connect if only one running resource
**Rejected:** Explicit user action is safer and more predictable. Auto-connect might surprise users.

### 2. Add `--interactive` flag instead of making vmid optional
**Rejected:** Adds cognitive overhead. Making vmid optional is more intuitive and discoverable.

### 3. Create separate `vm select` and `container select` commands
**Rejected:** Increases command surface area unnecessarily. Integration into existing commands is cleaner.

### 4. Filter running resources in repository layer
**Rejected:** Filtering is business logic and belongs in service layer. Repository should remain agnostic to filtering criteria.

## Dependencies

### Existing Components (No Changes)
- `src/utils/prompts.ts` - `promptForSelection()` function
- `src/repositories/interfaces/proxmox.repository.interface.ts` - `listResources()` method
- `src/models/proxmox-vm.dto.ts` - ProxmoxVMDTO structure

### Modified Components
- `src/services/proxmox-ssh.service.ts` - Add `getRunningResources()` method
- `src/commands/proxmox/vm/connect.ts` - Add prompt logic, make vmid optional
- `src/commands/proxmox/container/connect.ts` - Add prompt logic, make vmid optional

### Test Files
- `test/services/proxmox-ssh.service.test.ts` - Add tests for new method
- `test/commands/proxmox/vm/connect.test.ts` - Add tests for prompt scenarios
- `test/commands/proxmox/container/connect.test.ts` - Add tests for prompt scenarios

## Performance Considerations

### API Call Impact
- **With VMID**: 0 additional API calls (same as before)
- **Without VMID**: 1 additional API call to list resources
  - VM command calls: `GET /api2/json/cluster/resources?type=qemu`
  - Container command calls: `GET /api2/json/cluster/resources?type=lxc`

### Latency
- List API call typically <500ms on local network
- Filtering happens in-memory (negligible)
- Acceptable trade-off for improved UX

### Optimization Opportunities (Future)
- Cache resource list for short duration (e.g., 30 seconds)
- Not implementing now to keep change scope minimal

## Security Considerations

### No New Attack Surface
- Uses existing authentication mechanisms
- No new credentials or secrets
- Same repository interface and permissions

### Input Validation
- VMID extraction uses `parseInt()` with explicit radix
- Invalid parsing results in NaN, which will fail existing validation
- Existing SSH connection validation applies

## Documentation Impact

### Automatic Updates
- `oclif readme` generates help text from command definitions
- Description update: "VMID of the VM to connect to (optional, prompts if not provided)"
- Examples remain valid (explicit VMID still works)

### Additional Examples to Add
```typescript
static examples = [
  {
    command: '<%= config.bin %> <%= command.id %>',
    description: 'Interactively select a running VM to connect to',
  },
  {
    command: '<%= config.bin %> <%= command.id %> 100',
    description: 'Connect to VM with VMID 100 using default credentials',
  },
  // ... existing examples
];
```

## Rollout Strategy

### Phase 1: Implementation
1. Add `getRunningResources()` to service with tests
2. Update VM connect command with tests
3. Update container connect command with tests
4. Ensure all tests pass

### Phase 2: Validation
1. Run `openspec validate add-interactive-vm-selection --strict`
2. Manual testing with real Proxmox instance
3. Test edge cases (no running VMs, cancellation, etc.)

### Phase 3: Deployment
1. Update README via `pnpm run prepack`
2. Merge to main branch
3. Archive proposal via `/openspec:archive`

## Future Enhancements (Out of Scope)

### 1. Advanced Filtering
- Flag: `--node <node-name>` to filter by Proxmox node
- Flag: `--tag <tag>` to filter by VM tags

### 2. Enhanced Display
- Show CPU/memory usage in prompt
- Show uptime
- Color-code by status/health

### 3. Smart Defaults
- Remember last connected VM per user
- Pre-select most recently used

### 4. Batch Operations
- Multi-select for connecting to multiple VMs in tmux/screen sessions
