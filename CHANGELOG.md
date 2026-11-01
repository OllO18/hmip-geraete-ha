# Änderungsprotokoll

## 1.7.1
- Aufkleber ohne Key: Der QR-Code hat jetzt das Format `EQ01SG<SGTIN>` (wie das Original, ohne Key-Teil). Diese Schreibweise erkennt die Homematic-IP-App beim Anlernen; die SGTIN allein lehnt sie ab (getestet am 01.11.2026).

## 1.7.0
- Aufkleber auch ohne erfassten Key: Der QR-Code enthält dann nur die SGTIN, der Aufkleber ist mit „Ohne Key – nur Online-Anlernen“ gekennzeichnet. Laut Homematic-IP-Anwenderhandbuch (5.3.6.1) genügen für das normale Anlernen die letzten vier Ziffern der SGTIN; für das Offline-Anlernen an der HCU (5.3.6.2) wird der Original-Key gebraucht. Ob die Homematic-IP-App einen QR-Code nur mit SGTIN annimmt, ist nicht dokumentiert.
- Der Dokumentationsbogen zeigt damit für alle Geräte mit SGTIN einen Aufkleber.

## 1.6.0
- Filter: mehrere Räume (auch „ohne Raum“) und Gerätetypen gleichzeitig, dazu Status des QR-Code-Aufklebers und Suche.
- Handauswahl: „Auswählen“ und Geräte antippen; die Bögen enthalten dann nur die ausgewählten Geräte.
- Dokumentationsbogen und Aufkleber-PDF folgen Filter bzw. Auswahl; die verwendete Auswahl steht auf dem Bogen unter „Notizen“.
- Sortierung: Geräte ohne Raum stehen am Ende.

## 1.5.1
- Scannen funktioniert jetzt auch in Browsern ohne eingebaute Barcode-Erkennung (z. B. Firefox, Safari): QR-Codes werden dann mit der Bibliothek jsQR (Apache-2.0) gelesen, live und per Foto.

## 1.5.0
- Neu: Dokumentationsbogen nach dem Vorbild des Homematic-IP-Vordrucks (A4, 6 Geräte je Seite) mit Gerätename, Raum/Montageort, Sonstiges und dem QR-Code-Aufkleber. Als PDF erzeugbar (Smartphone: teilen/speichern, dann drucken) oder direkt am PC drucken.
- Der Aufkleber enthält Name und Einbauort nicht mehr (sie stehen auf dem Bogen). Aufkleber-Bogen ebenfalls als PDF.
- Liste: Das Häkchen im QR-Symbol sitzt jetzt mittig (eigenes Symbol statt Textzeichen). Kachel "Scannen" bricht nicht mehr um.

## 1.4.0
- Neues Aussehen nach dem Vorbild der Homematic-IP-App: dunkelblaue Kopfzeile mit Kacheln in Cyan, Karten mit runden Ecken, Schrift Mulish (freie Schrift, ähnlich der App).
- Druckbogen: Der Stil des Bogens war versehentlich verloren gegangen und ist wiederhergestellt.

## 1.3.1
- Aufkleber: Lange Gerätenamen, Typen und Räume werden umbrochen statt abgeschnitten, die Höhe passt sich an.
- Formular für Smartphones überarbeitet: Felder stehen untereinander und sind gleich breit, nichts wird abgeschnitten, auch nicht bei großer Systemschrift; Speichern/Abbrechen/Löschen bleiben unten sichtbar und zentriert, die Kopfzeile bricht nicht mehr um.

## 1.3.0
- Der erzeugte QR-Code-Aufkleber enthält die Schlüsselzeile im Original-Format (Key: XXXXX-XXXXX-XXXXX-XXXXX-XXXXXX).
- Der Geräteschlüssel lässt sich im Formular auch in der gedruckten Schreibweise eingeben und wird intern als 32 Hex-Zeichen gespeichert.
- Die Panel-Adresse enthält einen Hash der Datei, damit Browser und Companion-App nach Updates die neue Oberfläche laden.

## 1.2.0
- Geräteschlüssel wird getrennt gespeichert, im Formular verdeckt, nie in der CSV; Panel und Befehle nur für Administratoren.
- Strenge Erkennung des Code-Formats (`EQ01` SG… DLK…), unbekannte Formate werden unverändert gespeichert.
- QR-Code-Aufkleber werden aus den Daten erzeugt (Anzeige, PNG, SVG, Druckbogen) statt ein Foto zu speichern. Fotos und Vorschaubilder entfallen, vorhandene werden beim Start entfernt.
- „Zettel“ heißt jetzt „QR-Code-Aufkleber“.

## 1.1.0
- Übernahme der eQ-3-Geräte aus der Geräteregistrierung von Home Assistant (Name, Typ, Raum, Firmware, SGTIN).
- Gescannte Aufkleber werden vorhandenen Geräten zugeordnet; Zähler und Filter für fehlende Aufkleber.
- Neues Feld Firmware; CSV mit Spalten Firmware und Aufkleber.

## 1.0.0
- Erste Version: Scannen, Foto, Manuell, Export/Import, Speicherung in Home Assistant.
