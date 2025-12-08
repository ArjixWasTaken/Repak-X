import React from 'react'
import './Switch.css'

/**
 * HeroUI-style Switch component
 *
 * @param {Object} props
 * @param {boolean} [props.checked] - Controlled on/off state
 * @param {boolean} [props.defaultChecked=false] - Initial state for uncontrolled usage
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Visual size of the control
 * @param {'default'|'primary'|'secondary'|'success'|'warning'|'danger'} [props.color='primary'] - Accent color
 * @param {boolean} [props.isDisabled=false] - Whether the switch is disabled
 * @param {boolean} [props.isLoading=false] - Whether the switch is in a loading state
 * @param {function} [props.onChange] - Callback receiving (checked:boolean, event:MouseEvent)
 * @param {React.ReactNode} [props.children] - Optional label content rendered to the right
 * @param {string} [props.className] - Optional extra class names
 */
const Switch = ({
  checked,
  defaultChecked = false,
  size = 'md',
  color = 'primary',
  isDisabled = false,
  isLoading = false,
  onChange,
  children,
  className = '',
  ...props
}) => {
  const isControlled = typeof checked === 'boolean'
  const [internalChecked, setInternalChecked] = React.useState(defaultChecked)
  const currentChecked = isControlled ? checked : internalChecked

  React.useEffect(() => {
    if (isControlled) return
    setInternalChecked(defaultChecked)
  }, [defaultChecked, isControlled])

  const handleToggle = (event) => {
    if (isDisabled || isLoading) return
    const nextValue = !currentChecked
    if (!isControlled) {
      setInternalChecked(nextValue)
    }
    if (onChange) {
      onChange(nextValue, event)
    }
  }

  const classes = [
    'heroui-switch',
    size,
    color,
    currentChecked ? 'checked' : '',
    isDisabled ? 'disabled' : '',
    isLoading ? 'loading' : '',
    className
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <label className={classes} data-checked={currentChecked} data-disabled={isDisabled}>
      <button
        type="button"
        className="heroui-switch-control"
        role="switch"
        aria-checked={currentChecked}
        aria-disabled={isDisabled || isLoading}
        onClick={handleToggle}
        disabled={isDisabled || isLoading}
        {...props}
      >
        <span className="heroui-switch-track">
          <span className="heroui-switch-thumb" />
        </span>
        {isLoading && <span className="heroui-switch-spinner" />}
      </button>
      {children && <span className="heroui-switch-label">{children}</span>}
    </label>
  )
}

export default Switch
