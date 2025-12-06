# 🚀 Deployment-Anleitung - HelloUni

## Schritt 1: Convex Production Deploy

### 1.1 Convex Production-Deployment erstellen

```bash
# Im Terminal ausführen
npx convex deploy
```

Dies wird:
- Dein Schema auf Production deployen
- Alle Funktionen (queries, mutations) hochladen
- Eine neue Production URL generieren

### 1.2 Production URL kopieren

Nach dem Deployment bekommst du eine URL wie:
```
https://your-project-name.convex.cloud
```

Kopiere diese URL!

---

## Schritt 2: Vercel Environment Variables konfigurieren

### 2.1 Gehe zu deinem Vercel Dashboard
1. Öffne https://vercel.com/dashboard
2. Wähle dein Projekt aus
3. Gehe zu **Settings** → **Environment Variables**

### 2.2 Füge folgende Variablen hinzu:

#### **NEXT_PUBLIC_CONVEX_URL** (für alle Environments)
- Name: `NEXT_PUBLIC_CONVEX_URL`
- Value: `https://your-project-name.convex.cloud` (deine Production URL von Convex)
- Environments: ✅ Production ✅ Preview ✅ Development

#### **NEXTAUTH_URL** (nur für Production)
- Name: `NEXTAUTH_URL`
- Value: `https://deine-vercel-domain.vercel.app` (oder deine Custom Domain)
- Environments: ✅ Production

#### **NEXTAUTH_SECRET** (für alle Environments)
- Name: `NEXTAUTH_SECRET`
- Value: `3MgbRpuEAg257jHS3ezLBVai0PHOo0VX72zjVCnWTls=`
- Environments: ✅ Production ✅ Preview ✅ Development

**WICHTIG:** Für Production solltest du einen NEUEN Secret generieren!
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## Schritt 3: Vercel Deployment

### 3.1 Code committen und pushen

```bash
# Alle Änderungen committen
git add .
git commit -m "Add authentication system and updates"
git push origin main
```

### 3.2 Automatisches Deployment

Vercel wird automatisch deployen, wenn du zu GitHub pushst.

**ODER manuell deployen:**

```bash
# Vercel CLI installieren (falls noch nicht installiert)
npm i -g vercel

# Deployment starten
vercel --prod
```

---

## Schritt 4: Erste Schritte nach Deployment

### 4.1 Ersten Benutzer erstellen

1. Gehe zu deiner Production-URL: `https://deine-domain.vercel.app`
2. Klicke auf **"Registrieren"**
3. Erstelle deinen ersten Benutzer
4. Du wirst automatisch eingeloggt

### 4.2 Testen

Teste folgende Funktionen:
- ✅ Registrierung
- ✅ Login
- ✅ Logout
- ✅ Post erstellen
- ✅ Navigation zwischen Seiten
- ✅ Profil anzeigen

---

## Wichtige Hinweise

### ⚠️ Convex Development vs. Production

- **Development:** `npx convex dev` → Lokale Entwicklung
- **Production:** `npx convex deploy` → Live-System

### ⚠️ Environment Variables

Stelle sicher, dass auf Vercel **alle 3 Variablen** gesetzt sind:
1. `NEXT_PUBLIC_CONVEX_URL`
2. `NEXTAUTH_URL`
3. `NEXTAUTH_SECRET`

### ⚠️ Custom Domain (Optional)

Wenn du eine eigene Domain hast:
1. Füge sie in Vercel hinzu (Settings → Domains)
2. Aktualisiere `NEXTAUTH_URL` auf deine Domain

---

## Troubleshooting

### Problem: "Configuration Error" bei NextAuth

**Lösung:** Überprüfe, ob `NEXTAUTH_SECRET` und `NEXTAUTH_URL` auf Vercel gesetzt sind.

### Problem: Convex-Daten werden nicht angezeigt

**Lösung:** 
1. Überprüfe ob `NEXT_PUBLIC_CONVEX_URL` die **Production URL** ist
2. Stelle sicher, dass `npx convex deploy` ausgeführt wurde

### Problem: "Username already exists" bei erster Registrierung

**Lösung:** Du hast wahrscheinlich einen Test-User in der Development-DB. Das ist normal. Production-DB ist leer.

### Problem: Deployment schlägt fehl

**Lösung:**
```bash
# Dependencies neu installieren
rm -rf node_modules package-lock.json
npm install

# Build lokal testen
npm run build
```

---

## Schnell-Checkliste ✅

Vor dem Deployment:
- [ ] `npx convex deploy` ausgeführt
- [ ] Convex Production URL kopiert
- [ ] Alle Environment Variables auf Vercel gesetzt
- [ ] Code auf GitHub gepusht
- [ ] Vercel Deployment abgeschlossen
- [ ] Ersten Test-User erstellt
- [ ] Alle Funktionen getestet

---

## Nach dem Deployment

### Daten migrieren (Optional)

Falls du Test-Daten von Development zu Production migrieren willst:

1. Export von Dev-DB (manuell über Convex Dashboard)
2. Import in Prod-DB (manuell über Convex Dashboard)

**ACHTUNG:** Passwörter sind gehashed und können nicht direkt migriert werden!

---

## Support

Bei Problemen:
1. Überprüfe Vercel Build Logs
2. Überprüfe Convex Dashboard für Errors
3. Überprüfe Browser Console für Client-Fehler

---

Viel Erfolg mit dem Deployment! 🚀

