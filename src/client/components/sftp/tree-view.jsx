/**
 * Tree View Component - Nested key-value structure
 * Each node: { name, path, isDirectory, expanded, children: {name: node} | null }
 */

import React, { Component, createRef } from 'react'
import { Input } from 'antd'
import {
  FolderOutlined,
  FolderOpenOutlined,
  FileOutlined,
  RightOutlined,
  DownOutlined,
  FileAddOutlined,
  FolderAddOutlined,
  DeleteOutlined,
  EditOutlined,
  CopyOutlined,
  ScissorOutlined,
  SnippetsOutlined,
  LoadingOutlined
} from '@ant-design/icons'
import classnames from 'classnames'
import resolve from '../../common/resolve'
import { fileOperationsMap, typeMap, ctrlOrCmd, isMac } from '../../common/constants'
import { copy as copyToClipboard, readClipboard, hasFileInClipboardText } from '../../common/clipboard'
import { getDropFileList } from '../../common/file-drop-utils'
import { createTransferProps } from './transfer-common'
import generate from '../../common/uid'
import sanitizeFilename from '../../common/sanitize-filename'

const e = window.translate
const treeNodeCls = 'tree-node-item'
const treeDragOverCls = 'tree-dragover'

export default class TreeView extends Component {
  constructor (props) {
    super(props)
    this.state = {
      tree: null, // Root node of the tree
      editingPath: null,
      editingName: '',
      creatingPath: null,
      creatingIsDir: false,
      contextMenuVisible: false,
      contextMenuPath: null,
      contextMenuPos: { x: 0, y: 0 }
    }
    this.containerRef = createRef()
    this.editingInputRef = createRef()
    this.selectedPaths = new Set()
    this.dragPaths = []
    this._loadingPath = null
    this._initialized = false
    this._internalPathChange = false // Flag to track internal path changes
  }

  componentDidMount () {
    document.addEventListener('click', this.handleClickOutside)
    this.tryInit()
  }

  componentDidUpdate (prevProps) {
    if (!this._initialized && this.props.sftp && !prevProps.sftp) {
      this.tryInit()
    }
    // Only expand to path if the change came from outside (e.g., address bar input)
    if (this.props.currentPath && this.props.currentPath !== prevProps.currentPath && this._initialized) {
      if (!this._internalPathChange) {
        this.expandToPath(this.props.currentPath)
      }
      this._internalPathChange = false
    }
  }

  componentWillUnmount () {
    document.removeEventListener('click', this.handleClickOutside)
    clearTimeout(this.refreshTimer)
  }

  tryInit = () => {
    const { type, sftp, currentPath } = this.props
    if (type === typeMap.remote && !sftp) return
    if (this._initialized) return
    this._initialized = true
    this.initTree(currentPath || '/')
  }

  handleClickOutside = (e) => {
    if (this.state.contextMenuVisible && !e.target.closest('.tree-context-menu')) {
      this.closeContextMenu()
    }
  }

  // Clear and reload tree from a specific path
  clearAndReload = (path) => {
    this._initialized = false
    this.setState({ tree: null }, () => {
      this._initialized = true
      this.initTree(path || '/')
    })
  }

  // Initialize tree from root, expand to targetPath
  initTree = async (targetPath) => {
    const rootNode = await this.createNode('/', '/', true)
    if (!rootNode) return
    rootNode.expanded = true
    rootNode.isRoot = true

    const tree = { '/': rootNode }

    if (targetPath !== '/') {
      await this.expandNodeToPath(tree, targetPath)
    }

    this.setState({ tree })
  }

  // Create a tree node
  createNode = async (name, parentPath, isDirectory) => {
    // Fix path construction to avoid triple slashes
    let nodePath
    if (parentPath === '/') {
      nodePath = name === '/' ? '/' : `/${name}`
    } else {
      nodePath = `${parentPath}/${name}`
    }
    return {
      name,
      path: nodePath,
      isDirectory,
      expanded: false,
      children: null, // null means not loaded
      loading: false
    }
  }

