# Bug 修复记录

本文档记录了本次修改的所有 Bug、修复方案及完成状态。

**状态说明**:
- ✅ 已修复（代码已改，待测试）
- ⚠️ 需测试（代码已改，但未实际验证）
- ❌ 未修复
- 🔍 未验证（功能存在但未测试）

---

## 一、中文显示问题

### Bug 1.1 终端信息面板标题显示英文
- **问题**: 磁盘空间、网络、活动、运行时间等标题显示为英文
- **文件**: `src/client/components/terminal-info/disk.jsx`, `network.jsx`, `activity.jsx`, `up.jsx`
- **方案**: 创建 `src/client/common/i18n-text.js` 辅助函数，根据语言设置返回对应文本
- **状态**: ✅ 已修复

### Bug 1.2 终端信息按钮标签显示英文
- **问题**: CPU、内存、磁盘空间等按钮标签显示英文
- **文件**: `src/client/components/terminal-info/base.jsx`
- **方案**: 使用 `t()` 函数获取翻译文本
- **状态**: ✅ 已修复

### Bug 1.3 表格列标题显示英文
- **问题**: 文件系统、大小、已用、可用、使用率、挂载点等列标题显示英文
- **文件**: `src/client/components/terminal-info/data-cols-parser.jsx`
- **方案**: 添加 `columnTitleMap` 映射，使用中文列标题
- **状态**: ✅ 已修复

### Bug 1.4 资源信息显示英文
- **问题**: CPU、内存、交换空间的进度条标签显示英文
- **文件**: `src/client/components/terminal-info/resource.jsx`
- **方案**: 添加 `nameMap` 映射，使用中文名称
- **状态**: ✅ 已修复

### Bug 1.5 SFTP 面板标题显示英文
- **问题**: 磁盘空间、本地文件、远程等标签显示英文
- **文件**: `src/client/components/sftp/sftp-entry.jsx`
- **方案**: 使用 `t()` 函数获取翻译文本
- **状态**: ✅ 已修复

### Bug 1.6 侧边栏按钮标签显示英文
- **问题**: 菜单、书签、新书签、快速连接、文件传输等按钮标签显示英文
- **文件**: `src/client/components/sidebar/sidebar-buttons.js`
- **方案**: 使用 `t()` 函数获取翻译文本
- **状态**: 🔍 未验证

---

## 二、树形结构初始化问题

### Bug 2.1 默认路径未自动展开
- **问题**: 首次打开时，默认路径（如 /home/dev）没有自动展开到树中
- **文件**: `src/client/components/sftp/tree-view.jsx`
- **方案**: `componentDidMount` 时调用 `initTree(currentPath)` 自动展开到目标路径
- **状态**: ⚠️ 需测试

### Bug 2.2 切换视图未读取当前路径
- **问题**: 切换到树形视图时，没有读取地址栏路径进行展开
- **文件**: `src/client/components/sftp/sftp-entry.jsx`
- **方案**: `toggleTreeView` 调用 `clearAndReload(path)` 读取当前路径
- **状态**: ⚠️ 需测试

### Bug 2.3 切换用户后路径未更新
- **问题**: 切换 SSH 用户后，路径变了但树形结构没有重新加载
- **文件**: `src/client/components/sftp/tree-view.jsx`
- **方案**: `componentDidUpdate` 监听 `currentPath` 变化，自动调用 `expandToPath`
- **状态**: ⚠️ 需测试

### Bug 2.4 SFTP 未初始化时无法加载
- **问题**: 组件挂载时 SFTP 连接可能还未建立
- **文件**: `src/client/components/sftp/tree-view.jsx`
- **方案**: 添加 `tryInit` 方法，在 `componentDidUpdate` 中检测 SFTP 就绪后初始化
- **状态**: ✅ 已修复

### Bug 2.5 输入路径后树形结构未展开
- **问题**: 在地址栏输入路径后，树形结构没有展开到对应位置
- **方案**: `onGoto` 方法中检测树形视图模式，调用 `expandToPath` 展开
- **状态**: ⚠️ 需测试

---

## 三、树形结构数据结构问题

### Bug 3.1 内容重复（两套内容）
- **问题**: 刷新后文件夹内容出现重复，点击一个会同时选中重复的
- **原因**: 使用 flat 数组合并，导致同一目录内容被多次添加
- **方案**: 重新设计为嵌套 key-value 结构，children 用对象存储，文件名作为 key，天然唯一
- **状态**: ✅ 已修复

### Bug 3.2 刷新时树被折叠
- **问题**: 刷新后已展开的树被折叠回去
- **原因**: 重建树时丢失展开状态
- **方案**: 嵌套结构直接操作节点，保留 `expanded` 状态，只刷新已展开的节点
- **状态**: ✅ 已修复

