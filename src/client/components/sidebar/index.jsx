import {
  useEffect
} from 'react'
import {
  BookOutlined,
  CloudSyncOutlined,
  InfoCircleOutlined,
  PictureOutlined,
  PlusCircleOutlined,
  SettingOutlined,
  UpCircleOutlined,
  AppstoreOutlined,
  ThunderboltOutlined
} from '@ant-design/icons'
import { Tooltip, Popover } from 'antd'
import SideBarPanel from './sidebar-panel'
import TransferList from './transfer-list'
import MenuBtn from '../sys-menu/menu-btn'
import QuickConnect from '../tabs/quick-connect'
import {
  sidebarWidth,
  sidebarWidthWithLabels,
  settingMap,
  modals
} from '../../common/constants'
import SideIcon from './side-icon'
import SidePanel from './side-panel'
import hasActiveInput from '../../common/has-active-input'
import {
  getSidebarButtonLabel,
  getSidebarButtonVisible
} from './sidebar-buttons'
import './sidebar.styl'

const e = window.translate

export default function Sidebar (props) {
  const {
    height,
    upgradeInfo,
    settingTab,
    settingItem,
    isSyncingSetting,
    leftSidebarWidth,
    pinned,
    fileTransfers,
    openedSideBar,
    transferHistory,
    transferTab,
    showModal,
    showInfoModal,
    sidebarPanelTab,
    openWidgetsModal
  } = props

  const { store } = window
  const {
    sidebarShowLabels,
    sidebarButtons
  } = store.config
  const showLabels = sidebarShowLabels !== false
  const currentSidebarWidth = showLabels ? sidebarWidthWithLabels : sidebarWidth
  const isVisible = key => getSidebarButtonVisible(sidebarButtons, key)

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', `${currentSidebarWidth}px`)
  }, [currentSidebarWidth])

  const handleClickOutside = (event) => {
    // Don't close if pinned or has active input
    if (store.pinned || hasActiveInput()) {
      return
    }

    // Check if click is outside the sidebar panel
    const sidebarPanel = document.querySelector('.sidebar-panel')
    if (sidebarPanel && !sidebarPanel.contains(event.target)) {
      store.setOpenedSideBar('')
      document.removeEventListener('click', handleClickOutside)
    }
  }

  const handleClickBookmark = () => {
    if (showModal) {
      store.showModal = 0
    }
    if (pinned) {
      return
    }
    if (openedSideBar === 'bookmarks') {
      // Remove listener when closing
      document.removeEventListener('click', handleClickOutside)
      store.setOpenedSideBar('')
    } else {
      // Add listener when opening, with slight delay to avoid conflict with this click
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside)
      }, 0)
      store.setOpenedSideBar('bookmarks')
    }
  }

  const handleShowUpgrade = () => {
    window.store.upgradeInfo.showUpgradeModal = true
  }

  const {
    onNewSsh,
    openSetting,
    openAbout,
    openSettingSync,
    openTerminalThemes,
    setLeftSidePanelWidth
  } = store
  const {
    showUpgradeModal,
    upgradePercent,
    checkingRemoteVersion,
    shouldUpgrade
  } = upgradeInfo
  const showSetting = showModal === modals.setting
  const settingActive = showSetting && settingTab === settingMap.setting && settingItem.id === 'setting-common'
  const syncActive = showSetting && settingTab === settingMap.setting && settingItem.id === 'setting-sync'
  const themeActive = showSetting && settingTab === settingMap.terminalThemes
  const bookmarksActive = showSetting && settingTab === settingMap.bookmarks
  const widgetsActive = showSetting && settingTab === settingMap.widgets
  const sideProps = openedSideBar
    ? {
        className: 'sidebar-list',
        style: {
          width: `${leftSidebarWidth}px`
        }
      }
    : {
        className: 'sidebar-list'
      }
  const sidebarProps = {
    className: `sidebar type-${openedSideBar}${showLabels ? ' with-labels' : ''}`,
    style: {
      width: currentSidebarWidth,
      height
    }
  }
  const transferProps = {
    fileTransfers,
    transferTab,
    transferHistory,
    showLabel: showLabels
  }
  const sideIconCommonProps = key => ({
    label: getSidebarButtonLabel(key),
    showLabel: showLabels
  })
  return (
    <div {...sidebarProps}>
      <div className='sidebar-bar btns'>
        {
          isVisible('menu')
            ? (
              <div className='control-icon-wrap'>
                <MenuBtn store={store} config={store.config} />
                {
                  showLabels
                    ? (
                      <div className='control-icon-label'>
                        {getSidebarButtonLabel('menu')}
                      </div>
                      )
                    : null
                }
              </div>
              )
            : null
        }
        <SideIcon
          title={e(settingMap.bookmarks)}
          active={bookmarksActive}
          show={isVisible('bookmarks')}
          {...sideIconCommonProps('bookmarks')}
        >
          <BookOutlined
            onClick={handleClickBookmark}
            className='font20 iblock control-icon'
          />
        </SideIcon>
        <SideIcon
          title={e('newBookmark')}
          show={isVisible('newBookmark')}
          {...sideIconCommonProps('newBookmark')}
        >
          <PlusCircleOutlined
            className='font22 iblock control-icon'
            onClick={onNewSsh}
          />
        </SideIcon>
        {
          isVisible('quickConnect')
            ? (
              <Popover
                content={<QuickConnect inputOnly />}
                trigger='click'
                placement='right'
              >
                <div className='control-icon-wrap' title={e('quickConnect')}>
                  <ThunderboltOutlined
                    className='font20 iblock control-icon'
                  />
                  {
                    showLabels
                      ? (
                        <div className='control-icon-label'>
                          {getSidebarButtonLabel('quickConnect')}
                        </div>
                        )
                      : null
                  }
                </div>
              </Popover>
              )
            : null
        }
        {
          isVisible('fileTransfers')
            ? <TransferList {...transferProps} />
            : null
        }
        <SideIcon
          title={e(settingMap.terminalThemes)}
          active={themeActive}
          show={isVisible('terminalThemes')}
          {...sideIconCommonProps('terminalThemes')}
        >
          <PictureOutlined
            className='font20 iblock pointer control-icon'
            onClick={openTerminalThemes}
          />
        </SideIcon>
        <SideIcon
          title={e(settingMap.setting)}
          active={settingActive}
          show={isVisible('setting')}
          {...sideIconCommonProps('setting')}
        >
          <SettingOutlined className='iblock font20 control-icon' onClick={openSetting} />
        </SideIcon>
        <SideIcon
          title={e('settingSync')}
          active={syncActive}
          show={isVisible('settingSync')}
          {...sideIconCommonProps('settingSync')}
        >
          <CloudSyncOutlined
            className='iblock font20 control-icon'
            onClick={openSettingSync}
            spin={isSyncingSetting}
          />
        </SideIcon>
        <SideIcon
          title={e('widgets')}
          active={widgetsActive}
          show={isVisible('widgets')}
          {...sideIconCommonProps('widgets')}
        >
          <AppstoreOutlined className='iblock font20 control-icon' onClick={openWidgetsModal} />
        </SideIcon>

        <SideIcon
          title={e('about')}
          active={showInfoModal}
          show={isVisible('about')}
          {...sideIconCommonProps('about')}
        >
          <InfoCircleOutlined
            className='iblock font16 control-icon open-about-icon'
            onClick={openAbout}
          />
        </SideIcon>
        {
          isVisible('upgrade') && !checkingRemoteVersion && !showUpgradeModal && shouldUpgrade
            ? (
              <Tooltip
                title={`${e('upgrading')} ${upgradePercent || 0}%`}
                placement='right'
              >
                <div
                  className='control-icon-wrap'
                >
                  <UpCircleOutlined
                    className='iblock font18 control-icon upgrade-icon'
                    onClick={handleShowUpgrade}
                  />
                  {
                    showLabels
                      ? (
                        <div className='control-icon-label'>
                          {getSidebarButtonLabel('upgrade')}
                        </div>
                        )
                      : null
                  }
                </div>
              </Tooltip>
              )
            : null
        }
      </div>
      <SidePanel
        sideProps={sideProps}
        setLeftSidePanelWidth={setLeftSidePanelWidth}
        leftSidebarWidth={leftSidebarWidth}
      >
        <SideBarPanel
          pinned={pinned}
          sidebarPanelTab={sidebarPanelTab}
        />
      </SidePanel>
    </div>
  )
}