  // Load children for a node
  loadChildren = async (node) => {
    if (node.children !== null) return // Already loaded
    if (this._loadingPath === node.path) return
    this._loadingPath = node.path
    node.loading = true
    this.forceUpdate()

    const { type, sftp } = this.props

    try {
      let files = []
      if (type === typeMap.remote && sftp) {
        const list = await sftp.list(node.path)
        files = list
          .filter(f => f.name !== '.' && f.name !== '..')
          .map(f => ({
            name: f.name,
            path: node.path === '/' ? `/${f.name}` : `${node.path}/${f.name}`,
            isDirectory: f.type === 'd',
            expanded: false,
            children: null,
            loading: false
          }))
      } else if (window.fs) {
        const names = await window.fs.readdirAsync(node.path)
        for (const name of names) {
          try {
            const stat = await window.fs.statAsync(resolve(node.path, name))
            files.push({
              name,
              path: node.path === '/' ? `/${name}` : `${node.path}/${name}`,
              isDirectory: stat.isDirectory(),
              expanded: false,
              children: null,
              loading: false
            })
          } catch (e) {
            // skip inaccessible files
          }
        }
      }

      // Convert to key-value object (name -> node)
      const children = {}
      files.forEach(f => { children[f.name] = f })
      node.children = children
    } catch (err) {
      console.error('loadChildren failed:', err)
      node.children = {}
    }

    node.loading = false
    this._loadingPath = null
  }

  // Expand tree to show a specific path
  expandNodeToPath = async (tree, targetPath) => {
    if (targetPath === '/') return

    const parts = targetPath.split('/').filter(Boolean)
    let currentNode = tree['/']
    let currentPath = '/'

    for (const part of parts) {
      currentPath = currentPath === '/' ? `/${part}` : `${currentPath}/${part}`

      // Load children if not loaded
      if (currentNode.children === null) {
        await this.loadChildren(currentNode)
      }

      // Find or create the child
      if (!currentNode.children[part]) {
        // Child not found, stop
        break
      }

      currentNode = currentNode.children[part]
      currentNode.expanded = true
    }
  }

  // Expand to path after initialization
  expandToPath = async (targetPath) => {
    const { tree } = this.state
    if (!tree) return

    await this.expandNodeToPath(tree, targetPath)
    this.forceUpdate()
  }

  // Toggle expand/collapse
  toggleExpand = async (node) => {
    if (!node.isDirectory) return

    // If children not loaded, load first
    if (node.children === null) {
      await this.loadChildren(node)
    }

    node.expanded = !node.expanded
    this.forceUpdate()
  }

  // Get node by path
  getNodeByPath = (path) => {
    const { tree } = this.state
    if (!tree || path === '/') return tree?.['/']

    const parts = path.split('/').filter(Boolean)
    let currentNode = tree['/']

    for (const part of parts) {
      if (!currentNode.children || !currentNode.children[part]) return null
      currentNode = currentNode.children[part]
    }

    return currentNode
  }

  // Get parent node
  getParentNode = (path) => {
    if (path === '/') return null
    const parentPath = resolve(path, '..')
    return this.getNodeByPath(parentPath)
  }

  // Normalize path to avoid triple slashes
  normalizePath = (path) => {
    if (!path) return '/'
    // Replace multiple slashes with single slash, but keep leading slash
    return path.replace(/\/+/g, '/')
  }

  // Selection
  toggleSelect = (node, e) => {
    if (!node.path) return

    if (e && ((e.ctrlKey && !isMac) || (e.metaKey && isMac))) {
      this.selectedPaths.has(node.path)
        ? this.selectedPaths.delete(node.path)
        : this.selectedPaths.add(node.path)
    } else if (e && e.shiftKey && this.lastSelectedPath) {
      // Range selection not implemented for simplicity
      this.selectedPaths.clear()
      this.selectedPaths.add(node.path)
    } else {
      this.selectedPaths.clear()
      this.selectedPaths.add(node.path)
    }
    this.lastSelectedPath = node.path

    // Update address bar with normalized path
    if (node.isDirectory && this.props.modifier) {
      const normalizedPath = this.normalizePath(node.path)
      this._internalPathChange = true // Flag to prevent componentDidUpdate from expanding
      this.props.modifier({
        [`${this.props.type}Path`]: normalizedPath,
        [`${this.props.type}PathTemp`]: normalizedPath
      })
    }

    this.forceUpdate()
  }

  isSelected (node) {
    return this.selectedPaths.has(node.path)
  }

  // Double click
  handleDoubleClick = (node) => {
    if (node.isDirectory) {
      this.toggleExpand(node)
    } else {
      window.fs.openFile(node.path).catch(window.store.onError)
    }
  }

