/**
 * up time info
 */

import { ClockCircleOutlined } from '@ant-design/icons'
import { t } from '../../common/i18n-text'

export default function TerminalInfoUp (props) {
  const { uptime, isRemote, terminalInfos } = props
  if (!isRemote || !terminalInfos.includes('uptime')) {
    return null
  }
  return (
    <div className='terminal-info-section terminal-info-up'>
      <b><ClockCircleOutlined /> {t('runningTime')}</b>: {uptime}
    </div>
  )
}
