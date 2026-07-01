import {
  settingSyncId,
  settingShortcutsId,
  settingTerminalId,
  settingAiId,
  settingPasswordsId,
  settingSidebarId
} from '../common/constants'

const e = window.translate

export default () => ([
  {
    id: settingTerminalId,
    title: e('terminal')
  },
  {
    id: settingSidebarId,
    title: '侧边栏'
  },
  {
    id: settingShortcutsId,
    title: e('settingShortcuts')
  },
  {
    id: settingSyncId,
    title: e('settingSync')
  },
  {
    id: settingAiId,
    title: 'AI'
  },
  {
    id: settingPasswordsId,
    title: e('password')
  }
])
