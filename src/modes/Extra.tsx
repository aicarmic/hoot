import type { Card } from '../content/types'

/** Example, notes and worked steps shown after answering. */
export function Extra({ card }: { card: Card }) {
  if (!card.example && !card.notes && !card.steps?.length) return null
  return (
    <div className="extra">
      {card.example && <em>{card.example}</em>}
      {card.steps?.length ? (
        <>
          <span className="label">How to solve it</span>
          <ol className="steps">
            {card.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </>
      ) : null}
      {card.notes && <small>{card.notes}</small>}
    </div>
  )
}
