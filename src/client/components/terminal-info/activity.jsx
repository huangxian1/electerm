/**
 * process cpu/mem activities
 */

import { Table, Tooltip, Popconfirm } from 'antd'
import { isEmpty } from 'lodash-es'
import { CloseCircleOutlined, BarsOutlined } from '@ant-design/icons'
import colsParser from './data-cols-parser'
import { t } from '../../common/i18n-text'

export default function TerminalInfoActivities (props) {
  const { activities, isRemote, terminalInfos } = props
  if (isEmpty(activities) || !isRemote || !terminalInfos.includes('activities')) {
    return null
  }
  const col = colsParser(activities[0])
  col.unshift({
    dataIndex: 'kill',
    key: 'kill',
    title: t('close'),
    render: (txt, inst) => {
      return (
        <Tooltip
          title={t('close')}
        >
          <Popconfirm
            title={t('close') + ' pid:' + inst.pid + ' ?'}
            onConfirm={() => props.killProcess(inst.pid)}
          >
            <CloseCircleOutlined
              className='pointer'
            />
          </Popconfirm>
        </Tooltip>
      )
    }
  })
  const ps = {
    rowKey: 'pid',
    dataSource: activities,
    bordered: true,
    columns: col,
    size: 'small',
    pagination: false
  }
  return (
    <div className='terminal-info-section terminal-info-act'>
      <div className='pd1y bold'><BarsOutlined /> {t('activities')}</div>
      <Table {...ps} />
    </div>
  )
}
