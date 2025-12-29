# homelab-cli

My homelab CLI

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/homelab-cli.svg)](https://npmjs.org/package/homelab-cli)
[![Downloads/week](https://img.shields.io/npm/dw/homelab-cli.svg)](https://npmjs.org/package/homelab-cli)

<!-- toc -->
* [homelab-cli](#homelab-cli)
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->

# Usage

<!-- usage -->
```sh-session
$ npm install -g homelab-cli
$ homelab COMMAND
running command...
$ homelab (--version)
homelab-cli/0.0.0 darwin-arm64 node-v22.21.0
$ homelab --help [COMMAND]
USAGE
  $ homelab COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`homelab config read [KEY]`](#homelab-config-read-key)
* [`homelab config write KEY VALUE`](#homelab-config-write-key-value)
* [`homelab exec demo`](#homelab-exec-demo)
* [`homelab help [COMMAND]`](#homelab-help-command)
* [`homelab module list [PROJECT-NAME]`](#homelab-module-list-project-name)
* [`homelab plugins`](#homelab-plugins)
* [`homelab plugins add PLUGIN`](#homelab-plugins-add-plugin)
* [`homelab plugins:inspect PLUGIN...`](#homelab-pluginsinspect-plugin)
* [`homelab plugins install PLUGIN`](#homelab-plugins-install-plugin)
* [`homelab plugins link PATH`](#homelab-plugins-link-path)
* [`homelab plugins remove [PLUGIN]`](#homelab-plugins-remove-plugin)
* [`homelab plugins reset`](#homelab-plugins-reset)
* [`homelab plugins uninstall [PLUGIN]`](#homelab-plugins-uninstall-plugin)
* [`homelab plugins unlink [PLUGIN]`](#homelab-plugins-unlink-plugin)
* [`homelab plugins update`](#homelab-plugins-update)
* [`homelab project list`](#homelab-project-list)
* [`homelab prompt demo`](#homelab-prompt-demo)
* [`homelab proxmox container list`](#homelab-proxmox-container-list)
* [`homelab proxmox template list`](#homelab-proxmox-template-list)
* [`homelab proxmox vm cloudinit VMID`](#homelab-proxmox-vm-cloudinit-vmid)
* [`homelab proxmox vm create TEMPLATE-NAME VM-NAME`](#homelab-proxmox-vm-create-template-name-vm-name)
* [`homelab proxmox vm delete [VMIDS]`](#homelab-proxmox-vm-delete-vmids)
* [`homelab proxmox vm list`](#homelab-proxmox-vm-list)
* [`homelab proxmox vm start [VMIDS]`](#homelab-proxmox-vm-start-vmids)
* [`homelab proxmox vm stop [VMIDS]`](#homelab-proxmox-vm-stop-vmids)
* [`homelab vscode [WORKSPACE-NAME]`](#homelab-vscode-workspace-name)
* [`homelab zellij [MODULE-NAME]`](#homelab-zellij-module-name)

## `homelab config read [KEY]`

Read configuration values

```
USAGE
  $ homelab config read [KEY] [--json] [--log-level debug|warn|error|info|trace] [-p]

ARGUMENTS
  [KEY]  Configuration key to read

FLAGS
  -p, --path  Show path to config file

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Read configuration values

EXAMPLES
  $ homelab config read

  $ homelab config read logLevel

  $ homelab config read --path
```

_See code: [src/commands/config/read.ts](https://github.com/sflab-io/homelab-cli/blob/v0.0.0/src/commands/config/read.ts)_

## `homelab config write KEY VALUE`

Write configuration values

```
USAGE
  $ homelab config write KEY VALUE [--json] [--log-level debug|warn|error|info|trace]

ARGUMENTS
  KEY    Configuration key to set
  VALUE  Configuration value

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Write configuration values

EXAMPLES
  $ homelab config write logLevel debug

  $ homelab config write colorOutput false
```

_See code: [src/commands/config/write.ts](https://github.com/sflab-io/homelab-cli/blob/v0.0.0/src/commands/config/write.ts)_

## `homelab exec demo`

Demonstrate command execution capabilities (simple commands, working directory, environment variables, streaming, error handling)

```
USAGE
  $ homelab exec demo [--json] [--log-level debug|warn|error|info|trace]

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Demonstrate command execution capabilities (simple commands, working directory, environment variables, streaming,
  error handling)

EXAMPLES
  $ homelab exec demo

  $ homelab exec demo # Run all demonstration scenarios
```

_See code: [src/commands/exec/demo.ts](https://github.com/sflab-io/homelab-cli/blob/v0.0.0/src/commands/exec/demo.ts)_

## `homelab help [COMMAND]`

Display help for homelab.

```
USAGE
  $ homelab help [COMMAND...] [-n]

ARGUMENTS
  [COMMAND...]  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for homelab.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v6.2.34/src/commands/help.ts)_

## `homelab module list [PROJECT-NAME]`

List all modules for a project from filesystem

```
USAGE
  $ homelab module list [PROJECT-NAME] [--json] [--log-level debug|warn|error|info|trace]

ARGUMENTS
  [PROJECT-NAME]  Name of the project to list modules for (defaults to current project)

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  List all modules for a project from filesystem

EXAMPLES
  $ homelab module list sflab
  ┌──────────────┬──────────────────────────────────────┐
  │ NAME         │ GIT REPOSITORY URL                   │
  ├──────────────┼──────────────────────────────────────┤
  │ module1      │ git@github.com:user/module1.git      │
  ├──────────────┼──────────────────────────────────────┤
  │ module2      │ git@github.com:user/module2.git      │
  └──────────────┴──────────────────────────────────────┘

  # List modules for current project (auto-detect from working directory)

    $ homelab module list

  $ homelab module list sflab --json
  [
    {
      "name": "module1",
      "gitRepoUrl": "git@github.com:user/module1.git"
    },
    {
      "name": "module2",
      "gitRepoUrl": "git@github.com:user/module2.git"
    }
  ]
```

_See code: [src/commands/module/list.ts](https://github.com/sflab-io/homelab-cli/blob/v0.0.0/src/commands/module/list.ts)_

## `homelab plugins`

List installed plugins.

```
USAGE
  $ homelab plugins [--json] [--core]

FLAGS
  --core  Show core plugins.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ homelab plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.51/src/commands/plugins/index.ts)_

## `homelab plugins add PLUGIN`

Installs a plugin into homelab.

```
USAGE
  $ homelab plugins add PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into homelab.

  Uses npm to install plugins.

  Installation of a user-installed plugin will override a core plugin.

  Use the HOMELAB_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the HOMELAB_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ homelab plugins add

EXAMPLES
  Install a plugin from npm registry.

    $ homelab plugins add myplugin

  Install a plugin from a github url.

    $ homelab plugins add https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ homelab plugins add someuser/someplugin
```

## `homelab plugins:inspect PLUGIN...`

Displays installation properties of a plugin.

```
USAGE
  $ homelab plugins inspect PLUGIN...

ARGUMENTS
  PLUGIN...  [default: .] Plugin to inspect.

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Displays installation properties of a plugin.

EXAMPLES
  $ homelab plugins inspect myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.51/src/commands/plugins/inspect.ts)_

## `homelab plugins install PLUGIN`

Installs a plugin into homelab.

```
USAGE
  $ homelab plugins install PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into homelab.

  Uses npm to install plugins.

  Installation of a user-installed plugin will override a core plugin.

  Use the HOMELAB_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the HOMELAB_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ homelab plugins add

EXAMPLES
  Install a plugin from npm registry.

    $ homelab plugins install myplugin

  Install a plugin from a github url.

    $ homelab plugins install https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ homelab plugins install someuser/someplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.51/src/commands/plugins/install.ts)_

## `homelab plugins link PATH`

Links a plugin into the CLI for development.

```
USAGE
  $ homelab plugins link PATH [-h] [--install] [-v]

ARGUMENTS
  PATH  [default: .] path to plugin

FLAGS
  -h, --help          Show CLI help.
  -v, --verbose
      --[no-]install  Install dependencies after linking the plugin.

DESCRIPTION
  Links a plugin into the CLI for development.

  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.


EXAMPLES
  $ homelab plugins link myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.51/src/commands/plugins/link.ts)_

## `homelab plugins remove [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ homelab plugins remove [PLUGIN...] [-h] [-v]

ARGUMENTS
  [PLUGIN...]  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ homelab plugins unlink
  $ homelab plugins remove

EXAMPLES
  $ homelab plugins remove myplugin
```

## `homelab plugins reset`

Remove all user-installed and linked plugins.

```
USAGE
  $ homelab plugins reset [--hard] [--reinstall]

FLAGS
  --hard       Delete node_modules and package manager related files in addition to uninstalling plugins.
  --reinstall  Reinstall all plugins after uninstalling.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.51/src/commands/plugins/reset.ts)_

## `homelab plugins uninstall [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ homelab plugins uninstall [PLUGIN...] [-h] [-v]

ARGUMENTS
  [PLUGIN...]  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ homelab plugins unlink
  $ homelab plugins remove

EXAMPLES
  $ homelab plugins uninstall myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.51/src/commands/plugins/uninstall.ts)_

