import { useId, type ComponentProps } from 'react'
import { Icon } from './Icon'
import type { IconName } from './icons'

type Props = ComponentProps<'input'> & {
  label: string
  support?: string
  leadingIcon?: IconName
  fieldClassName?: string
}

/** Uyut text field: label above an outlined control, optional supporting text below. */
export function TextField({ label, support, leadingIcon, fieldClassName, id, ...input }: Props) {
  const auto = useId()
  const inputId = id ?? auto
  const supportId = support ? `${inputId}-support` : undefined
  return (
    <div className={`uy-field${fieldClassName ? ` ${fieldClassName}` : ''}`}>
      <label className="uy-field__label" htmlFor={inputId}>
        {label}
      </label>
      <div className="uy-field__control">
        {leadingIcon && <Icon name={leadingIcon} />}
        <input id={inputId} className="uy-field__input" aria-describedby={supportId} {...input} />
      </div>
      {support && (
        <span id={supportId} className="uy-field__support">
          {support}
        </span>
      )}
    </div>
  )
}
