import { avatarTone } from './avatarTone'

export function Avatar({ id, name, allIds }: { id: string; name: string; allIds: string[] }) {
  return (
    <span className={`avatar ${avatarTone(id, allIds)}`} aria-hidden="true">
      {name.slice(0, 1).toUpperCase()}
    </span>
  )
}
