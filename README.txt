Sanitätsdienst Materialcheck – PWA

Dateien auf einen HTTPS-Webserver hochladen (oder lokal über localhost testen).
Danach index.html in Safari öffnen und zum Home-Bildschirm hinzufügen.

Struktur:
- index.html: App-Start
- app.js: Anwendungslogik
- pdf-report.js: echte PDF-Erzeugung ohne externe Bibliothek
- service-worker.js: Offline-Cache
- manifest.webmanifest: PWA-Metadaten
- checklisten/index.json: Verzeichnis der Checklisten
- checklisten/aa-nef.json
- checklisten/san-rucksack-kv.json

Neue Checkliste:
1. JSON-Datei unter checklisten/ anlegen.
2. In checklisten/index.json eintragen.
3. CACHE-Namen im service-worker.js erhöhen und neue Datei in ASSETS ergänzen.

Hinweis:
Der bestehende localStorage-Schlüssel bleibt erhalten, damit vorhandene Checks bei Nutzung
unter derselben Origin nicht unnötig inkompatibel werden. Beim Wechsel von einer lokalen
file://-Datei auf eine Web-PWA können Browser gespeicherte Daten nicht automatisch zwischen
den Origins übertragen; dafür die Sicherung/Import-Funktion verwenden.
