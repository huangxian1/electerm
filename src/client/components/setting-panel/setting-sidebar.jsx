import React, { Component } from 'react'
import {
  Switch
} from 'antd'
import {
  sidebarButtonKeys,
  getSidebarButtonLabel,
  getSidebarButtonVisible
} from '../sidebar/sidebar-buttons'
import './setting.styl'

const e = window.translate

export default class SettingSidebar extends Component {
  onChangeValue = (value, name) => {
    this.props.store.setConfig({
      [name]: value
    })
  }

  onChangeButton = (key, value) => {
    const buttons = {
      ...(this.props.config.sidebarButtons || {}),
      [key]: value
    }
    this.props.store.setConfig({
      sidebarButtons: buttons
    })
  }

  renderToggle = (checked, text, onChange) => {
    return (
      <div className='sidebar-setting-row'>
        <span className='sidebar-setting-label'>{text}</span>
        <Switch
          checked={checked}
          checkedChildren={e('show')}
          unCheckedChildren={e('hide')}
          onChange={onChange}
        />
      </div>
    )
  }

  render () {
    const { config } = this.props
    const {
      sidebarShowLabels,
      sidebarButtons
    } = config
    return (
      <div className='setting-common setting-sidebar-config pd3x'>
        <h2>侧边栏</h2>
        {this.renderToggle(
          sidebarShowLabels !== false,
          '显示按钮名字',
          value => this.onChangeValue(value, 'sidebarShowLabels')
        )}
        <h2 className='mg2t'>按钮显示</h2>
        {
          sidebarButtonKeys.map(key => {
            return this.renderToggle(
              getSidebarButtonVisible(sidebarButtons, key),
              getSidebarButtonLabel(key),
              value => this.onChangeButton(key, value)
            )
          })
        }
      </div>
    )
  }
}
