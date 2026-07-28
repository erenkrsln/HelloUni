# Project Guidelines

## Light Mode & Dark Mode
- **Icon Colors in Light Mode**: Verändere die Icon-Farben im Light Mode nicht. Alle Icons, die im Light Mode aktuell weiß sind (oder andere feste Farben haben), müssen weiterhin weiß bleiben. Ersetze keine `text-white`, `fill-white` oder `stroke-white` Klassen.
- **Theme Variables**: Verwende keine globalen Theme-Farben wie `text-foreground`, `text-black` oder `currentColor`, wenn dadurch weiße Icons im Light Mode dunkel werden.
- **Dark Mode Anpassungen**: Accessibility- oder Dark-Mode-Anpassungen dürfen die Darstellung im Light Mode nicht verändern. Änderungen an den Icon-Farben (und generell) dürfen ausschließlich über `dark:`-Klassen erfolgen.
- **Testing**: Prüfe nach der Umsetzung, dass alle Icons im Light Mode weiterhin exakt wie vorher (z.B. weiß) dargestellt werden.