  // Drag
  onDragStart = (e, node) => {
    const selectedArr = Array.from(this.selectedPaths)
    const isSelected = selectedArr.includes(node.path)
    const dragNodes = isSelected && selectedArr.length > 1
      ? selectedArr.map(p => this.getNodeByPath(p)).filter(Boolean)
      : [node]

    this.dragPaths = dragNodes.map(f => f.path)
    e.dataTransfer.setData('fromFile', JSON.stringify(dragNodes.map(f => ({
      name: f.name,
      path: f.path,
      isDirectory: f.isDirectory,
      type: this.props.type,
      host: this.props.tab?.host,
      tabType: this.props.tab?.type,
      tabId: this.props.tab?.id,
      title: this.props.tab?.title
    }))))
    e.dataTransfer.effectAllowed = 'move'
  }

  onDragOver = (e, node) => {
    if (!node.isDirectory) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    e.currentTarget.classList.add(treeDragOverCls)
  }

  handleDragLeave = (e) => {
    e.currentTarget.classList.remove(treeDragOverCls)
  }

  // Helper: send command to terminal stdin and wait
  sendTerminalCmd = async (cmd, waitMs = 1000) => {
    const { refs } = await import('../common/ref')
    const pid = this.props.tab?.id
    const term = refs.get('term-' + pid)
    if (!term || !term.attachAddon) {
      throw new Error('Terminal not found')
    }
    term.attachAddon._sendData(cmd + '\r')
    // Wait for command to execute
    await new Promise(resolve => setTimeout(resolve, waitMs))
  }

