# 本地定制变更说明

本文档记录本地版本相对于 GitHub 原版 electerm 的主要差异，方便后续更新上游代码、排查问题和重新打包。

## 维护原则

- 更新 GitHub 最新代码后，不要直接丢弃本地修改。
- 建议继续使用根目录的 `Build-Windows-Installer.bat` 打包，它会先拉取上游代码、恢复本地修改、构建并生成 Windows 安装包。
- 如果拉取上游后出现冲突，优先保留本文档列出的本地定制逻辑，再结合上游新代码调整。
- 打包后安装前请关闭正在运行的 electerm；当前脚本在输入 `yes` 安装时会自动关闭旧进程。

## 本地新增脚本

### Windows 一键打包安装

文件：

- `Build-Windows-Installer.bat`
- `Build-Windows-Installer.ps1`

功能：

- 自动切换到 Node 24.12.0，如果本机 nvm 中存在该版本。
- 自动保存本地修改，拉取 GitHub 当前分支最新代码，再恢复本地修改。
- 配置 npm 镜像和 Electron 下载镜像。
- 执行依赖安装、前端构建、electron-builder 打包。
- 删除旧安装包和旧 `dist/win-unpacked`，避免使用旧产物。
- 打包成功后输入 `yes` 可直接启动安装，并会先关闭正在运行的 electerm。
- 安装前会清理 electerm 的前端运行缓存，避免旧界面资源残留；不会删除书签、连接配置和用户数据库。

维护注意：

- 如果上游改了构建目录或 electron-builder 配置，需要检查脚本里的 `npm run b`、`npm run pb` 和 `electron-builder` 调用是否仍然有效。

### FinalShell 配置转换

文件：

- `Convert-FinalShell-To-Electerm.ps1`

功能：

- 用于把 FinalShell 的部分连接配置转换成 electerm 可导入的书签 JSON。

维护注意：

- 转换出的文件可能包含服务器账号、密码、密钥等敏感信息，不要提交到 GitHub。
- 导入前建议先备份 electerm 当前配置。

## SFTP 目录加载优化

核心文件：

- `src/client/common/ws.js`
- `src/client/common/sftp.js`
- `src/client/components/sftp/sftp-entry.jsx`

目标：

- 快速切换目录时，旧目录加载请求应停止或忽略结果。
- 停在某个目录时，不应因为固定超时直接放弃，而是允许慢慢加载完成。
- 如果旧目录加载失败但用户已经切走，不再影响当前目录。

主要逻辑：

- WebSocket 请求增加一次性取消能力。
- SFTP 请求完成或取消后清理对应请求。
- SFTP 目录读取使用请求 id 判断结果是否过期，避免旧请求覆盖新目录。
- 软链接解析、真实路径读取等异步结果也会检查是否仍属于当前请求。

维护注意：

- 如果上游重构 SFTP 请求流程，重点检查“请求取消”和“过期结果不落地”这两点是否还在。
- 不要重新加固定目录加载超时，否则会违背当前需求。

## 日志查看和窗口切换恢复

核心文件：

- `src/app/lib/create-window.js`
- `src/app/lib/watch-file.js`
- `src/client/components/terminal/terminal.jsx`
- `src/client/store/event.js`

目标：

- 长时间查看持续更新的日志文件后，从其他窗口切回 electerm 时，终端/日志显示不应卡死。
- Electron 窗口后台不应因为 Chromium 节流导致终端刷新停住。

主要逻辑：

- BrowserWindow 禁用 `backgroundThrottling`。
- 文件监听增加更稳的 watch/unwatch/clean 处理。
- 窗口重新聚焦时尝试恢复终端焦点、触发 resize，并在连接关闭时尝试恢复当前标签。

维护注意：

- 如果上游改了窗口创建或终端组件，检查 `backgroundThrottling: false` 和 `recoverOnWindowFocus` 是否还保留。
- 文件监听相关改动在日志查看、远程文件阅读场景下尤其重要。

## 侧边栏文字和显示配置

核心文件：