## `homelab plugins unlink [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ homelab plugins unlink [PLUGIN...] [-h] [-v]

ARGUMENTS
  [PLUGIN...]  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ homelab plugins unlink
  $ homelab plugins remove

EXAMPLES
  $ homelab plugins unlink myplugin
```

## `homelab plugins update`

Update installed plugins.

```
USAGE
  $ homelab plugins update [-h] [-v]

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Update installed plugins.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.51/src/commands/plugins/update.ts)_

## `homelab project list`

List all projects from filesystem

```
USAGE
  $ homelab project list [--json] [--log-level debug|warn|error|info|trace]

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  List all projects from filesystem

EXAMPLES
  $ homelab project list
  ┌──────────────┬──────────────────────────────────────┐
  │ NAME         │ GIT REPOSITORY URL                   │
  ├──────────────┼──────────────────────────────────────┤
  │ project1     │ git@github.com:user/project1.git     │
  ├──────────────┼──────────────────────────────────────┤
  │ project2     │ git@github.com:user/project2.git     │
  ├──────────────┼──────────────────────────────────────┤
  │ project3     │ git@github.com:user/project3.git     │
  └──────────────┴──────────────────────────────────────┘

  $ homelab project list --json
  [
    {
      "name": "project1",
      "gitRepoUrl": "git@github.com:user/project1.git"
    },
    {
      "name": "project2",
      "gitRepoUrl": "git@github.com:user/project2.git"
    },
    {
      "name": "project3",
      "gitRepoUrl": "git@github.com:user/project3.git"
    }
  ]
```

