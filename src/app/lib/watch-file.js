const fs = require('original-fs')
const globalState = require('./glob-state')
const _ = require('./lodash.js')

const onWatch = _.debounce(() => {
  try {
    const filePath = globalState.get('watchFilePath')
    if (fs.existsSync(filePath)) {
      const text = fs.readFileSync(filePath, 'utf8')
      globalState.get('win').webContents.send('file-change', text)
    } else {
      console.log('Watched file no longer exists')
      globalState.get('win').webContents.send('file-deleted')
    }
  } catch (e) {
    console.error('Error reading file:', e)
    globalState.get('win').webContents.send('file-read-error', e.message)
  }
}, 300, { leading: false, trailing: true })

exports.watchFile = (path) => {
  const oldPath = globalState.get('watchFilePath')
  if (oldPath && oldPath !== path) {
    fs.unwatchFile(oldPath, onWatch)
  }
  globalState.set('watchFilePath', path)
  fs.watchFile(path, onWatch)
}

exports.unwatchFile = (path) => {
  const filePath = path || globalState.get('watchFilePath')
  if (filePath) {
    fs.unwatchFile(filePath, onWatch)
  }
  globalState.set('watchFilePath', '')
}

exports.cleanWatchFile = () => {
  const filePath = globalState.get('watchFilePath')
  if (!filePath) {
    return
  }
  fs.unwatchFile(filePath, onWatch)
  globalState.set('watchFilePath', '')
}

process.on('exit', exports.cleanWatchFile)
