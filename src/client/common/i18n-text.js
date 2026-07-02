/**
 * i18n text helper - returns text based on current language
 * Falls back to Chinese for zh_cn, English for others
 */

import { get as _get } from 'lodash-es'

const zhTexts = {
  diskSpace: '磁盘空间',
  localFiles: '本地文件',
  network: '网络',
  activities: '活动',
  runningTime: '运行时间',
  fileSystem: '文件系统',
  mounted: '挂载点',
  usedPercent: '使用率',
  memory: '内存',
  swap: '交换空间',
  menu: '菜单',
  bookmarks: '书签',
  newBookmark: '新书签',
  quickConnect: '快速连接',
  fileTransfers: '文件传输',
  uiThemes: 'UI主题',
  setting: '设置',
  settingSync: '设置同步',
  widgets: '小工具',
  about: '关于',
  upgrade: '升级',
  refresh: '刷新',
  loading: '加载中...',
  noDiskSpaceData: '无法获取磁盘空间信息',
  treeView: '树形视图',
  remote: '远程',
  local: '本地',
  switchUser: '切换用户',
  username: '用户名',
  password: '密码',
  delTip: '确定要删除吗？',
  files: '个文件',
  folder: '个文件夹',
  ok: '确定',
  cancel: '取消'
}

const enTexts = {
  diskSpace: 'Disk Space',
  localFiles: 'Local Files',
  network: 'Network',
  activities: 'Activities',
  runningTime: 'Uptime',
  fileSystem: 'Filesystem',
  mounted: 'Mounted',
  usedPercent: 'Use%',
  memory: 'Memory',
  swap: 'Swap',
  menu: 'Menu',
  bookmarks: 'Bookmarks',
  newBookmark: 'New Bookmark',
  quickConnect: 'Quick Connect',
  fileTransfers: 'File Transfers',
  uiThemes: 'UI Themes',
  setting: 'Settings',
  settingSync: 'Settings Sync',
  widgets: 'Widgets',
  about: 'About',
  upgrade: 'Upgrade',
  refresh: 'Refresh',
  loading: 'Loading...',
  noDiskSpaceData: 'No disk space data',
  treeView: 'Tree View',
  remote: 'Remote',
  local: 'Local',
  switchUser: 'Switch User',
  username: 'Username',
  password: 'Password',
  delTip: 'Are you sure to delete?',
  files: 'files',
  folder: 'folders',
  ok: 'OK',
  cancel: 'Cancel'
}

function isChinese () {
  const lang = window.store?.config.language || window.pre?.defaultLang || 'en_us'
  return lang.startsWith('zh')
}

export function t (key) {
  // Try window.translate first if langMap is loaded
  if (window.langMap && window.getLang) {
    const lang = window.getLang()
    const str = _get(lang, `[${key}]`)
    if (str) return str
  }
  // Fallback based on language
  return isChinese() ? (zhTexts[key] || key) : (enTexts[key] || key)
}

export default t
