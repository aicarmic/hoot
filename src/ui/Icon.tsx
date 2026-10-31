import type { CSSProperties } from 'react'
import type { IconName } from './icons'

/** A Material Symbols Rounded icon. Decorative: label the control it sits in, not the icon. */
export function Icon({ name, filled = false, className, style }: { name: IconName; filled?: boolean; className?: string; style?: CSSProperties }) {
  return (
    <span className={`uy-icon${filled ? ' uy-icon--filled' : ''}${className ? ` ${className}` : ''}`} style={style} aria-hidden="true">
      {name}
    </span>
  )
}