### Bug 3.3 未展开的文件夹自动展开
- **问题**: 刷新时没有展开过的文件夹也自动展开了
- **原因**: `expandNodeToPath` 设置了 `expanded=true` 但没有加载内容
- **方案**: 只对目标路径上的节点设置展开状态
- **状态**: ✅ 已修复

### Bug 3.4 树形结构应该独立于表格
- **问题**: 树形结构不应该是复用表格的数据和逻辑，应该是独立的
- **方案**: 重写 `tree-view.jsx`，使用独立的嵌套数据结构，不依赖 `fileList` prop
- **状态**: ✅ 已修复

---

## 四、展开逻辑问题

### Bug 4.1 单击触发展开
- **问题**: 单击文件夹就触发展开，但没有加载内容
- **原因**: `toggleSelect` 更新地址栏后，`componentDidUpdate` 检测到路径变化，调用 `expandToPath`
- **方案**: 添加 `_internalPathChange` 标志位，内部点击时不触发展开
- **状态**: ✅ 已修复

### Bug 4.2 双击需要两次才能展开
- **问题**: 第一次双击转圈并关闭，第二次双击才能正常打开
- **原因**: `toggleExpand` 只在 `!expanded && children === null` 时加载内容
- **方案**: 改为只要 `children === null` 就先加载，再切换展开状态
- **状态**: ✅ 已修复

### Bug 4.3 展开后图标状态异常
- **问题**: 点击文件夹后图标变为打开状态，箭头向下，但实际没有展开内容
- **原因**: `isExpanded=true` 但 `children=null`，导致图标显示展开但无内容
- **方案**: 修复 `toggleExpand`，确保加载内容后再设置展开状态
- **状态**: ✅ 已修复

---

## 五、路径问题

### Bug 5.1 路径三斜杠
- **问题**: 拖拽出错后，地址栏路径变成 `///data/jar/logs/...`
- **原因**: 根节点创建时路径构造错误，`parentPath='/'` 且 `name='/'` 时结果是 `//`
- **方案**: 修复 `createNode` 方法，根节点路径始终为 `/`；添加 `normalizePath` 方法防止多斜杠
- **状态**: ✅ 已修复

### Bug 5.2 点击目录时地址栏未同步
- **问题**: 在树形结构中点击文件夹时，顶部地址栏没有跟着变化
- **方案**: `toggleSelect` 中调用 `modifier` 更新地址栏路径
- **状态**: ✅ 已修复

### Bug 5.3 输入路径后树形未展开
- **问题**: 在地址栏输入路径后，树形结构没有展开到对应位置
- **方案**: `onGoto` 检测树形视图模式，调用 `expandToPath`
- **状态**: ⚠️ 需测试

---

## 六、右键菜单问题

### Bug 6.1 新建文件夹无反应
- **问题**: 右键点击新建文件夹没有效果
- **原因**: 创建节点没有正确渲染，`editingNode` 判断逻辑有问题
- **方案**: 使用 `_creating` 标记创建节点，在 `buildTree` 中单独处理
- **状态**: ⚠️ 需测试

### Bug 6.2 创建后未刷新
- **问题**: 新建文件/文件夹后，列表没有更新
- **方案**: 创建成功后重新加载父目录内容
- **状态**: ⚠️ 需测试

### Bug 6.3 新建文件功能
- **问题**: 右键新建文件功能是否正常
- **方案**: 与新建文件夹类似，通过终端 stdin 执行 `touch` 命令
- **状态**: 🔍 未验证

### Bug 6.4 删除功能
- **问题**: 右键删除功能是否正常
- **方案**: 通过终端 stdin 执行 `rm` 命令
- **状态**: 🔍 未验证

### Bug 6.5 重命名功能
- **问题**: 右键重命名功能是否正常
- **方案**: 通过终端 stdin 执行 `mv` 命令
- **状态**: 🔍 未验证

### Bug 6.6 复制/剪切/粘贴功能
- **问题**: 右键复制、剪切、粘贴功能是否正常
- **方案**: 复制/剪切写入剪贴板，粘贴创建传输任务
- **状态**: 🔍 未验证

---

## 七、拖拽问题

### Bug 7.1 拖拽报错 ENOENT（本地路径问题）
- **问题**: 拖拽时使用了本地 Windows 路径（如 `C:\data\...`）在远程服务器执行
- **原因**: `getDropFileList` 获取的是操作系统级拖拽数据，包含本地路径
- **方案**: 树形视图内部拖拽使用 `this.dragNodes`（包含正确的服务器路径）
- **状态**: ✅ 已修复

### Bug 7.2 拖拽报错 Permission denied
- **问题**: 即使用 root 用户登录，拖拽仍然报权限错误
- **原因**: SFTP 连接用的是 SSH 连接的 exec 通道，始终以原始用户执行；终端 `su root` 只改变 shell，不改变 exec 通道
- **方案**: 远程操作改为通过终端 stdin 执行，共享终端当前用户的权限
- **状态**: ⚠️ 需测试

