# Änderungsprotokoll

## 1.15.1
- Eigene Bögen: Geräte lassen sich beim Einsetzen jetzt auch nach Geräteart auswählen (zusätzlich zu Raum und Suche); beim Einfügen mehrerer Geräte gibt es „Alle markieren“.

## 1.15.0
- Gerätearten statt der Kategorien von homematic-ip.com: jedes Gerät gehört genau zu einer Art (z. B. Heizkörperthermostate, Fenster- & Türkontakte, Schlösser, Tore & Zutritt). Gilt für Gliederung der Liste, Filter und Druckvorlage.
- Rund 250 Homematic-IP-Modelle mit deutscher Bezeichnung hinterlegt (Quelle: Gerätedatenbank der CCU-Software OCCU von eQ-3, Stand 16.09.2026, und homematic-ip.com).
- Filter und Gliederung nach Gerätetyp (Modell) entfernt – die Suche findet auch Modellkürzel.

## 1.14.0
- Neue, einfachere Oberfläche mit drei Bereichen unten: **Geräte**, **Drucken**, **Mehr**. Das bisherige Menü entfällt.
- Fortschrittsanzeige „Original-Codes: X von N gescannt“ statt vier Kacheln; antippen zeigt die fehlenden Geräte, „?“ erklärt Original- und Online-Code.
- Gliederung der Liste wählbar: nach Raum, nach Funktion, nach Gerätetyp oder A–Z ohne Gruppen. Gruppen lassen sich auf- und zuklappen; die Wahl wird gemerkt.
- Gerät bearbeiten übersichtlicher: Aufkleber-Status oben, technische Angaben eingeklappt.
- Im Scan-Fenster direkt „Stattdessen Foto wählen“.
- Handauswahl entfernt (Druck nach aktuellem Filter oder über eigene Bögen).

## 1.13.0
- Eigene Bögen: freie Dokumentationsbögen zusammenstellen – Geräte einzeln oder mehrere auf einmal in Felder setzen, Felder leeren (bleiben beim Druck frei), einfügen, entfernen und verschieben, am PC auch per Ziehen tauschen. Druck über „Ausdrucke erstellen“ → „Eigene Bögen“, jede Seite einzeln wählbar. Die Bögen werden in Home Assistant gespeichert und zeigen beim Druck immer den aktuellen Stand der Geräte.

## 1.12.2
- Vorlage „Nach Funktion“: Geräte innerhalb eines Bogens nach Gerät (Bezeichnung) sortiert, dann nach Name – nicht mehr nach Raum.

## 1.12.1
- Vorlage „Nach Funktion“: Geräte erscheinen in allen ihren Kategorien (wie auf homematic-ip.com), nicht nur in der ersten.

## 1.12.0
- Ausdrucke mit Vorlagen: nach Räumen, nach Funktion (erste Kategorie laut homematic-ip.com), alphabetisch oder nach aktuellem Filter. Jeder Bogen beginnt auf einer neuen Seite und trägt Bogenname, Stand und Seitenzahl; einzelne Bögen lassen sich gezielt neu drucken und austauschen. Je Bogen werden Geräteanzahl, Seiten und letzte Änderung angezeigt.
- Anleitung im Menü.
- Versionsnummer im Menü und in der Anleitung.

## 1.11.0
- Automatischer Abgleich mit Home Assistant beim Öffnen der Seite: neue Geräte werden angelegt, die Firmware nachgeführt.
- Änderungen in Home Assistant (Name, Raum) werden als „In Home Assistant geändert“ markiert; im Gerät lassen sie sich einzeln übernehmen oder beibehalten, über der Liste alle auf einmal übernehmen.
- Geräte, die es in Home Assistant nicht mehr gibt, werden als „Nicht mehr in Home Assistant“ markiert (nicht gelöscht).
- Neue Filter: „In Home Assistant geändert“ und „Nicht mehr in Home Assistant“.

## 1.10.0
- Filter nach Kategorien wie auf homematic-ip.com (Access Points & Zentralen, Heizen & Raumklima, Licht, Beschattung, Sicherheit & Alarm, Wetter & Umwelt, Zutritt, Energiemanagement). Zuordnung aus dem Produktfilter der Homepage (ausgelesen am 02.11.2026); ein Gerät kann in mehreren Kategorien stehen, nicht zuordenbare Geräte unter „(ohne Kategorie)“.
- Bezeichnungen ergänzt: HmIP-WRC6-230 „Wandtaster – 6-fach, 230 V“; HmIP-BWTH jetzt „…, 230 V“ wie auf der Homepage.

## 1.9.0
- Gerätetypen mit deutscher Produktbezeichnung statt nur Kürzel: im Filter (alphabetisch, Kürzel klein darunter, Varianten wie „HmIP-PS-2 9YM“ zusammengefasst), in der Liste, in der Notizzeile und im Feld „Sonstiges“ des Bogens. Die Suche findet auch die Bezeichnung. Bezeichnungen stammen aus eQ-3-Unterlagen bzw. den Standardnamen der HCU; nicht belegte Kürzel bleiben als Kürzel stehen.

## 1.8.0
- Erklärung „Original-Code und Online-Code“ oben in der Liste (ein- und ausklappbar): wofür der Key gebraucht wird (Offline-Anlernen an der HCU) und wofür der Online-Code reicht (normales Anlernen mit Internet), mit Verweis auf das Anwenderhandbuch.

## 1.7.2
- Meldung nach dem Übernehmen nennt nur noch neue und aktualisierte Geräte (der Hinweis auf übersprungene Geräte ohne SGTIN entfällt).

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
