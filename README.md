# HmIP Geräteverwaltung für Home Assistant

Seitenleisten-Panel zum Erfassen und Verwalten von Homematic-IP-Geräten: **QR-Code-Aufkleber** der Geräte scannen, Raum, Einbauort, Name und Typ ergänzen, als CSV für Excel exportieren und bei Bedarf **neue QR-Code-Aufkleber ausdrucken**.

## Funktionen

- **Scannen** mit der Live-Kamera (Chrome auf Android, Browser mit `BarcodeDetector`); **Foto** als Alternative (das Foto wird nur ausgewertet, nicht gespeichert); **Manuell** als Notlösung
- **Übernahme aus Home Assistant:** Menü „Geräte aus Home Assistant übernehmen“ legt alle eQ-3-Geräte mit 24-stelliger Seriennummer (SGTIN-Format) mit Name, Typ, Raum und Firmware an. Eigene Eingaben bleiben beim erneuten Import erhalten, die Firmware wird nachgeführt
- **Abgleich:** Ein gescannter QR-Code-Aufkleber wird dem Gerät mit passender SGTIN zugeordnet (Zähler „QR-Code-Aufkleber x/y“, Filter „QR-Code-Aufkleber fehlt“)
- **QR-Code-Aufkleber erzeugen:** Aus den gespeicherten Daten (SGTIN und Geräteschlüssel) entsteht ein Aufkleber im Stil des Originals mit QR-Code, Typ, Name, Raum, Schlüsselzeile und SGTIN. Als PNG oder SVG speichern oder drucken, einzeln oder als Bogen (9 je A4-Seite). Der Aufkleber wird jedes Mal neu gezeichnet, es wird kein Bild gespeichert
- Suche, Raumfilter, Warnung bei doppelter SGTIN
- Export: **CSV** für Excel (Semikolon, ohne Geräteschlüssel) und **JSON-Backup** (mit Geräteschlüsseln); Import von Backups
- Daten liegen in Home Assistant (`.storage`), sind in dessen Backups enthalten und auf allen Geräten gleich

## Geräteschlüssel

Der QR-Code eines Aufklebers enthält neben der SGTIN den **Geräteschlüssel** (128 Bit). Beobachtetes Format: `EQ01` + `SG` + SGTIN (24 Hex-Zeichen) + `DLK` + Schlüssel (32 Hex-Zeichen). Die App speichert den Schlüssel getrennt, zeigt ihn nur auf Wunsch an und schreibt ihn **nie** in die CSV. Er steckt nur im JSON-Backup und im Home-Assistant-Speicher.

- Das Panel und die zugehörigen Befehle sind **nur für Administratoren** von Home Assistant zugänglich.
- Auf Original-Aufklebern steht der Schlüssel zusätzlich als Text (Gruppen zu 5 Zeichen, Base32 mit eigenem Alphabet ohne D, I, O, V). Die App rechnet zwischen beiden Schreibweisen um (geprüft an zwei Original-Aufklebern, Alphabet gemäß Beschreibung im Homematic-Forum) und nimmt im Formular beide Eingaben an. Die erzeugten Aufkleber zeigen den Schlüssel als Text, genau wie das Original, und enthalten ihn im QR-Code.
- Codes in unbekanntem Format werden unverändert gespeichert, daraus lässt sich aber kein Aufkleber erzeugen.

## Installation über HACS (benutzerdefiniertes Repository)

1. HACS öffnen, oben rechts Menü, **Benutzerdefinierte Repositories**.
2. URL dieses Repositorys eintragen, Kategorie **Integration**, hinzufügen.
3. „HmIP Geräteverwaltung“ herunterladen und Home Assistant neu starten.
4. **Einstellungen, Geräte & Dienste, Integration hinzufügen**: „HmIP Geräteverwaltung“ wählen.
5. Der Eintrag **HmIP Geräte** erscheint in der Seitenleiste (nur für Administratoren).

Manuell: Ordner `custom_components/hmip_geraete` nach `/config/custom_components/` kopieren, neu starten, ab Schritt 4.

## Hinweise

- **Die Live-Kamera braucht eine HTTPS-Verbindung** (z. B. Nabu Casa) und einen Browser mit Barcode-Erkennung (Chrome auf Android). Ob die Kamera in der Home-Assistant-App funktioniert, hängt von der App ab; „Foto“ geht immer.
- Die Zuordnung setzt voraus, dass die Seriennummer in Home Assistant der SGTIN im QR-Code entspricht. Das ist an einem Gerät bestätigt (QR-Code und Geräteregistrierung), nicht an allen.
- Beim Entfernen der Integration bleiben die Daten in `.storage` (`hmip_geraete.devices`) erhalten.
- Backups aus früheren Versionen lassen sich importieren (Fotos werden nicht mehr übernommen).

## Entwicklung

```
pip install pytest-homeassistant-custom-component home-assistant-frontend
pytest
```

## Drittsoftware

QR-Codes erzeugt [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) von Kazuhiko Arase (MIT-Lizenz, Datei `custom_components/hmip_geraete/www/qrcode.mjs`). „QR Code“ ist eine eingetragene Marke von DENSO WAVE INCORPORATED.
