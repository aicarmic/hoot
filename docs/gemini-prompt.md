# Make a Hoot deck with Gemini or NotebookLM

Hoot imports any deck in the JSON shape below, so it works for school subjects as well as languages. In Hoot, open **Import deck**, paste what Gemini gave you, and tap Import.

## The prompt

Paste this into Gemini, or into NotebookLM with your source material loaded. Change the parts in **[brackets]**.

---

Using the material I've provided, create a study deck about **[topic]** for **[who / level, e.g. a Year 8 student]** with **[20]** cards.

Reply with **only** a JSON object in exactly this shape, with no commentary before or after it:

```
{
  "id": "[short-kebab-case-id]",
  "title": "[Deck title]",
  "subject": "[Subject, e.g. Biology]",
  "level": "[level, e.g. Year 8]",
  "unit": "[optional group name, e.g. Unit 3 · Cells]",
  "promptLabel": "Question",
  "answerLabel": "Answer",
  "cards": [
    {
      "id": "1",
      "prompt": "A short question or term",
      "answer": "The short correct answer",
      "hint": "Optional nudge without giving it away",
      "notes": "Optional one-sentence explanation",
      "example": "Optional example sentence or worked example",
      "choices": ["wrong option 1", "wrong option 2", "wrong option 3"]
    }
  ]
}
```

Rules:
- Keep each `answer` short (under 10 words), so it works in a quiz and can be typed.
- `choices` are three believable but wrong answers of the same kind as the real answer.
- Number the card ids "1", "2", "3", and so on.
- Use the same `subject` spelling for every deck in that subject, so they group together.
- For a language deck, add `"speechLang": "it-IT"` (or the right code, e.g. `"ru-RU"`) so Hoot can read cards aloud.
- For math or any problems to work out on paper, add `"kind": "problem"`. Then each `prompt` is one problem (put each equation of a system on its own line with `\n`), each `answer` is the final answer only, `choices` are answers a student gets from common mistakes (a sign error, swapped x and y, dividing wrong), `hint` is the first move, and each card has a `"steps"` list with the worked solution, one short step per item. Order the cards from easiest to hardest.
- For conversation practice, add `"kind": "dialogue"`. Then each `prompt` is something a person says (in the language being learnt), each `answer` is a natural short reply in the same language, and `notes` gives the English for both.

---

## Field reference

What the importer in `src/lib/userDecks.ts` reads:

| Field | Required | Notes |
|---|---|---|
| `title` | yes (or typed on the import screen) | Deck name. |
| `subject` | no | Groups decks on the Learn tab. Falls back to the import screen, then "My decks". |
| `id` | no | Re-importing a deck with the same `id` (or same title if no id) replaces it. |
| `level`, `unit` | no | Shown as labels; decks in a subject are grouped by level. |
| `promptLabel`, `answerLabel` | no | Labels for the two sides, e.g. "Term" / "Definition". |
| `speechLang` | no | BCP-47 code. Turns on audio and Listen & speak. |
| `kind` | no | `"dialogue"` or `"problem"`. |
| `cards` | yes, at least 2 | Each needs `prompt` and `answer`. |
| card `id` | no | Progress is keyed on it, so keep ids stable when you fix a deck and re-import. |
| card `hint`, `notes`, `example` | no | Shown after answering. |
| card `choices` | no | Wrong answers for Quiz. Without them, Quiz borrows answers from other cards. |
| card `steps` | no | Worked solution, a list of short steps. Shown after answering. |

The importer is forgiving: a sentence or code fence around the JSON is ignored, a bare array of cards is accepted, and `question`/`front` and `back` work as aliases for `prompt` and `answer`. It also takes CSV or a pasted spreadsheet with columns `prompt,answer,example,hint` (a header row is optional).
