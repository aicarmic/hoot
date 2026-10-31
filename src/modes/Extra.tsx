import type { Card } from '../content/types'

/** Example / notes shown after answering. */
export function Extra({ card }: { card: Card }) {
  if (!card.example && !card.notes) return null
  return (
    <div className="extra">
      {card.example && <em>{card.example}</em>}
      {card.notes && <small>{card.notes}</small>}
    </div>
  )
}
