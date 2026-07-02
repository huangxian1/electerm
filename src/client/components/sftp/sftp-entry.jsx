import React, { Component } from 'react'
import { refs } from '../common/ref'
import generate from '../../common/uid'
import runIdle from '../../common/run-idle'
import { Spin } from 'antd'
import { notification } from '../common/notification'
import Modal from '../common/modal'
import clone from '../../common/to-simple-obj'
import { isEqual, last, isNumber, some, isArray, pick, uniq, debounce } from 'lodash-es'
import FileSection from './file-item'
import resolve from '../../common/resolve'
import wait from '../../common/wait'
import isAbsPath from '../../common/is-absolute-path'
import classnames from 'classnames'
import sorterIndex from '../../common/index-sorter'
import { handleErr } from '../../common/fetch'
import { getLocalFileInfo, getRemoteFileInfo, getFolderFromFilePath } from './file-read'
import {
  typeMap, maxSftpHistory, paneMap,
  fileTypeMap,
  terminalSerialType,
  terminalFtpType,
  unexpectedPacketErrorDesc,
  sftpRetryInterval
} from '../../common/constants'
import { hasFileInClipboardText } from '../../common/clipboard'
import Client from '../../common/sftp'
import ListTable from './list-table-ui'
import deepCopy from 'json-deep-copy'
import isValidPath from '../../common/is-valid-path'
import normalizeRemotePath from '../../common/normalize-remote-path'
import { LoadingOutlined, ReloadOutlined } from '@ant-design/icons'
import * as owner from './owner-list'
import AddressBar from './address-bar'
import getProxy from '../../common/get-proxy'
import { createTerm } from '../terminal/terminal-apis'
import { t } from '../../common/i18n-text'
import './sftp.styl'

const e = t

export default class Sftp extends Component {
  constructor (props) {
    super(props)
    this.state = {
      id: props.id || generate(),
      selectedFiles: new Set(),
      selectedType: '',
      lastClickedFile: null,
      onEditFile: false,
      ...this.defaultState(),
      loadingSftp: false,
      inited: false,
      ready: false,
      showDiskSpace: true,
      diskSpaceData: null,
      diskSpaceLoading: false,
      cpuUsage: '',
      memUsage: '',
      treeView: false,
      remoteTreeView: true,
      expandedDirs: {}
    }
    this.retryCount = 0
    this.remoteListRequestId = 0
    this.remoteListCancelToken = null
    this.treeViewRef = React.createRef()
  }

  componentDidMount () {
    this.id = 'sftp-' + this.props.tab.id
    refs.add(this.id, this)
    if (this.props.isFtp) {
      this.initFtpData()
    }
    this.timer = setTimeout(() => {
      this.setState({
        ready: true
      })
    }, 0)
  }

  componentDidUpdate (prevProps, prevState) {
    if (
      this.props.config.autoRefreshWhenSwitchToSftp &&
      prevProps.pane !== this.props.pane &&
      this.props.pane === paneMap.fileManager &&
      this.state.inited
    ) {
      this.onGoto(typeMap.local)
      this.onGoto(typeMap.remote)
    }
    if (
      prevState.remotePath !== this.state.remotePath &&
      this.state.selectedType === typeMap.remote
    ) {
      this.setState({
        selectedFiles: new Set()
      })
    } else if (
      prevState.localPath !== this.state.localPath &&
      this.state.selectedType === typeMap.local
    ) {
      this.setState({
        selectedFiles: new Set()
      })
    }
    if (
      this.props.sftpPathFollowSsh &&
      prevProps.cwd !== this.props.cwd
    ) {
      this.updateCwd(this.props.cwd)
    }
  }

  componentWillUnmount () {
    refs.remove(this.id)
    this.sftp && this.sftp.destroy()
    this.sftp = null
    this.remoteListCancelToken?.cancel()
    this.remoteListCancelToken = null
    clearTimeout(this.timer4)
    this.timer4 = null
    clearTimeout(this.timer5)
    this.timer5 = null
    clearInterval(this.cpuMemTimer)
    this.cpuMemTimer = null
    // Clear sort cache to prevent memory leaks
    this._sortCache?.clear()
    this._lastSortArgs = null
  }

  initFtpData = async () => {
    this.type = 'ftp'
    const { tab } = this.props
    const { id } = tab
    const opts = clone({
      tabId: id,
      uid: tab.id,
      srcTabId: tab.id,
      termType: 'ftp',
      ...tab
    })
    const r = await createTerm(opts)
      .catch(err => {
        const text = err.message
        handleErr({ message: text })
      })
    if (!r) {
      return
    }
    const {
      port
    } = r
    this.initData(undefined, port)
  }

  directions = [
    'desc',
    'asc'
  ]

  defaultDirection = (i = 0) => {
    return this.directions[i]
  }

  getFileItemById = (id, type) => {
    if (type) {
      return this.state[`${type}FileTree`].get(id)
    }
    return this.getFileItemById(id, typeMap.local) ||
      this.getFileItemById(id, typeMap.remote)
  }

  defaultState = () => {
    const def = this.props.config.showHiddenFilesOnSftpStart
    return Object.keys(typeMap).reduce((prev, k, i) => {
      Object.assign(prev, {
        [`sortProp.${k}`]: window.store.sftpSortSetting[k].prop,
        [`sortDirection.${k}`]: window.store.sftpSortSetting[k].direction,
        [k]: [],
        [`${k}FileTree`]: new Map(),
        [`${k}Loading`]: false,
        [`${k}InputFocus`]: false,
        [`${k}ShowHiddenFile`]: def,
        [`${k}Path`]: '',
        [`${k}PathTemp`]: '',
        [`${k}PathHistory`]: [],
        [`${k}GidTree`]: new Map(),
        [`${k}UidTree`]: new Map(),
        [`${k}Keyword`]: ''
      })
      return prev
    }, {})
  }