_See code: [src/commands/project/list.ts](https://github.com/sflab-io/homelab-cli/blob/v0.0.0/src/commands/project/list.ts)_

## `homelab prompt demo`

Demonstrate interactive prompts (text, password, select, multi-select)

```
USAGE
  $ homelab prompt demo [--json] [--log-level debug|warn|error|info|trace]

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Demonstrate interactive prompts (text, password, select, multi-select)

EXAMPLES
  $ homelab prompt demo
```

_See code: [src/commands/prompt/demo.ts](https://github.com/sflab-io/homelab-cli/blob/v0.0.0/src/commands/prompt/demo.ts)_

## `homelab proxmox container list`

List all Proxmox LXC containers

```
USAGE
  $ homelab proxmox container list [--json] [--log-level debug|warn|error|info|trace]

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  List all Proxmox LXC containers

EXAMPLES
  $ homelab proxmox container list
  ┌──────┬─────────────────┬──────────┬───────────────┐
  │ VMID │ Name            │ Status   │ IPv4 Address  │
  ├──────┼─────────────────┼──────────┼───────────────┤
  │ 100  │ web-container   │ running  │ 192.168.1.10  │
  │ 101  │ db-container    │ running  │ 192.168.1.11  │
  │ 102  │ test-container  │ stopped  │ N/A           │
  └──────┴─────────────────┴──────────┴───────────────┘

  $ homelab proxmox container list --json
  [
    {
      "vmid": 100,
      "name": "web-container",
      "status": "running",
      "ipv4Address": "192.168.1.10"
    },
    {
      "vmid": 101,
      "name": "db-container",
      "status": "running",
      "ipv4Address": "192.168.1.11"
    },
    {
      "vmid": 102,
      "name": "test-container",
      "status": "stopped",
      "ipv4Address": null
    }
  ]
```

_See code: [src/commands/proxmox/container/list.ts](https://github.com/sflab-io/homelab-cli/blob/v0.0.0/src/commands/proxmox/container/list.ts)_

## `homelab proxmox template list`

List all Proxmox VM templates

```
USAGE
  $ homelab proxmox template list [--json] [--log-level debug|warn|error|info|trace]

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  List all Proxmox VM templates

EXAMPLES
  $ homelab proxmox template list
  ┌──────┬─────────────────┬──────────┐
  │ VMID │ Name            │ Template │
  ├──────┼─────────────────┼──────────┤
  │ 100  │ ubuntu-22.04    │ Yes      │
  │ 101  │ debian-12       │ Yes      │
  └──────┴─────────────────┴──────────┘

  $ homelab proxmox template list --json
  [
    {
      "vmid": 100,
      "name": "ubuntu-22.04",
      "node": "pve1",
      "template": 1
    },
    {
      "vmid": 101,
      "name": "debian-12",
      "node": "pve1",
      "template": 1
    }
  ]
```

_See code: [src/commands/proxmox/template/list.ts](https://github.com/sflab-io/homelab-cli/blob/v0.0.0/src/commands/proxmox/template/list.ts)_

## `homelab proxmox vm cloudinit VMID`

Configure cloud-init settings for a Proxmox VM

```
USAGE
  $ homelab proxmox vm cloudinit VMID [--json] [--log-level debug|warn|error|info|trace] [--ipconfig <value>] [--password
    <value>] [--ssh-key <value>] [--upgrade] [--user <value>]

ARGUMENTS
  VMID  VM ID to configure

FLAGS
  --ipconfig=<value>  [default: ip=dhcp] IPv4 configuration for eth0 (ip=dhcp or ip=X.X.X.X/YY[,gw=X.X.X.X])
  --password=<value>  Password for the default user (empty = no password)
  --ssh-key=<value>   [default: ./keys/admin_id_ecdsa.pub] SSH public key or path to key file
  --upgrade           Automatically upgrade packages on first boot
  --user=<value>      [default: admin] Username for the default user

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Configure cloud-init settings for a Proxmox VM

EXAMPLES
  $ homelab proxmox vm cloudinit 100
  Configuring cloud-init for VM 100...
  Successfully configured cloud-init for VM 100

  $ homelab proxmox vm cloudinit 100 --ipconfig ip=192.168.1.100/24
  Configure VM with static IP address

  $ homelab proxmox vm cloudinit 100 --ipconfig ip=10.0.10.123/24,gw=10.0.10.1 --upgrade
  Configure VM with static IP, gateway, and enable package upgrades

  $ homelab proxmox vm cloudinit 100 --user ubuntu --password mypassword
  Configure VM with custom user credentials
```

_See code: [src/commands/proxmox/vm/cloudinit.ts](https://github.com/sflab-io/homelab-cli/blob/v0.0.0/src/commands/proxmox/vm/cloudinit.ts)_

## `homelab proxmox vm create TEMPLATE-NAME VM-NAME`

Create a new VM from a template

```
USAGE
  $ homelab proxmox vm create TEMPLATE-NAME VM-NAME [--json] [--log-level debug|warn|error|info|trace]

ARGUMENTS
  TEMPLATE-NAME  Name of the template to clone from
  VM-NAME        Name for the new VM

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Create a new VM from a template

EXAMPLES
  $ homelab proxmox vm create tpl-linux-ubuntu-server-24.04 my-server
  Creating VM 'my-server' from template 'tpl-linux-ubuntu-server-24.04'...
  Successfully created VM 200 'my-server' on node 'pve1'

  $ homelab proxmox vm create tpl-linux-ubuntu-server-24.04 my-server --json
  {
    "vmid": 200,
    "name": "my-server",
    "node": "pve1"
  }
```

_See code: [src/commands/proxmox/vm/create.ts](https://github.com/sflab-io/homelab-cli/blob/v0.0.0/src/commands/proxmox/vm/create.ts)_

## `homelab proxmox vm delete [VMIDS]`

Delete one or more Proxmox VMs

```
USAGE
  $ homelab proxmox vm delete [VMIDS...] [--json] [--log-level debug|warn|error|info|trace] [-f]

ARGUMENTS
  [VMIDS...]  VM IDs to delete

FLAGS
  -f, --force  Skip confirmation prompts

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Delete one or more Proxmox VMs

EXAMPLES
  $ homelab proxmox vm delete 100
  Deleting VM 100...
  Successfully deleted VM 100 'web-server' from node 'pve1'

  $ homelab proxmox vm delete 100 101 102
  Deleting 3 VMs...
  Successfully deleted 3 VMs

  $ homelab proxmox vm delete 100 --force
  Successfully deleted VM 100 'web-server' from node 'pve1'

  $ homelab proxmox vm delete
  # Interactive mode - select VMs from list

  $ homelab proxmox vm delete 100 --json --force
  {
    "vmid": 100,
    "name": "web-server",
    "node": "pve1",
    "status": "deleted"
  }
```

_See code: [src/commands/proxmox/vm/delete.ts](https://github.com/sflab-io/homelab-cli/blob/v0.0.0/src/commands/proxmox/vm/delete.ts)_

## `homelab proxmox vm list`

List all Proxmox VMs (non-templates)

```
USAGE
  $ homelab proxmox vm list [--json] [--log-level debug|warn|error|info|trace]

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  List all Proxmox VMs (non-templates)

EXAMPLES
  $ homelab proxmox vm list
  ┌──────┬─────────────────┬──────────┬───────────────┐
  │ VMID │ Name            │ Status   │ IPv4 Address  │
  ├──────┼─────────────────┼──────────┼───────────────┤
  │ 100  │ web-server      │ running  │ 192.168.1.10  │
  │ 101  │ database        │ running  │ 192.168.1.11  │
  │ 102  │ backup          │ stopped  │ N/A           │
  └──────┴─────────────────┴──────────┴───────────────┘

  $ homelab proxmox vm list --json
  [
    {
      "vmid": 100,
      "name": "web-server",
      "status": "running",
      "ipv4Address": "192.168.1.10"
    },
    {
      "vmid": 101,
      "name": "database",
      "status": "running",
      "ipv4Address": "192.168.1.11"
    },
    {
      "vmid": 102,
      "name": "backup",
      "status": "stopped",
      "ipv4Address": null
    }
  ]
```

_See code: [src/commands/proxmox/vm/list.ts](https://github.com/sflab-io/homelab-cli/blob/v0.0.0/src/commands/proxmox/vm/list.ts)_

## `homelab proxmox vm start [VMIDS]`

Start one or more stopped Proxmox VMs

```
USAGE
  $ homelab proxmox vm start [VMIDS...] [--json] [--log-level debug|warn|error|info|trace]

ARGUMENTS
  [VMIDS...]  VM IDs to start

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Start one or more stopped Proxmox VMs

EXAMPLES
  $ homelab proxmox vm start 100
  Starting VM 100...
  Successfully started VM 100 'web-server' on node 'pve1'

  $ homelab proxmox vm start 100 101 102
  Starting 3 VMs...
  Successfully started 3 VMs

  $ homelab proxmox vm start
  # Interactive mode - select VMs from list of stopped VMs

  $ homelab proxmox vm start 100 --json
  {
    "vmid": 100,
    "name": "web-server",
    "node": "pve1",
    "status": "started"
  }
```

_See code: [src/commands/proxmox/vm/start.ts](https://github.com/sflab-io/homelab-cli/blob/v0.0.0/src/commands/proxmox/vm/start.ts)_

## `homelab proxmox vm stop [VMIDS]`

Stop one or more running Proxmox VMs

```
USAGE
  $ homelab proxmox vm stop [VMIDS...] [--json] [--log-level debug|warn|error|info|trace]

ARGUMENTS
  [VMIDS...]  VM IDs to stop

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Stop one or more running Proxmox VMs

EXAMPLES
  $ homelab proxmox vm stop 100
  Stopping VM 100...
  Successfully stopped VM 100 'web-server' on node 'pve1'

  $ homelab proxmox vm stop 100 101 102
  Stopping 3 VMs...
  Successfully stopped 3 VMs

  $ homelab proxmox vm stop
  # Interactive mode - select VMs from list of running VMs

  $ homelab proxmox vm stop 100 --json
  {
    "vmid": 100,
    "name": "web-server",
    "node": "pve1",
    "status": "stopped"
  }
```

_See code: [src/commands/proxmox/vm/stop.ts](https://github.com/sflab-io/homelab-cli/blob/v0.0.0/src/commands/proxmox/vm/stop.ts)_

## `homelab vscode [WORKSPACE-NAME]`

Open current project or workspace in Visual Studio Code

```
USAGE
  $ homelab vscode [WORKSPACE-NAME] [--json] [--log-level debug|warn|error|info|trace]

ARGUMENTS
  [WORKSPACE-NAME]  Name of the workspace file (without .code-workspace extension)

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Open current project or workspace in Visual Studio Code

EXAMPLES
  # Open current project in VS Code (auto-detect from working directory)

    $ homelab vscode

  # Open workspace for current project (auto-detect project)

    $ homelab vscode myworkspace
```

_See code: [src/commands/vscode.ts](https://github.com/sflab-io/homelab-cli/blob/v0.0.0/src/commands/vscode.ts)_

## `homelab zellij [MODULE-NAME]`

Open a Zellij session with a project-specific configuration

```
USAGE
  $ homelab zellij [MODULE-NAME] [--json] [--log-level debug|warn|error|info|trace] [-l <value>]

ARGUMENTS
  [MODULE-NAME]  Name of the Zellij module from .config/zellij/ (optional, prompts for selection if not provided)

FLAGS
  -l, --layout-name=<value>  [default: default] Name of the layout subdirectory (defaults to "default")

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Open a Zellij session with a project-specific configuration

EXAMPLES
  # Open Zellij session with interactive module selection and default layout

    $ homelab zellij

  # Open Zellij session with module and default layout

    $ homelab zellij my-module

  # Open Zellij session with specific module and layout

    $ homelab zellij my-module --layout-name my-layout

  # Open Zellij session with specific module and layout (short flag)

    $ homelab zellij my-module -l my-layout
```

_See code: [src/commands/zellij.ts](https://github.com/sflab-io/homelab-cli/blob/v0.0.0/src/commands/zellij.ts)_
<!-- commandsstop -->
