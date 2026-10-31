# Hoot: v1.0 spec

Hoot is a calm, family learning app. It started as "Duolingo without the gamification" so Natasha can keep learning Italian. It is built so that later it can show any study material, for example the flashcards and quizzes we make for Niko with Gemini.

## Who it's for

| Person  | Device  | First use                     |
|---------|---------|-------------------------------|
| Natasha | Android | Italian, continuing learner   |
| Tony    | Android | Italian (and testing)         |
| Niko    | iPhone  | School study decks, later     |

We build for Android Chrome first. iPhone must still work, but features it can't support (mainly speech recognition) should hide quietly instead of breaking.

## Principles

- **No gamification.** No points, gems, leagues, lives or streak-loss guilt. Progress is shown as plain facts: words known, minutes practised, last practice.
- **Short sessions.** A session is 5 to 10 cards and can be stopped any time without losing anything.
- **Works on the go.** It installs to the home screen and works offline. Progress syncs when it's back online.
- **Content is data.** Every subject is a *deck* in one shared format. Italian is just the first subject.

## v1.0 features

1. **Installable PWA:** a manifest, icons, a service worker and an offline cache.
2. **Saved progress:** each card has its own review schedule. Stored on the device first, then synced (step 3).
3. **Three learning modes**, picked per session:
   - **Flashcards:** flip a card and rate it *Again / Hard / Good / Easy*. Spaced repetition (SM-2 style) decides when the card comes back.
   - **Quiz:** multiple choice and type-the-answer. Wrong options are taken from the same deck.
   - **Listen & speak:** the app says the phrase with text-to-speech. You repeat it, speech recognition hears you, and you get a gentle close/exact match. Only offered for decks with a `speechLang`, and only on browsers that support it.
4. **Pronunciation:** a play button on every card in a deck that has a `speechLang`, with a slow-playback option.
5. **Family:** each person signs in. A shared family page shows what everyone practised this week, and you can send someone a phrase to try.
6. **Fun and interactive:** quick feedback, light animation, the owl, and no pressure.

## Architecture

- **Frontend:** Vite + React + TypeScript, with `vite-plugin-pwa` for the service worker and manifest.
- **Hosting:** GitHub Pages, deployed by GitHub Actions on every push to `main`. It's served under `/hoot/`.
- **Backend (step 3):** Supabase free tier for auth (magic link email), progress sync and the family feed. Code talks to a small `ProgressStore` interface, so the app could later move to a self-hosted backend (for example PocketBase on the Synology) without a rewrite.
- **Local storage:** `localStorage` for v1, behind the same interface. It moves to IndexedDB if it grows.

## Deck format

Decks are JSON files that match `src/content/types.ts`. Built-in decks live in `src/content/decks/`. Later, a deck can also be imported by pasting JSON or CSV into the app. That's the path for Gemini-made material.

```json
{
  "id": "it-greetings",
  "title": "Greetings",
  "subject": "Italian",
  "level": "A1",
  "speechLang": "it-IT",
  "promptLabel": "Italian",
  "answerLabel": "English",
  "cards": [
    { "id": "ciao", "prompt": "Ciao", "answer": "Hi / Bye", "example": "Ciao, come stai?" }
  ]
}
```

| Field | Required | Notes |
|---|---|---|
| `id`, `title`, `subject`, `cards` | yes | `subject` groups decks on the home screen ("Italian", "Biology"). |
| `level` | no | Free text, for example `A1` or `Year 8`. |
| `speechLang` | no | BCP-47 code. If present, it turns on audio and Listen & speak. |
| `promptLabel` / `answerLabel` | no | Labels for each side. They default to "Prompt" / "Answer". |
| card `prompt`, `answer`, `id` | yes | `id` must be stable, because progress is keyed on it. |
| card `example`, `hint`, `notes`, `tags` | no | Extra context shown after answering. |
| card `choices` | no | Hand-written wrong answers for Quiz. Without them, Quiz picks from other cards. |

### Gemini to Hoot

A ready-to-paste prompt for Gemini lives in [`docs/gemini-prompt.md`](gemini-prompt.md). It asks Gemini to output a deck in the format above, which then gets pasted into Hoot's import screen. CSV import uses `prompt,answer,example,hint` columns, for anything that comes out of a spreadsheet.

## Content plan

The starter Italian material is written for Hoot (A1 to A2: greetings, numbers, food and café, travel, everyday verbs, family, time). It is reviewed by hand, not scraped. A later option is to add more example sentences from Tatoeba (CC BY 2.0, needs attribution).

## Build steps

1. **Spec and setup (this PR):** spec, deck format, app shell, sample deck, PWA install, Pages deploy.
2. **Core for one learner:** the three modes, spaced repetition, local progress, the full starter Italian content, and deck import.
3. **Family layer:** Supabase auth, sync, the family page, sending a phrase.
4. **Ship:** install on everyone's phones, then a week of Natasha testing it and fixes.

## Out of scope for v1.0

- Native app store builds.
- AI-generated lessons inside the app (decks come in through import).
- Grammar lessons longer than a card note.