  // Cache for memoized sort results
  _sortCache = new Map()
  _lastSortArgs = null

  sort = (list, type, sortDirection, sortProp) => {
    // Create a cache key from the arguments
    const cacheKey = JSON.stringify({
      listLength: list?.length || 0,
      listHash: this._hashList(list),
      type,
      sortDirection,
      sortProp
    })

    // Check if we have a cached result and if args haven't changed
    if (this._lastSortArgs && isEqual(this._lastSortArgs, [list, type, sortDirection, sortProp])) {
      const cached = this._sortCache.get(cacheKey)
      if (cached) {
        return cached
      }
    }

    // Compute the result
    if (!list || !list.length) {
      return []
    }

    const isDesc = sortDirection === 'desc'

    const result = list.slice().sort((a, b) => {
      // Handle items with no id first
      if (!a.id && b.id) return -1
      if (a.id && !b.id) return 1
      if (!a.id && !b.id) return 0

      // Sort directories before files
      if (a.isDirectory !== b.isDirectory) {
        return a.isDirectory ? -1 : 1
      }

      // Sort by the specified property
      let aValue = a[sortProp]
      let bValue = b[sortProp]

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
        return isDesc
          ? bValue.localeCompare(aValue, { sensitivity: 'base' })
          : aValue.localeCompare(bValue, { sensitivity: 'base' })
      }

      // For non-string values, use simple comparison
      if (aValue < bValue) return isDesc ? 1 : -1
      if (aValue > bValue) return isDesc ? -1 : 1
      return 0
    })

    // Cache the result
    this._lastSortArgs = [list, type, sortDirection, sortProp]
    this._sortCache.set(cacheKey, result)

    // Limit cache size to prevent memory leaks
    if (this._sortCache.size > 10) {
      const firstKey = this._sortCache.keys().next().value
      this._sortCache.delete(firstKey)
    }