### Bug 7.3 多文件拖拽
- **问题**: 需要支持多文件拖拽
- **方案**: 使用 `this.selectedPaths` 存储选中的多个文件，拖拽时循环处理
- **状态**: 🔍 未验证

### Bug 7.4 跨类型拖拽（本地↔远程）
- **问题**: 需要支持本地和远程之间的文件拖拽
- **方案**: 同类型使用 `mv` 命令，跨类型使用传输列表
- **状态**: 🔍 未验证

### Bug 7.5 拖拽后路径变化未刷新
- **问题**: 拖拽完成后，源目录和目标目录应该自动刷新
- **方案**: 拖拽完成后调用 `refreshAfterAction` 刷新已展开的目录
- **状态**: ⚠️ 需测试

---

## 八、显示布局问题

### Bug 8.1 滚动条缺失
- **问题**: 内容过多时没有滚动条，无法滚动操作
- **文件**: `src/client/components/sftp/sftp.styl`
- **方案**: `.sftp-tree-view-wrapper` 的 `overflow` 从 `hidden` 改为 `auto`；设置明确的 `height`
- **状态**: ⚠️ 需测试

### Bug 8.2 切换视图后布局空隙
- **问题**: 切换树形/表格视图后，界面上方出现空余空间
- **方案**: 给树形视图容器设置明确的高度计算
- **状态**: ⚠️ 需测试

### Bug 8.3 刷新后图标显示异常
- **问题**: 刷新后文件夹图标显示异常，不是文件夹图标
- **原因**: 节点的 `isDirectory` 属性可能在加载时丢失
- **方案**: 确保加载目录内容时正确设置 `isDirectory` 属性
- **状态**: ✅ 已修复

---

## 九、SFTP 用户切换问题

### Bug 9.1 终端切换用户后 SFTP 权限不跟随
- **问题**: 终端 `su root` 后，SFTP 仍然是 dev 用户权限
- **原因**: SFTP 是 SSH 连接的子系统，与终端 shell 是独立的
- **方案**: 远程文件操作改为通过终端 stdin 执行，共享终端当前用户的权限
- **状态**: ⚠️ 需测试

### Bug 9.2 不只是 su 命令
- **问题**: 切换用户不只是 `su` 命令，还有 `sudo su`、`sudo -i`、`sudo -s` 等
- **方案**: 不检测具体命令，而是通过终端 stdin 执行操作，自然共享终端当前用户的权限
- **状态**: ✅ 已修复

---

## 十、待验证功能清单

以下功能代码已实现，但未实际测试验证：

| 功能 | 文件 | 状态 |
|------|------|------|
| 默认路径自动展开 | tree-view.jsx | ⚠️ 需测试 |
| 切换视图读取路径 | sftp-entry.jsx | ⚠️ 需测试 |
| 输入路径展开树 | sftp-entry.jsx | ⚠️ 需测试 |
| 新建文件夹 | tree-view.jsx | ⚠️ 需测试 |
| 新建文件 | tree-view.jsx | 🔍 未验证 |
| 删除文件/文件夹 | tree-view.jsx | 🔍 未验证 |
| 重命名 | tree-view.jsx | 🔍 未验证 |
| 复制/剪切/粘贴 | tree-view.jsx | 🔍 未验证 |
| 多文件拖拽 | tree-view.jsx | 🔍 未验证 |
| 跨类型拖拽 | tree-view.jsx | 🔍 未验证 |
| 拖拽权限（终端stdin） | tree-view.jsx | ⚠️ 需测试 |
| 滚动条 | sftp.styl | ⚠️ 需测试 |
| 布局空隙 | list-table-ui.jsx | ⚠️ 需测试 |

---

## 修改的核心文件

| 文件 | 修改内容 |
|------|----------|
| `src/client/common/i18n-text.js` | 新建，国际化辅助函数 |
| `src/client/components/terminal-info/disk.jsx` | 使用 `t()` 函数 |
| `src/client/components/terminal-info/network.jsx` | 使用 `t()` 函数 |
| `src/client/components/terminal-info/activity.jsx` | 使用 `t()` 函数 |
| `src/client/components/terminal-info/up.jsx` | 使用 `t()` 函数 |
| `src/client/components/terminal-info/base.jsx` | 使用 `t()` 函数 |
| `src/client/components/terminal-info/data-cols-parser.jsx` | 中文列标题映射 |
| `src/client/components/terminal-info/resource.jsx` | 中文名称映射 |
| `src/client/components/sftp/tree-view.jsx` | 重写，嵌套数据结构 |
| `src/client/components/sftp/sftp-entry.jsx` | 树形视图集成、路径同步 |
| `src/client/components/sftp/list-table-ui.jsx` | 传递 currentPath 等 props |
| `src/client/components/sftp/sftp.styl` | 滚动条样式修复 |

