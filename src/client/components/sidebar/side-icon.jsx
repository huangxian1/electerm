import classNames from 'classnames'

export default function SideIcon (props) {
  const {
    show,
    className,
    title = '',
    active,
    label,
    showLabel,
    children
  } = props
  if (show === false) {
    return null
  }
  const cls = classNames(className, 'control-icon-wrap', {
    active
  })
  return (
    <div
      className={cls}
      title={title}
    >
      {children}
      {
        showLabel && label
          ? (
            <div className='control-icon-label'>
              {label}
            </div>
            )
          : null
      }
    </div>
  )
}