    return result
  }

  // Helper method to create a simple hash of the list for cache key
  _hashList = (list) => {
    if (!list || !list.length) return 0
    return list.reduce((hash, item, index) => {
      const str = `${item.id || ''}${item.name || ''}${item.modifyTime || ''}${index}`
      return hash + str.length
    }, 0)
  }

  isActive () {
    const { currentBatchTabId, pane, sshSftpSplitView } = this.props
    const { tab } = this.props
    const isFtp = tab.type === terminalFtpType

    return (currentBatchTabId === tab.id && (pane === paneMap.fileManager || sshSftpSplitView)) || isFtp
  }

  updateKeyword = (keyword, type) => {
    this.setState({
      [`${type}Keyword`]: keyword
    })
  }

  getCwdLocal = () => {
    if (
      !this.shouldRenderRemote() &&
      this.props.sftpPathFollowSsh &&
      this.props.cwd
    ) {
      return this.props.cwd
    }
  }

  gotoHome = async (type) => {
    const n = `${type}Path`
    const nt = n + 'Temp'
    let path

    if (type === typeMap.remote) {
      path = this.props.tab.startDirectoryRemote
      if (!path && this.sftp) {
        path = await this.getPwd(this.props.tab.username)
      }
      path = normalizeRemotePath(path)
    } else {
      path = this.getLocalHome()
    }

    this.setState({
      [n]: path,
      [nt]: path
    }, () => this[`${type}List`]())
  }

  updateCwd = (cwd = this.props.cwd) => {
    if (!this.state.inited) {
      return
    }
    const type = this.shouldRenderRemote()
      ? typeMap.remote
      : typeMap.local
    // this.setState({
    //   [`${type}PathTemp`]: cwd
    // }, () => {
    //   this.onGoto(
    //     type
    //   )
    // })
    const n = `${type}Path`
    const nt = n + 'Temp'
    this.setState({
      [n]: cwd,
      [nt]: cwd
    }, () => this[`${type}List`]())
  }

  getPwd = async (username) => {
    if (this.props.sftpPathFollowSsh && this.props.cwd) {
      return this.props.cwd
    }
    const home = await this.sftp.getHomeDir()
    if (home) {
      return home.trim()
    } else {
      return username === 'root'
        ? '/root'
        : `/home/${this.props.tab.username}`
    }
  }

  getIndex = (file) => {
    const { type } = file
    return this.getFileList(type).findIndex(f => f.id === file.id)
  }

  selectAll = (type, e) => {
    e && e.preventDefault && e.preventDefault()
    this.setState({
      selectedFiles: new Set(this.getFileList(type).map(f => f.id))
    })
  }

  selectNext = type => {
    const { selectedFiles } = this.state
    const fileList = this.getFileList(type)
    if (!fileList.length) {
      return
    }

    // Convert Set of IDs to array of indices
    const fileIndices = Array.from(selectedFiles)
      .map(id => fileList.findIndex(f => f.id === id))
      .filter(index => index !== -1)
      .sort(sorterIndex)

    const lastOne = last(fileIndices)
    let next = 0
    if (isNumber(lastOne)) {
      next = (lastOne + 1) % fileList.length
    }

    const nextFile = fileList[next]
    if (nextFile) {
      this.setState({
        selectedFiles: new Set([nextFile.id])
      })
    }
  }

  selectPrev = type => {
    const { selectedFiles } = this.state
    const fileList = this.getFileList(type)
    if (!fileList.length) {
      return
    }

    // Convert Set of IDs to array of indices
    const fileIndices = Array.from(selectedFiles)
      .map(id => fileList.findIndex(f => f.id === id))
      .filter(index => index !== -1)
      .sort(sorterIndex)

    const firstOne = fileIndices[0]
    let next = 0
    const len = fileList.length
    if (isNumber(firstOne)) {
      next = (firstOne - 1 + len) % len
    }

    const nextFile = fileList[next]
    if (nextFile) {
      this.setState({
        selectedFiles: new Set([nextFile.id])
      })
    }
  }

  localDel = async (file) => {
    const { name, isDirectory, path } = file
    const func = !isDirectory
      ? window.fs.unlink
      : window.fs.rmrf
    const p = resolve(path, name)
    await func(p).catch(window.store.onError)
  }

  remoteDel = async (file) => {
    const { name, isDirectory, path } = file
    const { sftp } = this
    const func = isDirectory
      ? sftp.rmdir
      : sftp.rm
    const p = resolve(path, name)
    await func(p).catch(window.store.onError)
  }

  confirmDelete = (files) => {
    return new Promise((resolve) => {
      Modal.confirm({
        title: this.renderDelConfirmTitle(files),
        okText: e('ok'),
        cancelText: e('cancel'),
        onOk: () => resolve(true),
        onCancel: () => resolve(false)
      })
    })
  }

  getSelectedFiles = (selectedFiles = this.state.selectedFiles) => {
    // Convert Set of IDs to array of file objects
    return Array.isArray(selectedFiles)
      ? selectedFiles
      : Array.from(selectedFiles)
        .map(id => this.getFileItemById(id))
        .filter(Boolean) // Filter out any undefined items
  }

  delFiles = async (_type, files = this.getSelectedFiles()) => {
    this.onDelete = true
    const confirm = await this.confirmDelete(files)
    this.onDelete = false
    if (!confirm) {
      return
    }
    const type = files[0]?.type || _type
    const func = this[type + 'Del']
    for (const f of files) {
      await func(f)
    }
    if (type === typeMap.remote) {
      await wait(500)
    }
    this[type + 'List']()
  }

  renderDelConfirmTitle (files = this.getSelectedFiles(), pureText) {
    const hasDirectory = some(files, f => f.isDirectory)
    const names = hasDirectory ? e('filesAndFolders') : e('files')
    if (pureText) {
      const t1 = hasDirectory
        ? e('delTip1')
        : ''
      return `${e('delTip')} ${names} ${t1} (${files.length})`
    }
    return (
      <div className='wordbreak'>
        {e('delTip')}
        {names}
        {
          hasDirectory
            ? e('delTip1')
            : ''
        }
        (<b className='mg1x'>{files.length}</b>)
      </div>
    )
  }

  enter = (type, e) => {
    const { selectedFiles, onEditFile } = this.state
    if (onEditFile || selectedFiles.size !== 1) {
      return
    }
    const fileId = Array.from(selectedFiles)[0]
    const file = this.getFileItemById(fileId)
    if (!file) {
      return
    }
    const { isDirectory } = file
    if (isDirectory) {
      this[type + 'Dom'].enterDirectory(e, file)
    } else {
      this.setState({
        filesToConfirm: [file]
      })
    }
  }

  onInputFocus = (type) => {
    this.setState({
      [type + 'InputFocus']: true
    })
    this.inputFocus = true
  }

  onInputBlur = (type) => {
    this.inputFocus = false
    this.timer4 = setTimeout(() => {
      this.setState({
        [type + 'InputFocus']: false
      })
    }, 200)
  }

  doCopy = (type, e) => {
    const selectedFiles = this.getSelectedFiles()
    this[type + 'Dom'].onCopy(selectedFiles)
  }

  doCut = (type, e) => {
    const selectedFiles = this.getSelectedFiles()
    this[type + 'Dom'].onCut(selectedFiles)
  }

  doPaste = (type) => {
    if (!hasFileInClipboardText()) {
      return
    }
    this[type + 'Dom'].onPaste()
  }

  initData = (terminalId, port) => {
    this.terminalId = terminalId
    this.port = port
    if (this.shouldRenderRemote()) {
      this.initRemoteAll()
    }
    this.initLocalAll()
  }

  shouldRenderRemote = () => {
    const { props } = this
    return props.tab?.host && props.tab?.type !== terminalSerialType
  }

  initLocalAll = () => {
    this.localListOwner()
    this.localList()
  }

  initRemoteAll = async () => {
    await this.remoteList()
    this.remoteListOwner()
    this.handleFetchDiskSpace()
    this.handleFetchCpuMem()
    this.cpuMemTimer = setInterval(this.handleFetchCpuMem, 3000)
  }

  handleFetchDiskSpace = async () => {
    if (!this.sftp || !this.shouldRenderRemote()) {
      return
    }
    this.setState({
      diskSpaceLoading: true
    })
    try {
      const result = await this.sftp.exec('df -h')
      this.setState({
        diskSpaceData: result.stdout || result.stderr,
        diskSpaceLoading: false
      })
    } catch (e) {
      this.setState({
        diskSpaceData: e.message,
        diskSpaceLoading: false
      })
    }
  }

  handleFetchCpuMem = async () => {
    if (!this.sftp || !this.shouldRenderRemote()) {
      return
    }
    try {
      const cpuCmd = 'vmstat 1 2 | tail -1 | awk \'{print 100-$15}\''
      const memCmd = 'awk \'/^MemTotal:/{t=$2} /^MemAvailable:/{a=$2} END{u=t-a; if(u<0)u=t; printf "%dG/%dG", u/1048576, t/1048576}\' /proc/meminfo'
      const [cpuRes, memRes] = await Promise.all([
        this.sftp.exec(cpuCmd),
        this.sftp.exec(memCmd)
      ])
      const cpu = (cpuRes.stdout || '').trim()
      const mem = (memRes.stdout || '').trim()
      this.setState({
        cpuUsage: cpu,
        memUsage: mem
      })
    } catch (e) {
      // ignore
    }
  }

  toggleDiskSpaceView = () => {
    this.setState(prev => ({
      showDiskSpace: !prev.showDiskSpace
    }))
  }

  toggleTreeView = (type) => {
    if (type === typeMap.remote) {
      const newTreeView = !this.state.remoteTreeView
      if (newTreeView) {
        // Switching to tree view - clear cache and load from current path
        this.setState({
          remoteTreeView: true
        }, () => {
          if (this.treeViewRef.current) {
            // Clear cache and reload
            this.treeViewRef.current.clearAndReload(this.state.remotePath)
          }
        })
      } else {
        // Switching to table view - sync path from tree view
        this.setState({ remoteTreeView: false })
      }
    } else {
      this.setState(prev => ({
        treeView: !prev.treeView
      }))
    }
  }

  toggleDirExpanded = (dirId) => {
    this.setState(prev => ({
      expandedDirs: {
        ...prev.expandedDirs,
        [dirId]: !prev.expandedDirs[dirId]
      }
    }))
  }

  modifier = (...args) => {
    // Check if first argument is an object and contains path changes
    if (args[0] && typeof args[0] === 'object') {
      const updates = args[0]

      // Clear respective keyword if path changes
      if (updates.localPath !== undefined) {
        updates.localKeyword = ''
      }
      if (updates.remotePath !== undefined) {
        updates.remoteKeyword = ''
      }

      // For selectedFiles updates, call setState immediately for better responsiveness
      if (updates.selectedFiles !== undefined) {
        return this.setState(...args)
      }
    }

    // For other updates, use runIdle to avoid blocking the UI
    runIdle(() => this.setState(...args))
  }

  addTransferList = list => {
    window.store.addTransferList(list)
  }

  onError = e => {
    window.store.onError(e)
    this.setState({
      remoteLoading: false
    })
  }

  getFileList = type => {
    const showHide = this.state[`${type}ShowHiddenFile`]
    const keyword = this.state[`${type}Keyword`]
    let list = this.state[type]
    list = isArray(list) ? list : []

    // Combine filtering for showHide and keyword in one loop
    if (!showHide || keyword) {
      const lowerKeyword = keyword.toLowerCase()
      list = list.filter(f => {
        if (!showHide && f.name.startsWith('.')) {
          return false
        }
        if (keyword && !f.name.toLowerCase().includes(lowerKeyword)) {
          return false
        }
        return true
      })
    }

    return this.sort(
      list,
      type,
      this.state[`sortDirection.${type}`],
      this.state[`sortProp.${type}`]
    )
  }

  toggleShowHiddenFile = type => {
    const prop = `${type}ShowHiddenFile`
    const b = this.state[prop]
    this.setState({
      [prop]: !b
    })
  }

  buildTree = (arr, type) => {
    const parent = this.renderParentItem(type)
    const treeMap = new Map(arr.map(d => [d.id, d]))

    // Only add parent if it exists
    if (parent) {
      treeMap.set(parent.id, parent)
    }

    return treeMap
  }

  remoteListOwner = async () => {
    const remoteUidTree = await owner.remoteListUsers(
      this.props.pid
    )
    const remoteGidTree = await owner.remoteListGroups(
      this.props.pid
    )
    this.setState({
      remoteGidTree,
      remoteUidTree
    })
  }

  localListOwner = async () => {
    const localUidTree = await owner.localListUsers()
    const localGidTree = await owner.localListGroups()
    this.setState({
      localGidTree,
      localUidTree
    })
  }

  sftpList = (sftp, remotePath) => {
    return sftp.list(remotePath)
      .then(arr => {
        return arr.map(item => {
          const { type } = item
          return {
            ...pick(
              item,
              ['name', 'size', 'accessTime', 'modifyTime', 'mode', 'owner', 'group']
            ),
            isDirectory: type === fileTypeMap.directory,
            type: typeMap.remote,
            path: remotePath,
            isSymbol: type === fileTypeMap.link,
            id: generate()
          }
        })
      })
  }

  createRemoteListCancelToken = () => {
    this.remoteListCancelToken?.cancel()
    const token = {
      cancelled: false,
      cancel: null,
      promise: null
    }
    token.promise = new Promise((resolve, reject) => {
      token.cancel = () => {
        if (token.cancelled) {
          return
        }
        token.cancelled = true
        const error = new Error('remote list cancelled')
        error.isRemoteListCancelled = true
        reject(error)
      }
    })
    this.remoteListCancelToken = token
    return token
  }

  withRemoteListCancel = (promise, token) => {
    return token
      ? Promise.race([promise, token.promise])
      : promise
  }

  remoteList = async (
    returnList = false,
    remotePathReal,
    oldPath
  ) => {
    const requestId = returnList
      ? this.remoteListRequestId
      : ++this.remoteListRequestId
    const isLatestRequest = () => returnList || requestId === this.remoteListRequestId
    const cancelToken = returnList
      ? null
      : this.createRemoteListCancelToken()
    const { tab, sessionOptions } = this.props
    const { username, startDirectory } = tab
    let remotePath
    const noPathInit = remotePathReal || this.state.remotePath
    if (noPathInit) {
      remotePath = noPathInit
    }
    if (!returnList) {
      this.setState({
        remoteLoading: true
      })
    }
    const oldRemote = deepCopy(
      this.state.remote
    )
    let sftp = this.sftp
    try {
      if (!this.sftp) {
        sftp = await this.withRemoteListCancel(
          Client(this.terminalId, this.type, this.port),
          cancelToken
        )
        if (!sftp) {
          return
        }
        const config = deepCopy(
          this.props.config
        )
        this.setState({
          loadingSftp: true
        })
        const opts = deepCopy({
          ...tab,
          readyTimeout: config.sshReadyTimeout,
          terminalId: this.terminalId,
          keepaliveInterval: config.keepaliveInterval,
          proxy: getProxy(tab, config),
          ...sessionOptions
        })
        const r = await this.withRemoteListCancel(
          sftp.connect(opts),
          cancelToken
        ).catch(e => {
          if (
            e &&
            e.message.includes(unexpectedPacketErrorDesc) && this.retryCount
          ) {
            this.retryHandler = setTimeout(
              () => this.initData(
                true
              ),
              sftpRetryInterval
            )
            this.retryCount++
          } else {
            throw e
          }
        })
        this.setState(() => {
          return {
            loadingSftp: false
          }
        })
        if (!r) {
          sftp.destroy()
          return this.props.editTab(tab.id, {
            sftpCreated: false
          })
        } else {
          this.sftp = sftp
        }
      }

      if (!remotePath) {
        if (startDirectory) {
          remotePath = normalizeRemotePath(startDirectory)
        } else {
          remotePath = await this.withRemoteListCancel(
            this.getPwd(username),
            cancelToken
          )
        }
      }

      const remote = await this.withRemoteListCancel(
        this.sftpList(sftp, remotePath),
        cancelToken
      )
      if (!isLatestRequest()) {
        return
      }
      this.sftp = sftp
      const update = {
        remote,
        remoteFileTree: this.buildTree(remote, typeMap.remote),
        inited: true,
        remoteLoading: false
      }
      if (!noPathInit) {
        update.remotePath = remotePath
        update.remotePathTemp = remotePath
      }
      if (returnList) {
        return remote
      } else {
        update.onEditFile = false
      }
      if (oldPath) {
        update.remotePathHistory = uniq([
          oldPath,
          ...this.state.remotePathHistory
        ]).slice(0, maxSftpHistory)
      }
      this.setState(update, () => {
        if (this.type !== 'ftp') {
          this.updateRemoteList(remote, remotePath, sftp, requestId)
        }
        this.props.editTab(tab.id, {
          sftpCreated: true
        })
      })
      this.timer5 = setTimeout(() => {
        if (!isLatestRequest()) {
          return
        }
        if (this.type !== 'ftp') {
          this.updateRemoteList(remote, remotePath, sftp, requestId)
        }
        this.props.editTab(tab.id, {
          sftpCreated: true
        })
      }, 1000)
    } catch (e) {
      if (e && e.isRemoteListCancelled) {
        return
      }
      if (!isLatestRequest()) {
        return
      }
      const update = {
        remoteLoading: false,
        remote: oldRemote,
        loadingSftp: false
      }
      if (oldPath) {
        update.remotePath = oldPath
        update.remotePathTemp = oldPath
      }
      this.setState(update)
      this.onError(e)
    } finally {
      if (cancelToken && this.remoteListCancelToken === cancelToken) {
        this.remoteListCancelToken = null
      }
    }
  }

  updateRemoteList = async (
    remotes,
    remotePath,
    sftp,
    requestId
  ) => {
    const isLatestRequest = () => !requestId || requestId === this.remoteListRequestId
    const remote = []
    for (const r of remotes) {
      if (!isLatestRequest()) {
        return
      }
      const { name } = r
      if (r.isSymbol) {
        const linkPath = resolve(remotePath, name)
        let realpath = await sftp.readlink(linkPath)
          .catch(e => {
            console.debug(e)
            return null
          })
        if (!realpath) {
          continue
        }
        if (!isAbsPath(realpath)) {
          realpath = resolve(remotePath, realpath)
          realpath = await sftp.realpath(realpath)
            .catch(e => {
              console.debug(e)
              return null
            })
        }
        if (!realpath) {
          continue
        }
        const realFileInfo = await getRemoteFileInfo(
          sftp,
          realpath
        ).catch(e => {
          console.debug('seems a bad symbolic link')
          console.debug(e)
          return null
        })
        if (!realFileInfo) {
          continue
        }
        r.isSymbolicLink = true
        r.isDirectory = realFileInfo.isDirectory
      } else {
        r.isSymbolicLink = false
      }
      remote.push(r)
    }
    if (!isLatestRequest()) {
      return
    }
    const update = {
      remote,
      remoteFileTree: this.buildTree(remote, typeMap.remote)
    }
    this.setState(update)
  }

  getLocalHome = () => {
    return this.props.tab.startDirectoryLocal ||
    this.props.config.startDirectoryLocal ||
    window.pre.homeOrTmp
  }

  localList = async (returnList = false, localPathReal, oldPath) => {
    if (!window.fs) return
    if (!returnList) {
      this.setState({
        localLoading: true
      })
    }
    const oldLocal = deepCopy(
      this.state.local
    )
    try {
      const noPathInit = localPathReal || this.state.localPath
      const localPath = noPathInit ||
        this.getCwdLocal() ||
        this.getLocalHome()
      const locals = await window.fs.readdirAsync(localPath)
      const local = []
      for (const name of locals) {
        const p = resolve(localPath, name)
        const fileObj = await getLocalFileInfo(p).catch(console.log)
        if (fileObj) {
          local.push(fileObj)
        }
      }
      const update = {
        local,
        inited: true,
        localFileTree: this.buildTree(local, typeMap.local),
        localLoading: false
      }
      if (!noPathInit) {
        update.localPath = localPath
        update.localPathTemp = localPath
      }
      if (returnList) {
        return local
      } else {
        update.onEditFile = false
      }
      if (oldPath) {
        update.localPathHistory = uniq([
          oldPath,
          ...this.state.localPathHistory
        ]).slice(0, maxSftpHistory)
      }
      this.setState(update)
    } catch (e) {
      const update = {
        localLoading: false,
        local: oldLocal
      }
      if (oldPath) {
        update.localPath = oldPath
        update.localPathTemp = oldPath
      }
      this.setState(update)
      this.onError(e)
    }
  }

  remoteListDebounce = debounce(this.remoteList, 1000)

  localListDebounce = debounce(this.localList, 1000)

  timers = {}

  onChange = (e, prop) => {
    this.setState({
      [prop]: e.target.value
    })
  }

  onClickHistory = (type, path) => {
    const n = `${type}Path`
    const oldPath = this.state[type + 'Path']
    this.setState({
      [n]: path,
      [`${n}Temp`]: path
    }, () => this[`${type}List`](undefined, undefined, oldPath))
  }

  handleReloadRemoteSftp = async () => {
    // Check if terminal user has changed
    const terminalUser = await this.getTerminalUser()
    const { tab } = this.props
    const sftpUser = tab.username

    if (terminalUser && terminalUser !== sftpUser) {
      // Terminal user changed, re-establish SFTP with new user
      await this.reconnectSftpAsUser(terminalUser)
      return
    }

    // If in tree view, refresh expanded dirs without collapsing
    if (this.state.remoteTreeView) {
      this.setState({ remoteLoading: true })
      try {
        // Reload current directory
        await this.remoteList()
        // Refresh expanded dirs in tree view
        const treeViewRef = this.treeViewRef.current
        if (treeViewRef) {
          await treeViewRef.refreshExpandedDirs()
        }
      } catch (err) {
        this.onError(err)
      }
      this.setState({ remoteLoading: false })
      return
    }

    if (this.sftp) {
      this.sftp.destroy()
      this.sftp = null
    }
    this.setState({
      remoteLoading: true,
      remote: [],
      remoteFileTree: new Map()
    }, () => {
      this.initRemoteAll()
    })
  }

  // Get current terminal user by running whoami
  getTerminalUser = async () => {
    try {
      const { runCmd } = await import('../terminal/terminal-apis')
      const pid = this.terminalId
      const result = await runCmd(pid, 'whoami')
      return result?.trim()
    } catch (err) {
      console.error('Failed to get terminal user:', err)
      return null
    }
  }

  // Reconnect SFTP as a different user
  reconnectSftpAsUser = async (newUsername) => {
    // Destroy current SFTP connection
    if (this.sftp) {
      this.sftp.destroy()
      this.sftp = null
    }

    // Update tab with new username (keep existing password/keys)
    const { tab } = this.props
    this.props.editTab(tab.id, {
      username: newUsername
    })

    // Reset and re-establish connection
    this.setState({
      remoteLoading: true,
      remote: [],
      remoteFileTree: new Map(),
      inited: false
    })

    // Small delay to ensure tab is updated
    setTimeout(() => {
      this.initRemoteAll()
    }, 100)
  }

  handleUploadFromBrowser = () => {
    if (window.et.handleUploadFromBrowser) {
      return window.et.handleUploadFromBrowser(
        this.state.localPath,
        this.localList
      )
    }
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.onchange = async () => {
      const files = input.files
      if (!files || !files.length) return
      const { localPath } = this.state
      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('path', localPath)
        await window.api.fetch('/api/upload', {
          method: 'POST',
          body: formData
        }).catch(handleErr)
      }
      this.localList()
    }
    input.click()
  }

  parsePath = async (type, pth) => {
    const reg = /^%([^%]+)%/
    if (!reg.test(pth)) {
      return pth
    }
    const m = pth.match(reg)
    if (!m || !m[1]) {
      return pth
    }
    const envName = m[1]
    const envPath = await window.pre.runGlobalAsync('getEnv', envName)
    if (envPath) {
      return pth.replace(reg, envPath)
    }
    return pth
  }

  onGoto = async (type, e) => {
    e && e.preventDefault()
    if (type === typeMap.remote && !this.sftp) {
      return this.initData(true)
    }
    const n = `${type}Path`
    const nt = n + 'Temp'
    const oldPath = this.state[type + 'Path']
    let np = await this.parsePath(type, this.state[nt])
    if (type === typeMap.remote) {
      np = normalizeRemotePath(np)
    }
    if (!isValidPath(np)) {
      return notification.warning({
        message: 'path not valid'
      })
    }

    // If in tree view mode, expand to path instead of loading new list
    const isTreeView = type === typeMap.remote ? this.state.remoteTreeView : this.state.treeView
    if (isTreeView && this.treeViewRef.current) {
      this.setState({
        [n]: np,
        [nt]: np,
        [`${type}Keyword`]: ''
      }, () => {
        this.treeViewRef.current.expandToPath(np)
      })
      return
    }

    this.setState({
      [n]: np,
      [nt]: np,
      [`${type}Keyword`]: ''
    }, () => this[`${type}List`](undefined, undefined, oldPath))
  }

  goParent = (type) => {
    const n = `${type}Path`
    const p = this.state[n]
    let np = resolve(p, '..')
    if (type === typeMap.remote) {
      np = normalizeRemotePath(np)
    }
    const op = this.state[n]
    if (np !== p) {
      this.setState({
        [n]: np,
        [n + 'Temp']: np
      }, () => this[`${type}List`](
        undefined,
        undefined,
        op
      ))
    }
  }

  getFileProps = (file, type) => {
    return {
      ...this.props,
      file,
      type,
      ...pick(this, [
        'sftp',
        'modifier',
        'localList',
        'remoteList',
        'localDel',
        'remoteDel',
        'delFiles',
        'getIndex',
        'selectAll',
        'getFileList',
        'onGoto',
        'addTransferList',
        'renderDelConfirmTitle',
        'getSelectedFiles',
        'getFileItemById'
      ]),
      ...pick(this.state, [
        'id',
        'localPath',
        'remotePath',
        'localFileTree',
        'remoteFileTree',
        'localOrder',
        'remoteOrder',
        'sortData',
        typeMap.local,
        typeMap.remote,
        'lastClickedFile',
        'lastMataKey',
        'targetTransferType',
        'selectedFiles',
        'localGidTree',
        'remoteUidTree',
        'localUidTree',
        'remoteGidTree'
      ])
    }
  }

  renderEmptyFile = (type, extra = {}) => {
    const uniqueId = this.getPathUid(type, 'empty')
    const item = {
      type,
      name: '',
      isDirectory: true,
      id: uniqueId,
      isEmpty: true
    }
    const allProps = {
      ...this.getFileProps(item, type),
      ...extra,
      cls: 'virtual-file-unit',
      key: 'empty' + type,
      isEmpty: true,
      draggable: false,
      ref: ref => {
        this[type + 'Dom'] = ref
      }
    }
    return (
      <div
        className={`virtual-file virtual-file-${type}`}
      >
        <FileSection
          {...allProps}
          key={uniqueId}
        />
      </div>
    )
  }

  getPathUid = (type, type1) => {
    const currentPath = this.state[`${type}Path`]
    const parentPath = resolve(currentPath, '..')
    const { id } = this.props.tab
    return `${type1}-${parentPath}-${id}-${type}`
  }

  renderParentItem = (type) => {
    const currentPath = this.state[`${type}Path`]
    const parentPath = resolve(currentPath, '..')
    // Don't render parent item if we're at the root
    if (parentPath === currentPath) {
      return null
    }

    const uniqueId = this.getPathUid(type, 'parent')

    return {
      type,
      isDirectory: true,
      ...getFolderFromFilePath(parentPath, type === typeMap.remote),
      id: uniqueId,
      size: 0,
      modifyTime: 0,
      accessTime: 0,
      mode: 0,
      owner: '',
      group: '',
      isParent: true
    }
  }

  renderHistory = (type) => {
    const currentPath = this.state[type + 'Path']
    const options = this.state[type + 'PathHistory']
      .filter(o => o !== currentPath)
    const focused = this.state[type + 'InputFocus']
    if (!options.length) {
      return null
    }
    const cls = classnames(
      'sftp-history',
      `sftp-history-${type}`,
      { focused }
    )
    return (
      <div
        className={cls}
      >
        {
          options.map(o => {
            return (
              <div
                key={o}
                className='sftp-history-item'
                onClick={() => this.onClickHistory(type, o)}
              >
                {o}
              </div>
            )
          })
        }
      </div>
    )
  }

  renderSftpPanelTitle (type, username, host) {
    const { cpuUsage, memUsage } = this.state
    if (type === typeMap.remote) {
      return (
        <div className='sftp-panel-title pd1t pd1b pd1x alignright'>
          {cpuUsage && (
            <span className='mg1r sftp-panel-cpu-mem'>CPU: {cpuUsage}%</span>
          )}
          {memUsage && (
            <span className='mg1r sftp-panel-cpu-mem'>MEM: {memUsage}</span>
          )}
          <ReloadOutlined
            className='mg1r pointer'
            onClick={this.handleReloadRemoteSftp}
          />
          {e('remote')}: {username}@{host}
        </div>
      )
    }
    const { showDiskSpace, diskSpaceLoading } = this.state
    return (
      <div className='sftp-panel-title pd1t pd1b pd1x'>
        <span
          className={`sftp-tab ${showDiskSpace ? 'sftp-tab-active' : ''}`}
          onClick={() => { if (!showDiskSpace) this.toggleDiskSpaceView() }}
        >
          {e('diskSpace')}
        </span>
        <span className='sftp-tab-separator'>|</span>
        <span
          className={`sftp-tab ${!showDiskSpace ? 'sftp-tab-active' : ''}`}
          onClick={() => { if (showDiskSpace) this.toggleDiskSpaceView() }}
        >
          {e('localFiles')}
        </span>
        {showDiskSpace && (
          <ReloadOutlined
            className='mg1l pointer'
            onClick={this.handleFetchDiskSpace}
            title={e('refresh')}
            spin={diskSpaceLoading}
          />
        )}
      </div>
    )
  }

  parseDfOutput (output) {
    if (!output) return { headers: [], rows: [] }
    const lines = output.trim().split('\n')
    if (lines.length === 0) return { headers: [], rows: [] }
    const headers = lines[0].split(/\s+/)
    const rows = lines.slice(1).map(line => line.split(/\s+/))
    return { headers, rows }
  }

  renderDiskSpace () {
    const { diskSpaceData, diskSpaceLoading } = this.state
    if (diskSpaceLoading) {
      return (
        <div className='disk-space-loading pd2'>
          <LoadingOutlined /> {e('loading')}
        </div>
      )
    }
    if (!diskSpaceData) {
      return (
        <div className='disk-space-empty pd2'>
          {e('noDiskSpaceData')}
        </div>
      )
    }
    const { headers, rows } = this.parseDfOutput(diskSpaceData)
    return (
      <div className='disk-space-wrap'>
        <div className='disk-space-table'>
          <div className='disk-space-header'>
            {headers.map((h, i) => (
              <div key={i} className='disk-space-header-item'>{h}</div>
            ))}
          </div>
          {rows.map((row, idx) => (
            <div key={idx} className='disk-space-row'>
              {row.map((cell, i) => (
                <div key={i} className='disk-space-cell'>{cell}</div>
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  renderSection (type, style, width) {
    const {
      id
    } = this.state
    const arr = this.getFileList(type)
    const loading = this.state[`${type}Loading`]
    const { host, username } = this.props.tab
    const showDiskSpaceView = type === typeMap.local && this.state.showDiskSpace && this.shouldRenderRemote()
    const isRemote = type === typeMap.remote
    const treeView = isRemote ? this.state.remoteTreeView : this.state.treeView
    const listProps = {
      store: window.store,
      id,
      type,
      parentItem: this.renderParentItem(type),
      treeView,
      treeViewRef: this.treeViewRef,
      expandedDirs: this.state.expandedDirs,
      toggleDirExpanded: this.toggleDirExpanded,
      sftp: this.sftp,
      modifier: this.modifier,
      remoteList: this.remoteList,
      localList: this.localList,
      addTransferList: this.addTransferList,
      remotePath: this.state.remotePath,
      localPath: this.state.localPath,
      getFolderFromFilePath,
      currentPath: isRemote ? this.state.remotePath : this.state.localPath,
      ...this.props,
      ...pick(
        this,
        [
          'directions',
          'renderEmptyFile',
          'getFileProps',
          'defaultDirection',
          'modifier',
          'sort'
        ]
      ),
      sortProp: this.state[`sortProp.${type}`],
      sortDirection: this.state[`sortDirection.${type}`],
      width,
      fileList: arr
    }
    const addrProps = {
      host,
      type,
      handleUploadFromBrowser: this.handleUploadFromBrowser,
      treeView,
      toggleTreeView: () => this.toggleTreeView(type),
      ...pick(
        this,
        [
          'onChange',
          'onGoto',
          'gotoHome',
          'onInputFocus',
          'onInputBlur',
          'toggleShowHiddenFile',
          'goParent',
          'onClickHistory',
          'updateKeyword'
        ]
      ),
      ...pick(
        this.state,
        [
          `${type}ShowHiddenFile`,
          'onGoto',
          `${type}PathTemp`,
          `${type}Path`,
          `${type}PathHistory`,
          `${type}InputFocus`,
          'loadingSftp',
          `${type}Keyword`
        ]
      )
    }
    return (
      <div
        className={`sftp-section sftp-${type}-section tw-${type}`}
        style={style}
        key={type}
        {...style}
      >
        <Spin spinning={loading}>
          <div className='pd1 sftp-panel'>
            {
              this.renderSftpPanelTitle(type, username, host)
            }
            {showDiskSpaceView
              ? (
                <div className='disk-space-wrap'>
                  {this.renderDiskSpace()}
                </div>
                )
              : (
                <>
                  <AddressBar
                    {...addrProps}
                  />
                  <div
                    className={`file-list ${type} relative`}
                  >
                    <ListTable
                      {...listProps}
                    />
                  </div>
                </>
                )}
          </div>
        </Spin>
      </div>
    )
  }

  renderSections () {
    if (!this.isActive()) {
      return null
    }
    const arr = [
      typeMap.local,
      typeMap.remote
    ]
    const {
      height, width
    } = this.props
    const shouldRenderRemote = this.shouldRenderRemote()
    if (!shouldRenderRemote) {
      return (
        this.renderSection(arr[0], {
          width,
          left: 0,
          top: 0,
          height
        }, width)
      )
    }
    return arr.map((t, i) => {
      const style = {
        width: width / 2,
        left: i * width / 2,
        top: 0,
        height
      }
      return this.renderSection(t, style, width / 2)
    })
  }

  render () {
    const {
      id,
      ready
    } = this.state
    if (!ready) {
      return (
        <div className='pd3 aligncenter'>
          <LoadingOutlined />
        </div>
      )
    }
    const { height } = this.props
    const all = {
      className: 'sftp-wrap overhide relative',
      id: `id-${id}`,
      style: { height }
    }
    return (
      <div
        {...all}
      >
        {
          this.renderSections()
        }
      </div>
    )
  }
}