  // Execute mv command via terminal stdin
  mvViaTerminal = async (fromPath, toPath) => {
    const escapedFrom = fromPath.replace(/'/g, "'\\''")
    const escapedTo = toPath.replace(/'/g, "'\\''")
    await this.sendTerminalCmd(`mv '${escapedFrom}' '${escapedTo}'`)
  }

  // Execute cp command via terminal stdin
  cpViaTerminal = async (fromPath, toPath) => {
    const escapedFrom = fromPath.replace(/'/g, "'\\''")
    const escapedTo = toPath.replace(/'/g, "'\\''")
    await this.sendTerminalCmd(`cp -r '${escapedFrom}' '${escapedTo}'`)
  }

  // Execute rm command via terminal stdin
  rmViaTerminal = async (path, isDirectory) => {
    const escapedPath = path.replace(/'/g, "'\\''")
    const cmd = isDirectory ? `rm -rf '${escapedPath}'` : `rm -f '${escapedPath}'`
    await this.sendTerminalCmd(cmd)
  }

  // Execute rename/mv command via terminal stdin
  renameViaTerminal = async (oldPath, newPath) => {
    const escapedFrom = oldPath.replace(/'/g, "'\\''")
    const escapedTo = newPath.replace(/'/g, "'\\''")
    await this.sendTerminalCmd(`mv '${escapedFrom}' '${escapedTo}'`)
  }

  // Execute mkdir or touch command via terminal stdin
  createViaTerminal = async (path, isDirectory) => {
    const escapedPath = path.replace(/'/g, "'\\''")
    const cmd = isDirectory ? `mkdir -p '${escapedPath}'` : `touch '${escapedPath}'`
    await this.sendTerminalCmd(cmd)
  }

  onDrop = async (e, targetNode) => {
    e.preventDefault()
    e.currentTarget.classList.remove(treeDragOverCls)
    if (!targetNode.isDirectory) return

    let fromFiles = null
    try {
      const data = e.dataTransfer.getData('fromFile')
      if (data) fromFiles = JSON.parse(data)
    } catch (err) {}

    if (!fromFiles?.length) {
      fromFiles = getDropFileList(e.dataTransfer)
    }
    if (!fromFiles?.length) return

    const { type, tab } = this.props
    const toPath = targetNode.path
    const fromType = fromFiles[0].type || type
    const isSameType = fromType === type

    if (isSameType) {
      // Same type: use mv command via terminal stdin (shares terminal's user permissions)
      for (const f of fromFiles) {
        const fromPath = f.path
        const toFilePath = resolve(toPath, sanitizeFilename(f.name))
        try {
          if (type === typeMap.remote) {
            // Remote: always use terminal stdin to share terminal's user context
            await this.mvViaTerminal(fromPath, toFilePath)
          } else {
            // Local: use window.fs.mv
            await window.fs.mv(fromPath, toFilePath)
          }
        } catch (err) {
          window.store.onError(err)
        }
      }
      this.dragPaths = []
      this.selectedPaths.clear()
      this.lastSelectedPath = null
      // Only refresh source and target directories, not the whole tree
      this.refreshSourceAndTarget(fromFiles, toPath)
      return
    }

    // Cross-type: use transfer list
    const transferProps = createTransferProps(this.props)
    const transfers = fromFiles.map(f => ({
      typeFrom: fromType,
      typeTo: type,
      fromPath: f.path,
      toPath: resolve(toPath, sanitizeFilename(f.name)),
      fromFile: f,
      id: generate(),
      host: tab?.host,
      tabType: tab?.type,
      ...transferProps,
      operation: ''
    }))
    this.props.addTransferList(transfers)
    this.dragPaths = []
    this.selectedPaths.clear()
    this.lastSelectedPath = null
    this.refreshTimer = setTimeout(() => {
      this.props.remoteList?.() || this.props.localList?.()
    }, 500)
  }

  handleDragEnd = () => {
    document.querySelectorAll(`.${treeDragOverCls}`).forEach(el => el.classList.remove(treeDragOverCls))
  }

  // Context menu
  openContextMenu = (e, node) => {
    e.preventDefault()
    e.stopPropagation()
    if (!this.isSelected(node)) {
      this.selectedPaths.clear()
      this.selectedPaths.add(node.path)
      this.lastSelectedPath = node.path
    }
    this.setState({
      contextMenuVisible: true,
      contextMenuPath: node.path,
      contextMenuPos: { x: e.clientX, y: e.clientY }
    })
  }

  closeContextMenu = () => {
    this.setState({ contextMenuVisible: false, contextMenuPath: null })
  }

  // Rename
  startRename = (node) => {
    this.closeContextMenu()
    this.setState({ editingPath: node.path, editingName: node.name }, () => {
      this.editingInputRef.current?.focus()
      this.editingInputRef.current?.select()
    })
  }

  handleFinishRename = () => {
    this.finishRename()
  }

  finishRename = async () => {
    const { editingPath, editingName } = this.state
    if (!editingPath || !editingName) {
      this.setState({ editingPath: null, editingName: '' })
      return
    }

    const node = this.getNodeByPath(editingPath)
    if (!node || editingName === node.name) {
      this.setState({ editingPath: null, editingName: '' })
      return
    }

    const { type } = this.props
    const oldPath = node.path
    const parentPath = resolve(oldPath, '..')
    const newPath = resolve(parentPath, editingName)

    try {
      if (type === typeMap.remote) {
        await this.renameViaTerminal(oldPath, newPath)
      } else {
        await window.fs.rename(oldPath, newPath)
      }
      this.setState({ editingPath: null, editingName: '' })
      // Reload parent directory from SFTP to verify actual state
      const parentNode = this.getNodeByPath(parentPath)
      if (parentNode && parentNode.children !== null) {
        parentNode.children = null
        await this.loadChildren(parentNode)
      }
      this.forceUpdate()
    } catch (err) {
      window.store.onError(err)
      this.setState({ editingPath: null, editingName: '' })
    }
  }

  // Create
  startCreate = (node, isDirectory) => {
    this.closeContextMenu()
    const parentPath = node ? node.path : this.props.remotePath || this.props.localPath || '/'
    this.setState({
      creatingPath: parentPath,
      creatingIsDir: isDirectory,
      editingName: ''
    }, () => {
      this.editingInputRef.current?.focus()
    })
  }

  handleFinishCreate = () => {
    this.finishCreate()
  }

  finishCreate = async () => {
    const { creatingPath, creatingIsDir, editingName } = this.state
    if (!creatingPath || !editingName) {
      this.setState({ creatingPath: null, editingName: '' })
      return
    }

    const { type } = this.props
    const fullPath = resolve(creatingPath, editingName)

    try {
      if (type === typeMap.remote) {
        await this.createViaTerminal(fullPath, creatingIsDir)
      } else {
        creatingIsDir ? await window.fs.mkdir(fullPath) : await window.fs.touch(fullPath)
      }
      this.setState({ creatingPath: null, editingName: '' })
      // Reload parent directory from SFTP to verify actual state
      const parentNode = this.getNodeByPath(creatingPath)
      if (parentNode) {
        parentNode.children = null
        await this.loadChildren(parentNode)
        parentNode.expanded = true
        this.forceUpdate()
      }
    } catch (err) {
      window.store.onError(err)
      this.setState({ creatingPath: null, editingName: '' })
    }
  }

  // Delete - handles single file, single folder, multiple files, multiple folders
  deleteNodes = async () => {
    this.closeContextMenu()
    const paths = Array.from(this.selectedPaths)
    if (!paths.length) return

    // Get node info for all selected paths
    const nodes = paths.map(p => this.getNodeByPath(p)).filter(Boolean)
    if (!nodes.length) return

    // Build confirmation message
    const fileCount = nodes.filter(n => !n.isDirectory).length
    const folderCount = nodes.filter(n => n.isDirectory).length
    let confirmMsg = ''

    if (fileCount > 0 && folderCount > 0) {
      // Mixed: files and folders
      confirmMsg = e('delTip') + ` ${fileCount} ${e('files')}, ${folderCount} ${e('folder')}?`
    } else if (folderCount > 0) {
      // Only folders
      confirmMsg = e('delTip') + ` ${folderCount} ${e('folder')}?`
      if (folderCount === 1) {
        confirmMsg = e('delTip') + ` ${nodes[0].name}?`
      }
    } else {
      // Only files
      confirmMsg = e('delTip') + ` ${fileCount} ${e('files')}?`
      if (fileCount === 1) {
        confirmMsg = e('delTip') + ` ${nodes[0].name}?`
      }
    }

    // Show confirmation dialog
    const { Modal } = await import('antd')
    const confirmed = await new Promise(resolve => {
      Modal.confirm({
        title: confirmMsg,
        okText: e('ok'),
        cancelText: e('cancel'),
        onOk: () => resolve(true),
        onCancel: () => resolve(false)
      })
    })

    if (!confirmed) return

    const { type } = this.props

    // Collect parent paths to refresh
    const parentPaths = new Set()

    // Delete each node via terminal
    for (const node of nodes) {
      try {
        if (type === typeMap.remote) {
          await this.rmViaTerminal(node.path, node.isDirectory)
          parentPaths.add(resolve(node.path, '..'))
        } else {
          node.isDirectory ? await window.fs.rmrf(node.path) : await window.fs.unlink(node.path)
          parentPaths.add(resolve(node.path, '..'))
        }
      } catch (err) {
        window.store.onError(err)
      }
    }

    this.selectedPaths.clear()
    this.lastSelectedPath = null

    // Reload parent directories from SFTP to verify actual state
    for (const parentPath of parentPaths) {
      const parentNode = this.getNodeByPath(parentPath)
      if (parentNode && parentNode.children !== null) {
        parentNode.children = null
        await this.loadChildren(parentNode)
      }
    }
    this.forceUpdate()
  }

  // Only refresh source and target directories after drag
  refreshSourceAndTarget = async (fromFiles, toPath) => {
    const { tree } = this.state
    if (!tree) return

    // Get source directory path (parent of dragged files)
    const sourcePaths = new Set()
    for (const f of fromFiles) {
      const parentPath = resolve(f.path, '..')
      sourcePaths.add(parentPath)
    }

    // Refresh each source directory
    for (const sourcePath of sourcePaths) {
      const sourceNode = this.getNodeByPath(sourcePath)
      if (sourceNode && sourceNode.children !== null) {
        sourceNode.children = null
        await this.loadChildren(sourceNode)
      }
    }

    // Refresh target directory
    const targetNode = this.getNodeByPath(toPath)
    if (targetNode && targetNode.children !== null) {
      targetNode.children = null
      await this.loadChildren(targetNode)
    }

    this.forceUpdate()
  }

  // Copy/Cut/Paste
  copyNodes = (isCut = false) => {
    this.closeContextMenu()
    const paths = Array.from(this.selectedPaths)
    const prefix = this.props.type === typeMap.remote ? 'remote:' : ''
    const text = paths.map(p => prefix + p).join('\n')
    copyToClipboard(text)
    window.store.fileOperation = isCut ? fileOperationsMap.mv : fileOperationsMap.cp
  }

  pasteNodes = async () => {
    this.closeContextMenu()
    const { type, remotePath, localPath } = this.props
    const targetPath = type === typeMap.remote ? remotePath : localPath
    const clipText = readClipboard()
    const fileNames = clipText.split('\n').filter(Boolean)
    const operation = window.store.fileOperation || fileOperationsMap.cp
    const isCut = operation === fileOperationsMap.mv

    // Collect paths to refresh
    const refreshPaths = new Set()
    refreshPaths.add(targetPath)

    for (const item of fileNames) {
      const isRemote = item.startsWith('remote:')
      const fromPath = isRemote ? item.replace(/^remote:/, '') : item
      const name = fromPath.split('/').pop()
      const toPath = resolve(targetPath, sanitizeFilename(name))

      if (isRemote && type === typeMap.remote) {
        try {
          if (isCut) {
            await this.mvViaTerminal(fromPath, toPath)
            refreshPaths.add(resolve(fromPath, '..'))
          } else {
            await this.cpViaTerminal(fromPath, toPath)
          }
        } catch (err) {
          window.store.onError(err)
        }
      } else {
        const transferProps = createTransferProps(this.props)
        this.props.addTransferList([{
          typeFrom: isRemote ? typeMap.remote : typeMap.local,
          typeTo: type,
          fromPath,
          toPath,
          id: generate(),
          host: this.props.tab?.host,
          tabType: this.props.tab?.type,
          ...transferProps,
          operation
        }])
      }
    }

    if (isCut) {
      window.store.fileOperation = ''
    }

    // Reload from SFTP to verify actual state
    for (const pathToRefresh of refreshPaths) {
      const node = this.getNodeByPath(pathToRefresh)
      if (node && node.children !== null) {
        node.children = null
        await this.loadChildren(node)
      }
    }
    this.forceUpdate()
  }

  // Refresh
  refreshAfterAction = () => {
    clearTimeout(this.refreshTimer)
    this.refreshTimer = setTimeout(() => {
      this.refreshExpandedNodes()
    }, 300)
  }

  refreshExpandedNodes = async () => {
    const { tree } = this.state
    if (!tree) return

    const refreshNode = async (node) => {
      if (node.expanded && node.children !== null) {
        // Save expanded state of children before reloading
        const expandedChildren = {}
        for (const childName in node.children) {
          if (node.children[childName].expanded) {
            expandedChildren[childName] = true
          }
        }

        // Reload children
        node.children = null
        await this.loadChildren(node)

        // Restore expanded state
        if (node.children) {
          for (const childName in node.children) {
            if (expandedChildren[childName]) {
              node.children[childName].expanded = true
            }
            // Recursively refresh expanded children
            await refreshNode(node.children[childName])
          }
        }
      }
    }

    await refreshNode(tree['/'])
    this.forceUpdate()
  }

  // Render tree node
  renderNode = (node, depth = 0) => {
    if (!node) return null
    const { editingPath, creatingPath } = this.state
    const isEditing = editingPath === node.path
    const isCreating = creatingPath === node.path
    const isExpanded = node.expanded
    const isLoading = node.loading
    const selected = this.isSelected(node)
    const hasChildren = node.isDirectory && node.children && Object.keys(node.children).length > 0
    const indent = depth * 18

    // Render editing input
    if (isEditing) {
      return (
        <div key={node.path} className='tree-node-editing' style={{ paddingLeft: indent + 18 }}>
          <Input
            ref={this.editingInputRef}
            size='small'
            value={this.state.editingName}
            onChange={(e) => this.setState({ editingName: e.target.value })}
            onBlur={this.handleFinishRename}
            onPressEnter={this.handleFinishRename}
          />
        </div>
      )
    }

    const result = [
      <div key={node.path} className='tree-node-wrapper'>
        <div
          className={classnames(treeNodeCls, {
            'tree-selected': selected,
            'tree-directory': node.isDirectory,
            'tree-file': !node.isDirectory
          })}
          style={{ paddingLeft: indent }}
          draggable
          onDragStart={(e) => this.onDragStart(e, node)}
          onDragOver={(e) => this.onDragOver(e, node)}
          onDragLeave={this.handleDragLeave}
          onDrop={(e) => this.onDrop(e, node)}
          onDragEnd={this.handleDragEnd}
          onClick={(e) => this.toggleSelect(node, e)}
          onDoubleClick={() => this.handleDoubleClick(node)}
          onContextMenu={(e) => this.openContextMenu(e, node)}
        >
          <span
            className='tree-expand-icon'
            onClick={(e) => { e.stopPropagation(); this.toggleExpand(node) }}
          >
            {node.isDirectory
              ? (isLoading
                  ? <LoadingOutlined />
                  : (isExpanded ? <DownOutlined /> : <RightOutlined />))
              : <span className='tree-leaf-icon' />}
          </span>
          <span className='tree-node-icon'>
            {node.isDirectory
              ? (isExpanded ? <FolderOpenOutlined /> : <FolderOutlined />)
              : <FileOutlined />}
          </span>
          <span className='tree-node-name'>{node.name}</span>
        </div>
      </div>
    ]

    // Render children if expanded
    if (hasChildren && isExpanded) {
      const childrenArr = Object.values(node.children)
      // Sort: directories first, then alphabetical
      childrenArr.sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      })

      for (const child of childrenArr) {
        result.push(this.renderNode(child, depth + 1))
      }
    }

    // Render creating input at the top of children
    if (isCreating) {
      result.splice(1, 0, (
        <div key='__creating__' className='tree-node-editing' style={{ paddingLeft: indent + 36 }}>
          <Input
            ref={this.editingInputRef}
            size='small'
            value={this.state.editingName}
            onChange={(e) => this.setState({ editingName: e.target.value })}
            onBlur={this.handleFinishCreate}
            onPressEnter={this.handleFinishCreate}
            placeholder={this.state.creatingIsDir ? e('newFolder') : e('newFile')}
          />
        </div>
      ))
    }

    return result
  }

  renderContextMenu () {
    const { contextMenuPos, contextMenuPath } = this.state
    const node = contextMenuPath ? this.getNodeByPath(contextMenuPath) : null
    const hasSelection = this.selectedPaths.size > 0
    const canPaste = hasFileInClipboardText()

    const items = [
      { key: 'newFile', icon: <FileAddOutlined />, label: e('newFile'), onClick: () => this.startCreate(node, false) },
      { key: 'newFolder', icon: <FolderAddOutlined />, label: e('newFolder'), onClick: () => this.startCreate(node, true) },
      { type: 'divider' },
      { key: 'copy', icon: <CopyOutlined />, label: e('copy'), disabled: !hasSelection, extra: `${ctrlOrCmd}+c`, onClick: () => this.copyNodes(false) },
      { key: 'cut', icon: <ScissorOutlined />, label: e('cut'), disabled: !hasSelection, extra: `${ctrlOrCmd}+x`, onClick: () => this.copyNodes(true) },
      { key: 'paste', icon: <SnippetsOutlined />, label: e('paste'), disabled: !canPaste, extra: `${ctrlOrCmd}+v`, onClick: () => this.pasteNodes() },
      { type: 'divider' },
      { key: 'rename', icon: <EditOutlined />, label: e('rename'), disabled: !node, onClick: () => this.startRename(node) },
      { key: 'delete', icon: <DeleteOutlined />, label: e('del'), disabled: !hasSelection, danger: true, onClick: () => this.deleteNodes() }
    ]

    return (
      <div
        className='tree-context-menu'
        style={{ position: 'fixed', left: contextMenuPos.x, top: contextMenuPos.y, zIndex: 9999 }}
      >
        <div className='tree-menu-items'>
          {items.map((item, idx) => {
            if (item.type === 'divider') return <div key={idx} className='tree-menu-divider' />
            return (
              <div
                key={item.key}
                className={classnames('tree-menu-item', {
                  'tree-menu-item-disabled': item.disabled,
                  'tree-menu-item-danger': item.danger
                })}
                onClick={() => { if (!item.disabled && item.onClick) item.onClick() }}
              >
                <span className='tree-menu-item-icon'>{item.icon}</span>
                <span className='tree-menu-item-label'>{item.label}</span>
                {item.extra && <span className='tree-menu-item-extra'>{item.extra}</span>}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  render () {
    const { tree } = this.state
    if (!tree || !tree['/']) {
      return <div className='tree-view-empty pd2 aligncenter'>{e('notFoundContent')}</div>
    }
    return (
      <div className='tree-view-container' ref={this.containerRef}>
        {this.renderNode(tree['/'])}
        {this.state.contextMenuVisible && this.renderContextMenu()}
      </div>
    )
  }
}
