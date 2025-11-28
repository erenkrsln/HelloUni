# Student Social App

Eine Social Media App für Studierende, gebaut mit Next.js 15, TypeScript, Tailwind CSS und Convex.

## Tech Stack

- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS
- **UI Library:** shadcn/ui (Radix Primitives) & Lucide React Icons
- **Backend/Datenbank:** Convex (Real-time Database)

## Setup

1. Installiere Dependencies:
```bash
npm install
```

2. Richte Convex ein:
```bash
npx convex dev
```
Dies erstellt automatisch die `_generated` Dateien und eine `.env.local` mit `NEXT_PUBLIC_CONVEX_URL`.

3. Führe das Seed-Script aus (im Convex Dashboard oder über die CLI):
```bash
npx convex run seed:seed
```

4. Starte den Development Server:
```bash
npm run dev
```

Die App läuft auf [http://localhost:3000](http://localhost:3000)

**Hinweis:** Die Dateien in `convex/_generated/` werden automatisch von Convex generiert. Du kannst sie ignorieren oder löschen - sie werden beim nächsten `npx convex dev` neu erstellt.

## Features

- ✅ Real-time Feed mit Convex
- ✅ Optimistic UI für Likes
- ✅ Responsive Design (Mobile-first)
- ✅ Loading States (Skeleton Loader)
- ✅ Zeitstempel Formatierung

## Projektstruktur

```
├── app/              # Next.js App Router
├── components/       # React Komponenten
│   ├── ui/          # shadcn/ui Komponenten
│   └── feed-card.tsx # Feed Card Komponente
├── convex/          # Convex Backend
│   ├── schema.ts    # Datenmodell
│   ├── queries.ts   # Datenabfragen
│   └── mutations.ts # Datenänderungen
└── lib/             # Utilities
```

