const e = window.translate

export const sidebarButtonKeys = [
  'menu',
  'bookmarks',
  'newBookmark',
  'quickConnect',
  'fileTransfers',
  'terminalThemes',
  'setting',
  'settingSync',
  'widgets',
  'about',
  'upgrade'
]

export const getSidebarButtonLabel = (key) => {
  const labels = {
    menu: e('menu'),
    bookmarks: e('bookmarks'),
    newBookmark: e('newBookmark'),
    quickConnect: e('quickConnect'),
    fileTransfers: e('fileTransfers'),
    terminalThemes: e('uiThemes'),
    setting: e('setting'),
    settingSync: e('settingSync'),
    widgets: e('widgets'),
    about: e('about'),
    upgrade: e('upgrade')
  }
  return labels[key] || key
}

export const getSidebarButtonVisible = (buttons, key) => {
  return !buttons || buttons[key] !== false
}
