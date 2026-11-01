import { useState } from 'react'
import { useAccount } from '../lib/account'
import { syncNow } from '../lib/sync'
import { parseDeck, saveUserDeck } from '../lib/userDecks'
import { Icon } from '../ui/Icon'
import { TextField } from '../ui/TextField'

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
      <div className="stack">
        <h1 className="h-page">Import a deck</h1>
        <p className="meta">
          Paste a deck from Gemini (JSON) or a spreadsheet (CSV: <code>prompt,answer,example,hint</code>). There’s a
          ready-made{' '}
          <a className="link" href="https://github.com/aicarmic/hoot/blob/main/docs/gemini-prompt.md" target="_blank" rel="noreferrer">
            Gemini prompt
          </a>
          .
        </p>
      </div>
      <form
        className="stack-4"
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
        <div className="field-like">
          <label className="label" htmlFor="import-paste">
            Deck
          </label>
          <textarea
            id="import-paste"
            className="ctl"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'{ "title": "Photosynthesis", "cards": [ … ] }\n\nor\n\nprompt,answer\nchlorophyll,green pigment in plants'}
            rows={7}
          />
        </div>
        <TextField
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Photosynthesis"
          support="Only if the paste doesn’t include one"
        />
        <TextField label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Biology" />
        <div className="field-like">
          <label className="label" htmlFor="import-lang">
            Read cards aloud in
          </label>
          <div className="select-wrap">
            <select id="import-lang" className="ctl" value={lang} onChange={(e) => setLang(e.target.value)}>
              {LANGS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <Icon name="expand_more" />
          </div>
        </div>
        {error && (
          <p className="error">
            <Icon name="error" />
            {error}
          </p>
        )}
        {acct.family ? (
          <p className="meta with-icon">
            <Icon name="group" />
            It’ll be shared with {acct.family.name}.
          </p>
        ) : (
          <p className="meta">It’s saved on this device. Join a family to share it.</p>
        )}
        <button type="submit" className="uy-btn uy-state uy-btn--filled block">
          Add deck
        </button>
      </form>
    </>
  )
}
