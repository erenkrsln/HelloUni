# Deployment auf Vercel - Anleitung

## Voraussetzungen

1. **GitHub Account** (oder GitLab/Bitbucket)
2. **Vercel Account** (kostenlos auf [vercel.com](https://vercel.com))
3. **Convex Account** (falls noch nicht vorhanden)

## Schritt 1: Projekt auf GitHub hochladen

1. Erstelle ein neues Repository auf GitHub
2. Initialisiere Git in deinem Projekt (falls noch nicht geschehen):
   ```bash
   cd hellouni
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/dein-username/dein-repo.git
   git push -u origin main
   ```

## Schritt 2: Convex Setup

1. Stelle sicher, dass dein Convex-Projekt läuft
2. Kopiere deine Convex URL (findest du in deinem Convex Dashboard)

## Schritt 3: Vercel Deployment

### Option A: Via Vercel Dashboard (Empfohlen)

1. Gehe zu [vercel.com](https://vercel.com) und logge dich ein
2. Klicke auf "Add New Project"
3. Verbinde dein GitHub Repository
4. Wähle dein Repository aus
5. **Wichtig**: Konfiguriere die Umgebungsvariablen:
   - `NEXT_PUBLIC_CONVEX_URL` - Deine Convex URL
   - `AUTH_URL` - Wird automatisch gesetzt (https://dein-app.vercel.app) - Optional für NextAuth v5
   - `AUTH_SECRET` - Generiere einen zufälligen Secret (z.B. mit `openssl rand -base64 32`)

6. Klicke auf "Deploy"

### Option B: Via Vercel CLI

1. Installiere Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Login:
   ```bash
   vercel login
   ```

3. Deploy:
   ```bash
   cd hellouni
   vercel
   ```

4. Folge den Anweisungen und setze die Umgebungsvariablen

## Schritt 4: Umgebungsvariablen in Vercel setzen

Nach dem ersten Deployment:

1. Gehe zu deinem Projekt auf Vercel
2. Klicke auf "Settings" → "Environment Variables"
3. Füge folgende Variablen hinzu:

   - **NEXT_PUBLIC_CONVEX_URL**
     - Value: Deine Convex URL (z.B. `https://your-project.convex.cloud`)
     - Environments: Production, Preview, Development

   - **AUTH_URL** (Optional für NextAuth v5)
     - Value: Deine Vercel URL (wird automatisch erkannt, z.B. `https://your-app.vercel.app`)
     - Environments: Production, Preview, Development

   - **AUTH_SECRET** (Wichtig für NextAuth v5!)
     - Value: Ein zufälliger Secret (generiere einen mit: `openssl rand -base64 32`)
     - Environments: Production, Preview, Development
     - **Hinweis**: Verwende den gleichen Secret wie in deiner `.env.local` Datei

4. Klicke auf "Save"
5. Gehe zu "Deployments" und redeploye dein Projekt

## Schritt 5: Convex Auth konfigurieren

1. Gehe zu deinem Convex Dashboard
2. Füge deine Vercel URL zu den erlaubten Origins hinzu
3. Stelle sicher, dass deine Auth-Konfiguration korrekt ist

## Schritt 6: Testen

1. Öffne deine Vercel URL
2. Teste die App auf Desktop und Mobile
3. Prüfe, ob die PWA installierbar ist

## Troubleshooting

### Build-Fehler
- Stelle sicher, dass alle Dependencies in `package.json` vorhanden sind
- Prüfe die Build-Logs in Vercel

### Auth-Probleme
- Überprüfe, ob `AUTH_SECRET` in Vercel gesetzt ist (muss identisch mit `.env.local` sein)
- Für NextAuth v5: Verwende `AUTH_SECRET` statt `NEXTAUTH_SECRET`
- `AUTH_URL` ist optional, wird automatisch erkannt
- Prüfe die Convex Auth-Konfiguration

### Convex-Verbindungsprobleme
- Überprüfe, ob `NEXT_PUBLIC_CONVEX_URL` korrekt ist
- Stelle sicher, dass dein Convex-Projekt aktiv ist

## Nützliche Links

- [Vercel Dokumentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Convex Dokumentation](https://docs.convex.dev)


