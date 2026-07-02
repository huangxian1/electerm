<h1 align="center" style="padding-top: 60px;padding-bottom: 40px;">
    <a href="https://github.com/huangxian1/electerm">
        <img src="https://github.com/electerm/electerm-resource/raw/master/static/images/electerm.png", alt="" />
    </a>
</h1>

# electerm(Modified)

[![license](https://img.shields.io/github/license/electerm/electerm)](https://github.com/electerm/electerm/blob/master/LICENSE)

[![English](https://img.shields.io/badge/English-EN-blue)](README_en.md) [![中文](https://img.shields.io/badge/中文-Chinese-blue)](README.md)

Open-sourced terminal/ssh/sftp/telnet/serialport/RDP/VNC/Spice/ftp client(linux, mac, win). **This is a modified version based on the original [electerm](https://github.com/electerm/electerm) project.**

## About This Project

This project is a fork of [electerm](https://github.com/electerm/electerm) with custom feature additions. The original project is an excellent open-source terminal/ssh/sftp client created by the electerm team. All credit for the core functionality goes to the original authors.

- Original project: [https://github.com/electerm/electerm](https://github.com/electerm/electerm)
- Original author email: zxdong@gmail.com
- License: MIT

## Features

### Core Features (from original electerm)
- Works as a terminal/file manager or ssh/sftp/ftp/telnet/serialport/RDP/VNC/Spice client
- Support Window 7+(X64/ARM64), Mac OS 10.15+(x64/arm64), Linux(x64/arm64/Loong64)
- Global hotkey to toggle window visibility (default is `ctrl + 2`)
- Multi platform(linux, mac, win)
- Multi-language support
- Double click to directly edit (small) remote files
- Auth with publicKey + password
- Support Zmodem(rz, sz)
- Support ssh tunnel
- Support Trzsz(trz/tsz), similar to rz/sz, and compatible with tmux
- Transparent window(Mac, win)
- Terminal background image
- Global/session proxy
- Quick commands
- UI/terminal theme
- Sync bookmarks/themes/quick commands to github/gitee secret gist/webdav/custom server/electerm cloud
- Quick input to one or all terminals
- AI assistant integration (supporting DeepSeek, OpenAI, and other AI APIs)
- MCP (Model Context Protocol) widget for AI assistants and external tools integration
- Deep link support: Open connections with URLs like `telnet://192.168.2.31:34554` or `ssh://user@host:22`

### Custom Added Features

#### File Transfer "Open" Button
In the file transfer panel, when a file is downloaded to local, an open folder icon appears next to the target path. Click it to directly open the downloaded file with the system default program. Available in both the active transfer list and transfer history table.

#### Sidebar Style Optimization
Added settings to customize the sidebar appearance. Users can control whether to show button labels (toggle between icon-only and icon+label modes) and individually show/hide each sidebar button (menu, bookmarks, quick connect, file transfers, themes, settings, etc.). Access these settings from the settings panel.

#### SFTP Remote Tree View
The remote SFTP panel now features an independent tree-structured file browser for a more intuitive file management experience:
- **Tree Structure Display**: Files and folders are displayed in a hierarchical tree structure with expand/collapse support
- **Drag & Drop**: Support dragging files to move them directly within the tree structure
- **Context Menu**: Right-click menu supports New File, New Folder, Copy, Cut, Paste, Rename, Delete operations
- **Multi-File Selection**: Support Ctrl+Click for multi-select, Shift+Click for range selection
- **Path Synchronization**: Address bar automatically syncs when clicking folders; tree auto-expands to the target path when entering a path in the address bar
- **Lazy Loading**: Subdirectory contents are loaded only when first expanded, improving performance
- **Refresh Preservation**: Tree structure is preserved during refresh, not collapsing back to root
- **Local Panel**: Local file panel defaults to disk space view, with option to switch to file list view

#### Chinese Interface Optimization
Comprehensive Chinese language display optimization, all interface elements display in the corresponding language based on system settings:
- **Terminal Info Panel**: Disk Space, Network, Activities, Uptime titles display in Chinese
- **Table Column Headers**: Filesystem, Size, Used, Available, Use%, Mounted display in Chinese
- **Button Labels**: CPU, Memory, Disk Space and other function buttons display in Chinese
- **SFTP Panel**: Disk Space, Local Files, Remote and other labels display in Chinese
- **Context Menu**: New File, New Folder, Copy, Cut, Paste, Rename, Delete menu items display in Chinese
- **Confirmation Dialogs**: Delete confirmation, Cancel and other buttons display in Chinese

#### SFTP User Follows Terminal Switch
SFTP remote operations automatically follow terminal user permissions without manual switching:
- **Terminal User Switch**: After switching users in terminal using `su`, `sudo su`, `sudo -i` etc., SFTP operations automatically use the current terminal user's permissions
- **No Password Re-entry**: No need to disconnect SFTP and reconnect, no need to re-enter passwords
- **Support All Switch Methods**: Supports `su`, `su -`, `sudo su`, `sudo -i`, `sudo -s`, `sudo -u username` and all other user switching commands
- **Non-intrusive Operations**: File operations (drag, delete, rename etc.) execute in background without switching to terminal view

#### SFTP File Operations Optimization
Optimized SFTP file operation execution and user experience:
- **Drag to Move**: Support dragging files to target folders in tree structure, automatically executes `mv` command
- **Copy & Paste**: Support copying files to target folders, automatically executes `cp -r` command
- **Cut & Paste**: Support cutting files to target folders, source files are automatically deleted
- **Delete Confirmation**: Confirmation dialog before deletion, distinguishing between single file, single folder, multiple files, multiple folders, and mixed selection scenarios
- **Rename**: Support renaming files and folders
- **New File/Folder**: Support creating new files or folders at specified locations
- **Post-operation Refresh**: Automatically refreshes related directories after operations to show latest state

#### Disk Space Display
Local file panel now includes disk space display functionality:
- **Space Overview**: Display total capacity, used space, available space, and usage percentage for each disk partition
- **Table Display**: Clear tabular presentation of disk partition information including filesystem and mount points
- **Refresh Function**: Support manual refresh of disk space information
- **View Switching**: Freely switch between disk space view and file list view
- **Chinese Display**: Table column headers, button labels and other elements automatically display in Chinese based on system language

#### SSH and SFTP Shared Connection
SFTP no longer establishes independent connections but shares the same connection with SSH terminal:
- **Shared User Permissions**: SFTP operations share user permissions with SSH terminal, automatically follows when switching users in terminal
- **No Duplicate Login**: No need to enter password or key separately for SFTP
- **Consistent Operation Permissions**: File operations (drag, delete, rename etc.) execute with the current terminal user's permissions
- **User Switching Support**: After switching users in terminal using `su`, `sudo` etc., SFTP operations automatically use the new user's permissions

## Dev

```bash
# needs nodejs/npm, suggest using nvm to install nodejs/npm
git clone https://github.com/huangxian1/electerm.git
cd electerm
npm config set legacy-peer-deps true
npm i

# start vite dev server, requires port 5570
npm start

# in a separate terminal session run app
npm run app

# code format check
npm run lint

# code format fix
npm run fix
```

## Sync with Original Project

To pull updates from the original electerm project:

```bash
git pull upstream master
```

## License

MIT