---

## 技术方案总结

### 树形视图数据结构
```javascript
// 嵌套 key-value 结构，文件名作为 key，天然唯一
tree = {
  "/": {
    name: "/",
    path: "/",
    isDirectory: true,
    expanded: true,
    children: {
      "home": {
        name: "home",
        path: "/home",
        isDirectory: true,
        expanded: true,
        children: { ... }
      }
    }
  }
}
```

### 远程操作权限方案
```javascript
// 远程操作：通过终端 stdin 执行，共享终端用户的权限
// 终端 su root 后，这里的操作也用 root 权限
if (type === typeMap.remote) {
  const term = refs.get('term-' + pid)
  term.attachAddon._sendData(`mv '${from}' '${to}'\r`)
}
```

### 关键设计决策

1. **树形视图独立性**: 树形视图使用独立的嵌套数据结构，不依赖表格视图的 `fileList`
2. **路径变化检测**: 使用 `_internalPathChange` 标志位区分内部点击和外部输入
3. **懒加载**: `children: null` 表示未加载，展开时才加载子目录内容
4. **刷新策略**: 只刷新已展开的节点，不折叠树结构

---

## 会话记录摘要

### 用户关键要求

1. **"展示内容没有默认中文"** — 要求全面检查所有界面的中文显示
2. **"树形结构应该是一块独立的结构"** — 不应该复用表格的数据和逻辑
3. **"树形结构展开不应该都在当前一个页面"** — 展开应该在原位展开，不跳转页面
4. **"点击刷新后有时候图标展示异常"** — 刷新后文件夹图标显示错误
5. **"内容过多的滚动条还是没有"** — 要求支持滚动
6. **"加载内容多的时候，没有滚动条，无法操作"** — 滚动条必须有
7. **"拖拽的本质不是命令吗"** — 拖拽应该在服务器上执行 mv 命令，不是用本地路径
8. **"你应该汇总进去"** — 要求先汇总问题再检查代码
9. **"你这个方案不可以"** — 拒绝手动输入密码的用户切换方案
10. **"FinalShell都支持这个功能，你必须做这个"** — 要求 SFTP 自动跟随终端用户
11. **"切换用户不是su这一个命令吧"** — 要求考虑所有切换用户的方式
12. **"你这个执行命令会切换到终端吗"** — 要求操作不切换终端视图
13. **"本来这些图形化界面的操作其实就是终端命令"** — 图形操作本质是终端命令
14. **"为什么让ssh和sftp共用一个连接呢"** — 要求共享用户权限

### 关键技术讨论

1. **SFTP 与终端的关系**:
   - SFTP 使用 SSH 连接的内置子系统，与终端是独立连接
   - 终端中 `su root` 只切换 shell 用户，不影响 SFTP 子系统
   - `client.exec()` 始终以原始 SSH 用户执行

2. **树形视图数据结构**:
   - 用户提出用文件名作为 children 对象的 key，天然避免重复
   - 比扁平 `loadedDirs` + `buildTree()` 方案更好

3. **拖拽权限方案**:
   - 用户拒绝手动输入密码方案
   - 最终方案：当 `sftp.mv()` 失败时，回退到终端 stdin 执行 `mv` 命令
   - 终端 stdin 共享终端当前用户的权限

4. **路径三斜杠问题**:
   - `parentPath='/'` 且 `name='/'` 时，``${parentPath}/${name}`` 会变成 `//`
   - 需要特殊处理根节点路径

5. **循环依赖陷阱**:
   - `toggleSelect` 更新地址栏 → `componentDidUpdate` 检测 `currentPath` 变化 → 调用 `expandToPath` → 文件夹被展开
   - 需要用 `_internalPathChange` 标志位打断循环

### 已知死胡同（不要重复尝试）

1. **扁平 loadedDirs + buildTree() 方案** — 导致内容重复、刷新混乱
2. **`if (!node.expanded && node.children === null)` 条件** — 遗漏了 `expanded=true` 但 `children=null` 的情况
3. **纯 `sftp.mv()` 拖拽方案** — SFTP 用户与终端用户独立
4. **手动输入用户名/密码的切换用户方案** — 用户已拒绝

### 服务器环境信息

- **服务器**: iZ8vbcltx85kcts98v4j0hZ
- **登录用户**: dev（SFTP 也是 dev 用户）
- **目录权限**:
  - `/data/jar/logs/` — 所有者 `dev:dev`（777）
  - `/data/jar/logs/ty-mall-services-item/` — 所有者 `root:root`（755）
- **问题**: dev 用户无法写入 `ty-mall-services-item/` 目录，需要 root 权限
