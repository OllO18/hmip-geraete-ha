# HmIP Geräteverwaltung für Home Assistant

Seitenleisten-Panel zum Erfassen und Verwalten von Homematic-IP-Geräten: Barcode-/QR-Zettel per Kamera scannen (oder fotografieren), Raum, Einbauort, Name und Typ ergänzen, als CSV für Excel exportieren.

- **Scannen** mit der Live-Kamera (Chrome/Android, Browser mit `BarcodeDetector`); der Zettel wird dabei automatisch fotografiert
- **Foto**-Funktion als Alternative, **Manuell** als Notlösung
- Felder: Rohinhalt des Codes, SGTIN (+ letzte 4 Ziffern), Name, Typ, Raum, Einbauort, Notiz, Foto
- **Übernahme aus Home Assistant:** Menü „Geräte aus Home Assistant übernehmen“ legt alle eQ-3-Geräte mit 24-stelliger Seriennummer (SGTIN-Format) mit Name, Typ, Raum und Firmware an. Eigene Eingaben bleiben beim erneuten Import erhalten, Firmware wird nachgeführt
- **Zettel-Abgleich:** Ein gescannter Code wird dem passenden Gerät zugeordnet (Zähler „Zettel x/y“, Filter „Zettel fehlt“)
- Suche, Raumfilter, Duplikatwarnung
- Export: CSV (Excel, Semikolon) und JSON-Backup mit Fotos; Import von Backups
- Daten liegen in Home Assistant (`.storage`) und sind in dessen Backups enthalten, auf allen Geräten gleich

## Installation über HACS (benutzerdefiniertes Repository)

1. HACS öffnen, oben rechts Menü, **Benutzerdefinierte Repositories**.
2. URL dieses Repositorys eintragen, Kategorie **Integration**, hinzufügen.
3. „HmIP Geräteverwaltung“ herunterladen und Home Assistant neu starten.
4. **Einstellungen, Geräte & Dienste, Integration hinzufügen**: „HmIP Geräteverwaltung“ wählen.
5. Der Eintrag **HmIP Geräte** erscheint in der Seitenleiste.

Manuell: Ordner `custom_components/hmip_geraete` nach `/config/custom_components/` kopieren, neu starten, ab Schritt 4.

## Hinweise

- **Die Live-Kamera braucht eine HTTPS-Verbindung** (z. B. Nabu Casa) und einen Browser mit Barcode-Erkennung (Chrome auf Android). Ob die Kamera in der Home-Assistant-App funktioniert, hängt von der App ab; „Foto“ geht immer.
- **Die Zuordnung setzt voraus, dass die Seriennummer in Home Assistant der aufgedruckten SGTIN entspricht.** Das ist am Beispiel einzelner Geräte (24 Hex-Zeichen, `3014F711A0…`) plausibel, aber nicht mit echten Aufklebern geprüft.
- **SGTIN-Erkennung ist eine Heuristik:** Aus dem gescannten Text wird die erste 24-stellige Hex-Folge als SGTIN vorgeschlagen. Der Rohinhalt wird immer unverändert gespeichert, das SGTIN-Feld ist editierbar.
- Beim Entfernen der Integration bleiben die Daten in `.storage` (`hmip_geraete.*`) erhalten.
- Backups aus der Einzeldatei- und der Add-on-Version lassen sich importieren.

## Entwicklung

```
pip install pytest-homeassistant-custom-component home-assistant-frontend
pytest
```

Vor dem Veröffentlichen: Repository auf öffentlich stellen (HACS kann nur öffentliche Repositories), Beschreibung und Topics (z. B. `homeassistant`, `hacs`, `homematic-ip`) setzen und einen GitHub-Release anlegen.
