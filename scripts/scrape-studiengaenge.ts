import * as fs from 'fs';
import * as path from 'path';

async function scrapeStudiengaengeLinks() {
  console.log('🔍 Scraping Studiengänge von TH-Nürnberg...');
  
  const response = await fetch('https://www.th-nuernberg.de/studiengaenge/');
  const html = await response.text();
  
  const studiengaenge: Record<string, string> = {};
  const patterns = [
    /<a[^>]+href="([^"]+)"[^>]*><strong>([^<]+)\s*\(([BM]\.[A-Za-z\.]+)\)/gi,
    /<a[^>]+href="([^"]+)"[^>]*>([^<]+?)\s*\(([BM]\.[A-Za-z\.]+)\)\s*<\/a>/gi,
    /<a[^>]+href="([^"]+)"[^>]*>\s*([^<]+?)\s*\(([BM]\.[A-Za-z\.]+)\)/gi
  ];
  
  for (const pattern of patterns) {
    Array.from(html.matchAll(pattern)).forEach(match => {
      const fullName = `${match[2].trim()} (${match[3]})`;
      if (!studiengaenge[fullName]) {
        const url = match[1].startsWith('http') ? match[1] : `https://www.th-nuernberg.de${match[1]}`;
        studiengaenge[fullName] = url;
        console.log(`✓ ${fullName} → ${url}`);
      }
    });
  }
  
  console.log(`\n✅ ${Object.keys(studiengaenge).length} Studiengänge gefunden!`);
  return studiengaenge;
}

scrapeStudiengaengeLinks()
  .then(links => {
    const outputPath = path.join(process.cwd(), 'lib', 'studiengang-links.json');
    fs.writeFileSync(outputPath, JSON.stringify(links, null, 2), 'utf-8');
    console.log(`\n💾 Gespeichert in: ${outputPath}\n🎉 Fertig!`);
  })
  .catch(error => {
    console.error('❌ Fehler:', error);
    process.exit(1);
  });