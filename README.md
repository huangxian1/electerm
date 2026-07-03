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

#### 文件传输"打开"按钮
在文件传输面板中，当文件下载到本地后，目标路径旁会显示一个打开文件夹图标，点击即可用系统默认程序打开已下载的文件。在活跃传输列表和历史传输记录中均可使用。

#### 侧边栏样式优化
新增侧边栏外观设置，用户可以选择是否显示按钮名称（在纯图标模式和图标+文字模式之间切换），并可以单独控制每个侧边栏按钮的显示与隐藏（菜单、书签、快速连接、文件传输、主题、设置等）。在设置面板中即可访问这些选项。

#### SFTP 远程树形视图
远程 SFTP 面板新增独立的树形文件浏览器，提供更直观的文件管理体验：
- **树形结构展示**：文件和文件夹以树形层级结构展示，支持展开/折叠操作
- **拖拽操作**：支持文件拖拽移动，可在树形结构中直接拖拽文件到目标文件夹
- **右键菜单**：支持新建文件/文件夹、上传/下载、终端打开目录、文件管理器打开、编辑、复制、剪切、粘贴、复制路径、重命名、删除、全选、刷新、权限编辑、文件信息等完整操作
- **多文件选择**：支持 Ctrl+点击多选、Shift+点击范围选择
- **路径同步**：点击文件夹时地址栏自动同步，地址栏输入路径时树形结构自动展开到对应位置
- **懒加载**：子目录内容在首次展开时才加载，提升性能
- **刷新保持**：刷新时保持已展开的树形结构，不会折叠回根目录
- **本地面板**：本地文件面板默认显示磁盘空间视图，可切换到文件列表视图

#### 中文界面优化
全面优化中文显示，所有界面元素默认根据系统语言显示对应文字：
- **终端信息面板**：磁盘空间、网络、活动、运行时间等标题显示中文
- **表格列标题**：文件系统、大小、已用、可用、使用率、挂载点等显示中文
- **按钮标签**：CPU、内存、磁盘空间等功能按钮显示中文
- **SFTP 面板**：磁盘空间、本地文件、远程等标签显示中文
- **右键菜单**：新建文件、新建文件夹、复制、剪切、粘贴、重命名、删除等菜单项显示中文
- **确认弹框**：删除确认、取消等按钮显示中文

#### SFTP 用户跟随终端切换
SFTP 远程操作自动跟随终端用户权限，无需手动切换：
- **终端切换用户**：在终端中使用 `su`、`sudo su`、`sudo -i` 等命令切换用户后，SFTP 操作自动使用当前终端用户的权限
- **无需重新输入密码**：不需要断开 SFTP 重新连接，也不需要再次输入密码
- **支持所有切换方式**：支持 `su`、`su -`、`sudo su`、`sudo -i`、`sudo -s`、`sudo -u username` 等所有用户切换命令
- **操作不干扰终端**：文件操作（拖拽、删除、重命名等）在后台执行，不会切换到终端界面

#### SFTP 文件操作优化
优化 SFTP 文件操作的执行方式和用户体验：
- **拖拽移动**：支持在树形结构中拖拽文件到目标文件夹，自动执行 `mv` 命令
- **复制粘贴**：支持复制文件到目标文件夹，自动执行 `cp -r` 命令
- **剪切粘贴**：支持剪切文件到目标文件夹，源文件自动删除
- **删除确认**：删除文件前显示确认弹框，区分单个文件、单个文件夹、多个文件、多个文件夹、混合选择等不同场景
- **重命名**：支持文件和文件夹重命名
- **新建文件/文件夹**：支持在指定位置新建文件或文件夹
- **操作后刷新**：操作完成后自动刷新相关目录，显示最新状态
- **编辑文件过滤**：仅对 10MB 以内的文本文件显示编辑按钮，自动排除二进制格式（docx、pdf、图片、视频、音频、压缩包、可执行文件等），避免误操作

#### 磁盘空间展示
本地文件面板新增磁盘空间展示功能：
- **空间大小概览**：显示各磁盘分区的总容量、已用空间、可用空间、使用率
- **表格展示**：以清晰的表格形式展示磁盘分区信息，包括文件系统、挂载点等详细信息
- **刷新功能**：支持手动刷新磁盘空间信息
- **视图切换**：可在磁盘空间视图和文件列表视图之间自由切换
- **中文显示**：表格列标题、按钮标签等根据系统语言自动显示中文

#### 远程系统资源监控
SFTP 远程面板标题栏实时显示远程服务器的 CPU 和内存使用情况：
- **CPU 使用率**：通过 `vmstat` 采样计算，百分比形式展示（如 `CPU: 29%`）
- **内存使用量**：读取 `/proc/meminfo` 计算实际使用量，格式为 `已用/总量`（如 `MEM: 54G/62G`）
- **实时刷新**：每 3 秒自动更新，无需手动操作
- **非侵入式展示**：仅在标题栏显示文字，不占用额外界面空间

#### SSH 和 SFTP 共享连接
SFTP 不再独立建立连接，而是与 SSH 终端共享同一个连接：
- **共享用户权限**：SFTP 操作与 SSH 终端共享用户权限，在终端中切换用户后 SFTP 自动跟随
- **无需重复登录**：不需要为 SFTP 单独输入密码或密钥
- **操作权限一致**：文件操作（拖拽、删除、重命名等）使用终端当前用户的权限执行
- **支持用户切换**：终端中使用 `su`、`sudo` 等命令切换用户后，SFTP 操作自动使用新用户权限

#### FinalShell 书签迁移工具
提供从 FinalShell 迁移连接配置到 Electerm 的脚本：
- **自动读取**：自动读取 FinalShell 的连接配置文件（`%LOCALAPPDATA%\finalshell\conn\`）
- **SSH 过滤**：仅转换 SSH 类型的连接，跳过已删除的配置
- **完整迁移**：保留主机、端口、用户名、密码、编码等关键信息
- **一键导入**：输出标准 JSON 文件，可直接通过 Electerm 的导入功能导入
- **使用方式**：运行 `.\Convert-FinalShell-To-Electerm.ps1`，输出文件位于 `dist\finalshell-electerm-bookmarks.json`

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
