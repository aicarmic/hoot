# 🦉 Hoot

A calm family learning app. It's like Duolingo without the gamification, starting with Italian. It installs on your phone, works offline, and lets the family see each other's progress.

- **Live app:** https://aicarmic.github.io/hoot/ (after GitHub Pages is turned on)
- **Spec and roadmap:** [docs/SPEC.md](docs/SPEC.md)
- **Supabase setup (family accounts and sync):** [docs/SETUP-supabase.md](docs/SETUP-supabase.md)
- **Make a deck with Gemini:** [docs/gemini-prompt.md](docs/gemini-prompt.md)

## Develop

```sh
npm install
npm run dev      # http://localhost:5173/hoot/
npm run build    # production build into dist/
npm run lint
npm test         # unit tests (scheduling, answer matching, import)
```

## Add content

Drop a deck JSON file into `src/content/decks/` (the file name prefix sets the order), or use **Import a deck** in the app. The format is described in the spec and in `src/content/types.ts`.

## Deploy

Every push to `main` builds the app and publishes it to GitHub Pages via `.github/workflows/deploy.yml`. One-time setup: **Settings → Pages → Source: GitHub Actions**.
