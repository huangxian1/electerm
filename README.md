<h1 align="center" style="padding-top: 60px;padding-bottom: 40px;">
    <a href="https://github.com/huangxian1/electerm">
        <img src="https://github.com/electerm/electerm-resource/raw/master/static/images/electerm.png", alt="" />
    </a>
</h1>

# electerm(修改版)

[![license](https://img.shields.io/github/license/electerm/electerm)](https://github.com/electerm/electerm/blob/master/LICENSE)

[![English](https://img.shields.io/badge/English-EN-blue)](README_en.md) [![中文](https://img.shields.io/badge/中文-Chinese-blue)](README.md)

开源终端/ssh/telnet/serialport/RDP/VNC/Spice/sftp/ftp客户端(linux, mac, win)。**本项目基于原始开源项目 [electerm](https://github.com/electerm/electerm) 修改，添加了个性化功能。**

## 关于本项目

本项目是 [electerm](https://github.com/electerm/electerm) 的 Fork 版本，在原有功能基础上增加了自定义功能。原项目是由 electerm 团队开发的优秀开源终端/ssh/sftp 客户端，核心功能版权归原作者所有。

- 原项目地址：[https://github.com/electerm/electerm](https://github.com/electerm/electerm)
- 原作者邮箱：zxdong@gmail.com
- 许可证：MIT

## 功能特性

### 核心功能（来自原版 electerm）
- 支持ssh、telnet、serialport、RDP、VNC、Spice、本地和远程文件管理、sftp/ftp文件传输，以及作为本地终端使用
- 支持Window 7+(X64/ARM64)、Mac OS 10.15+(x64/arm64)、Linux(x64/arm64/Loong64)
- 全局快捷键切换隐藏显示窗口(类似guake，默认快捷键`ctrl + 2`)
- 多平台支持(linux, mac, win)
- 多国语言支持
- 双击直接编辑远程文件
- 支持密码或密钥登录
- 支持Zmodem(rz, sz)
- 支持ssh隧道
- 支持Trzsz(trz/tsz)，类似rz/sz，兼容tmux
- 支持透明窗口(Mac, win)
- 支持设置终端背景图片
- 支持代理服务器
- 支持预设快捷命令
- 支持主题
- 支持同步书签等数据到github/gitee私人gist、webdav/custom server/electerm cloud
- 支持快速输入命令到一个或者多个终端
- AI助手集成（支持DeepSeek、OpenAI等AI API），协助命令建议、脚本编写、解释所选终端内容
- MCP (Model Context Protocol) 组件，用于AI助手和外部工具集成
- 深度链接支持：使用 `telnet://192.168.2.31:34554` 或 `ssh://user@host:22` 等URL打开连接

### 自定义新增功能
- **文件传输"打开"按钮**：在文件传输面板中，当文件下载到本地后，目标路径旁会显示一个打开文件夹图标，点击即可用系统默认程序打开已下载的文件。在活跃传输列表和历史传输记录中均可使用。
- **侧边栏样式优化**：新增侧边栏外观设置，用户可以选择是否显示按钮名称（在纯图标模式和图标+文字模式之间切换），并可以单独控制每个侧边栏按钮的显示与隐藏（菜单、书签、快速连接、文件传输、主题、设置等）。在设置面板中即可访问这些选项。

## 开发

```bash
# 需要 nodejs/npm，建议使用 nvm 安装 nodejs/npm
git clone https://github.com/huangxian1/electerm.git
cd electerm
npm config set legacy-peer-deps true
npm i

# 启动 vite 开发服务器，需要 5570 端口
npm start

# 在另一个终端会话中运行应用
npm run app

# 代码格式检查
npm run lint

# 代码格式修复
npm run fix
```

## 同步原项目更新

要从原始 electerm 项目拉取更新：

```bash
git pull upstream master
```

## 许可证

MIT
