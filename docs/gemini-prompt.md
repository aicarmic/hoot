# Prompt: make a Hoot deck with Gemini

Paste this into Gemini (or a Gemini notebook with your source material loaded). Change the parts in **[brackets]**.

---

Using the material I've provided, create a study deck about **[topic]** for **[who / level, e.g. a Year 8 student]** with **[20]** cards.

Reply with **only** a JSON object in exactly this shape. Don't add markdown fences or commentary:

```
{
  "id": "[short-kebab-case-id]",
  "title": "[Deck title]",
  "subject": "[Subject, e.g. Biology]",
  "level": "[level]",
  "promptLabel": "Question",
  "answerLabel": "Answer",
  "cards": [
    {
      "id": "1",
      "prompt": "A short question or term",
      "answer": "The short correct answer",
      "hint": "Optional nudge without giving it away",
      "notes": "Optional one-sentence explanation",
      "choices": ["wrong option 1", "wrong option 2", "wrong option 3"]
    }
  ]
}
```

Rules:
- Keep each `answer` short (under 10 words), so it works in a quiz.
- `choices` are three believable but wrong answers.
- Number the card ids "1", "2", "3", and so on.
- For a language deck, add `"speechLang": "it-IT"` (or the right code) so Hoot can read cards aloud.

---

Then in Hoot, open **Import deck** and paste the result. (Import arrives in build step 2.)
