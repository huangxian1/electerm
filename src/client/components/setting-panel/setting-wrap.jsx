/**
 * settings page
 */

import { Component } from 'react'
import Drawer from '../common/drawer'
import { CloseCircleOutlined } from '@ant-design/icons'
import {
  sidebarWidth,
  sidebarWidthWithLabels
} from '../../common/constants'
import AppDrag from '../tabs/app-drag'
import './setting-wrap.styl'

export default class SettingWrap extends Component {
  renderDrag () {
    return (
      <AppDrag />
    )
  }

  render () {
    const currentSidebarWidth = this.props.sidebarShowLabels
      ? sidebarWidthWithLabels
      : sidebarWidth
    const pops = {
      open: this.props.visible,
      onClose: this.props.onCancel,
      className: 'setting-wrap',
      size: this.props.innerWidth - currentSidebarWidth,
      zIndex: 888,
      placement: 'left'
    }
    return (
      <Drawer
        {...pops}
      >
        <CloseCircleOutlined
          className='close-setting-wrap-icon close-setting-wrap'
          onClick={this.props.onCancel}
        />
        <CloseCircleOutlined
          className='close-setting-wrap alt-close-setting-wrap'
          onClick={this.props.onCancel}
        />
        {
          this.props.useSystemTitleBar ? null : <AppDrag />
        }
        {this.props.children}
      </Drawer>
    )
  }
}
