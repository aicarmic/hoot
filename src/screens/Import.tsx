import { useState } from 'react'
import { useAccount } from '../lib/account'
import { syncNow } from '../lib/sync'
import { parseDeck, saveUserDeck } from '../lib/userDecks'

const LANGS = [
  ['', 'No audio'],
  ['it-IT', 'Italian'],
  ['es-ES', 'Spanish'],
  ['fr-FR', 'French'],
  ['de-DE', 'German'],
  ['en-US', 'English'],
]

export function Import() {
  const [text, setText] = useState('')
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [lang, setLang] = useState('')
  const [error, setError] = useState('')
  const acct = useAccount()

  return (
    <>
      <a href="#" className="back">← All decks</a>
      <h1>Import a deck</h1>
      <p className="meta">
        Paste a deck from Gemini (JSON) or a spreadsheet (CSV: <code>prompt,answer,example,hint</code>). There’s a
        ready-made{' '}
        <a className="link" href="https://github.com/aicarmic/hoot/blob/main/docs/gemini-prompt.md" target="_blank" rel="noreferrer">
          Gemini prompt
        </a>
        .
      </p>
      <form
        className="import"
        onSubmit={(e) => {
          e.preventDefault()
          try {
            const deck = parseDeck(text, { title, subject, speechLang: lang || undefined })
            saveUserDeck(deck)
            void syncNow()
            location.hash = `deck/${deck.id}`
          } catch (err) {
            setError((err as Error).message)
          }
        }}
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'{ "title": "Photosynthesis", "cards": [ … ] }\n\nor\n\nprompt,answer\nchlorophyll,green pigment in plants'}
          rows={9}
        />
        <label>
          Title <small>(if the paste doesn’t include one)</small>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Photosynthesis" />
        </label>
        <label>
          Subject
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Biology" />
        </label>
        <label>
          Read cards aloud in
          <select value={lang} onChange={(e) => setLang(e.target.value)}>
            {LANGS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        {error && <p className="error">{error}</p>}
        <p className="meta">
          {acct.family ? `It’ll be shared with ${acct.family.name}.` : 'It’s saved on this device. Join a family to share it.'}
        </p>
        <button type="submit" className="primary">
          Add deck
        </button>
      </form>
    </>
  )
}
