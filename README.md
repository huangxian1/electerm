<h1 align="center" style="padding-top: 60px;padding-bottom: 40px;">
    <a href="https://github.com/huangxian1/electerm">
        <img src="https://github.com/electerm/electerm-resource/raw/master/static/images/electerm.png", alt="" />
    </a>
</h1>

# electerm(Modified)

[![license](https://img.shields.io/github/license/electerm/electerm)](https://github.com/electerm/electerm/blob/master/LICENSE)

![English](https://img.shields.io/badge/English-EN-blue) ![中文](https://img.shields.io/badge/中文-Chinese-blue)

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
- **File Transfer "Open" Button**: In the file transfer panel, when a file is downloaded to local, an open folder icon appears next to the target path. Click it to directly open the downloaded file with the system default program. Available in both the active transfer list and transfer history table.
- **Sidebar Style Optimization**: Added settings to customize the sidebar appearance. Users can control whether to show button labels (toggle between icon-only and icon+label modes) and individually show/hide each sidebar button (menu, bookmarks, quick connect, file transfers, themes, settings, etc.). Access these settings from the settings panel.

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
