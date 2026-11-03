import { Icon } from './Icon'
import type { IconName } from './icons'

/** Flag stripes for language classes: [colors], and whether they run vertically. */
const FLAGS: Record<string, { colors: string[]; vertical: boolean }> = {
  Italian: { colors: ['#009246', '#ffffff', '#ce2b37'], vertical: true },
  Russian: { colors: ['#ffffff', '#0039a6', '#d52b1e'], vertical: false },
}

const ICONS: Record<string, IconName> = {
  Math: 'calculate',
  Biology: 'eco',
}

/** A class's flag (languages) or a round subject icon (everything else). */
export function SubjectBadge({ subject }: { subject: string }) {
  const flag = FLAGS[subject]
  if (flag) {
    const n = flag.colors.length
    return (
      <span className="flag" aria-hidden="true">
        <svg viewBox={flag.vertical ? `0 0 ${n} 2` : `0 0 ${n} ${n}`} preserveAspectRatio="none">
          {flag.colors.map((c, i) =>
            flag.vertical ? (
              <rect key={i} width="1" height="2" x={i} fill={c} />
            ) : (
              <rect key={i} width={n} height="1" y={i} fill={c} />
            ),
          )}
        </svg>
      </span>
    )
  }
  return (
    <span className="subj-icon" aria-hidden="true">
      <Icon name={ICONS[subject] ?? 'school'} />
    </span>
  )
}