- `src/client/components/sidebar/index.jsx`
- `src/client/components/sidebar/side-icon.jsx`
- `src/client/components/sidebar/transfer-list.jsx`
- `src/client/components/sidebar/sidebar.styl`
- `src/client/components/sidebar/sidebar-buttons.js`
- `src/client/components/setting-panel/setting-sidebar.jsx`
- `src/client/components/setting-panel/tab-settings.jsx`
- `src/client/components/layout/layout.jsx`
- `src/client/components/footer/footer-entry.jsx`
- `src/client/components/footer/footer.styl`
- `src/client/components/quick-commands/quick-commands-box.jsx`
- `src/client/common/sidebar-width.js`
- `src/client/common/default-setting.js`
- `src/client/common/setting-list.js`
- `src/client/common/constants.js`

目标：

- 左侧工具栏按钮下方显示名字，降低首次使用成本。
- 在“设置 -> 侧边栏”中控制是否显示按钮名字，以及每个侧边栏按钮是否显示。
- 侧边栏显示文字时使用较宽宽度，关闭文字时恢复原本窄宽度。
- 书签按钮排在新书签按钮前面，方便直接打开连接列表。

主要逻辑：

- `sidebarShowLabels` 控制是否显示按钮名字。
- `sidebarButtons` 控制菜单、书签、新书签、快捷连接、传输列表、UI 主题、设置、设置同步、Widgets、关于、升级提示等按钮的显示。
- `--sidebar-width` CSS 变量保存当前侧边栏宽度，抽屉、设置窗口、快捷命令浮层和侧边栏面板都跟随这个变量，避免内容被遮挡。
- 终端主布局、标签栏区域、底部栏和快捷命令浮层通过 `getSidebarWidth(config)` 按当前配置计算左侧偏移。
- 一键安装脚本会在安装前清理 Electron 前端运行缓存，避免旧侧边栏资源残留导致安装后界面看起来没有更新。

维护注意：

- 如果以后新增侧边栏按钮，优先把按钮 key 加到 `sidebar-buttons.js`，再在侧边栏渲染处使用同一个 key。
- 如果上游改了左侧布局，不要重新写死 `43px`，样式里应继续使用 `var(--sidebar-width, 43px)`，JS 布局计算应继续使用 `getSidebarWidth(config)`。
- 用户本地配置会保留这些开关；如果想回到默认值，可以在设置里打开所有按钮并开启“显示按钮名字”。

## 主题和显示相关

涉及文件可能包括：

- `src/client/common/default-setting.js`
- `src/client/components/footer/footer.styl`
- `src/client/components/main/wrapper.styl`
- 主题配置文件或用户本地配置

目标：

- 终端明暗主题文字对比度更适合当前使用习惯。

维护注意：

- 终端主题很多配置可能保存在用户本地数据库或配置中，不一定全部体现在源码里。
- 重新安装应用通常保留用户数据，但修改源码默认值只影响新配置或重置后的默认配置。

## 更新上游后的检查清单

1. 运行 `git status --short`，确认本地定制文件没有丢失。
2. 运行 `npm install`，如果 peer dependency 报错，确认 `legacy-peer-deps=true`。
3. 运行 `npm run b`，确认 `work/app/assets` 已重新生成。
4. 运行 `.\node_modules\.bin\electron-builder.cmd --win nsis --publish never` 或直接使用 `Build-Windows-Installer.bat`。
5. 安装后重点验证：
   - SFTP 快速切换目录时旧目录不会覆盖新目录。
   - 停在慢目录时可以继续等待加载完成。
   - 长时间查看日志后切回应用不会卡住。
   - 侧边栏按钮文字显示正常，终端内容不会被侧边栏遮挡。
   - “设置 -> 侧边栏”里的按钮显示开关和文字开关能即时生效。

## 建议提交策略

建议把本地定制做一次本地提交，后续更新上游时更容易处理冲突：

```powershell
git add Build-Windows-Installer.bat Build-Windows-Installer.ps1 Convert-FinalShell-To-Electerm.ps1 docs/local-customizations.md src package.json package-lock.json
git commit -m "local customizations for packaging sftp and terminal"
```

如果不想提交，也至少保留本文档，并在每次上游更新后按照检查清单验证。
