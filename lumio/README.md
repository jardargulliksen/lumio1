# Lumio — AI-innehåll för restauranger

## Deploya på 5 minuter (gratis)

### Steg 1 — Ladda upp till GitHub
1. Gå till github.com och logga in (skapa konto om du inte har)
2. Klicka "New repository" → namnge den "lumio" → klicka "Create"
3. Ladda upp dessa filer: dra hela mappen till GitHub

### Steg 2 — Deploya på Vercel
1. Gå till vercel.com och logga in med GitHub
2. Klicka "Add New Project" → välj ditt "lumio"-repo
3. Klicka "Deploy" — klart!

### Steg 3 — Lägg till din API-nyckel
1. Gå till ditt projekt på Vercel → Settings → Environment Variables
2. Lägg till:
   - Name: `ANTHROPIC_API_KEY`
   - Value: din nyckel från console.anthropic.com
3. Klicka Save → gå till Deployments → klicka "Redeploy"

### Klar! 🎉
Din app körs nu på https://lumio-[ditt-namn].vercel.app

---

## Struktur
```
lumio/
├── api/
│   └── generate.js      ← Serverless function (Claude API + scraping)
├── public/
│   └── index.html       ← Frontend-appen
└── vercel.json          ← Vercel-konfiguration
```

## Tech stack
- **Frontend**: Vanilla HTML/CSS/JS — ingen build-step krävs
- **Backend**: Vercel Serverless Function (Node.js)
- **AI**: Claude claude-sonnet-4-20250514 via Anthropic API
- **Scraping**: Jina.ai Reader API (gratis)
- **Hosting**: Vercel (gratis tier)

## Kostnad
- Vercel: Gratis
- Jina.ai: Gratis
- Anthropic API: ~2-3 kr per analys (beror på restaurangens sajtstorlek)
