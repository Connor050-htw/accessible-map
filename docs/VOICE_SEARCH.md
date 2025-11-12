# Sprachsuche (Voice Search) Dokumentation

## Überblick

Die Sprachsuche ermöglicht es Benutzern, per Spracheingabe nach Burgen und Schlössern zu suchen. Die Karte zoomt automatisch zur gefundenen Burg und öffnet das Info-Popup.

## Funktionen

### Hauptfunktionen
- **Spracherkennung**: Nutzt die Web Speech API für deutsche Spracheingabe
- **Intelligente Suche**: Findet Burgen auch bei ungenauen Eingaben
- **Automatisches Zoomen**: Zoomt zur gefundenen Burg mit flüssiger Animation
- **Popup-Anzeige**: Öffnet automatisch das Info-Popup der Burg
- **Barrierefreiheit**: Vollständig tastatur- und screenreader-zugänglich

### Browser-Unterstützung
Die Sprachsuche funktioniert in folgenden Browsern:
- ✅ Chrome/Chromium (Desktop & Android)
- ✅ Edge (Desktop)
- ✅ Safari (iOS & macOS)
- ✅ Opera
- ❌ Firefox (keine Web Speech API Unterstützung)

## Verwendung

### Sprachsuche starten

**Methode 1: Map Control Button**
1. Finden Sie den 🎤 Button in der **linken oberen Ecke** der Karte
2. Der Button befindet sich **direkt unter** dem Audio-Description Button
3. Klicken Sie auf den 🎤 Button
4. Sprechen Sie Ihren Suchbefehl

**Methode 2: Tastenkombination**
- Drücken Sie `Strg + K` (Windows/Linux) oder `Cmd + K` (Mac)
- Sprechen Sie Ihren Suchbefehl

### Button-Position
```
┌──────────────────────────┐
│ [+] [−]      Zoom        │ ← Zoom Controls
│ [⛶]         Fullscreen   │ ← Fullscreen
│ [🔊]        Audio Desc.  │ ← Audio Description
│ [🎤]        Voice Search │ ← VOICE SEARCH (NEU!)
│ [≡]         Layers       │ ← Layer Control
└──────────────────────────┘
```

### Beispiel-Sprachbefehle

Die Sprachsuche versteht verschiedene Formulierungen:

```
✅ "Zeige mir die Burg Kreuzen"
✅ "Burg Hochosterwitz"
✅ "Wo ist Schloss Eggenberg"
✅ "Finde Burg Kreuzenstein"
✅ "Grazer Burg"
✅ "Zeig mir die Festung Hohenwerfen"
```

### Hinweise für beste Ergebnisse

1. **Klare Aussprache**: Sprechen Sie deutlich und in normaler Geschwindigkeit
2. **Burg-Name**: Nennen Sie den vollständigen Namen oder zumindest den Hauptteil
3. **Ruhige Umgebung**: Minimieren Sie Hintergrundgeräusche
4. **Mikrofonberechtigung**: Erlauben Sie dem Browser Zugriff auf Ihr Mikrofon

## Technische Details

### Suchlogik

Die Sprachsuche verwendet einen intelligenten Matching-Algorithmus:

1. **Normalisierung**: Entfernt Sonderzeichen und Umlaute
2. **Befehls-Extraktion**: Erkennt Befehle wie "zeige mir", "wo ist", etc.
3. **Ähnlichkeitsberechnung**: Vergleicht die Eingabe mit allen Burgnamen
4. **Best-Match**: Wählt die Burg mit der höchsten Übereinstimmung

### Ähnlichkeits-Score

Die Suche akzeptiert Treffer mit einem Score >= 0.4 (40% Übereinstimmung):
- **1.0**: Exakte Übereinstimmung
- **0.9**: Enthält den Suchbegriff komplett
- **0.8**: Suchbegriff enthält den Burgnamen
- **0.4-0.7**: Teilweise Übereinstimmung (Wortteile)

### Status-Meldungen

Status-Meldungen erscheinen als **Toast-Benachrichtigung** am oberen Bildschirmrand:

- 🔵 **"🎤 Hört zu..."**: Mikrofon ist aktiv, sprechen Sie jetzt
- 🟡 **"🔍 Erkannt: ..."**: Ihre Eingabe wurde erkannt und wird verarbeitet
- 🟢 **"✓ Burg gefunden: ..."**: Erfolgreich! Die Karte zoomt zur Burg
- 🔴 **"❌ Fehler"**: Problem bei der Erkennung oder Suche

Die Benachrichtigungen verschwinden automatisch nach 5 Sekunden.

## Integration

### Code-Struktur

```
src/features/voice-search.js       # Haupt-Logik
styles/components/voice-search.css  # Styling
src/main.js                         # Integration in App
```

### API-Verwendung

```javascript
// Initialisierung
import { initializeVoiceSearch } from './features/voice-search.js';
initializeVoiceSearch(map);

// Prüfung auf Unterstützung
import { isVoiceSearchSupported } from './features/voice-search.js';
if (isVoiceSearchSupported()) {
    // Sprachsuche verfügbar
}
```

## Barrierefreiheit

### Tastatur-Navigation
- `Strg/Cmd + K`: Sprachsuche starten/stoppen
- `Tab`: Navigation zum Button
- `Enter/Space`: Button aktivieren

### Screen-Reader
- Alle Buttons haben `aria-label` Attribute
- Status-Meldungen nutzen `aria-live="polite"`
- Fokus-Management beim Öffnen von Popups

### Visuelles Feedback
- Pulsierender Button während des Zuhörens
- Farbcodierte Status-Meldungen
- Animations können per `prefers-reduced-motion` deaktiviert werden

## Fehlerbehebung

### Mikrofon funktioniert nicht
1. Überprüfen Sie die Browser-Berechtigungen
2. Stellen Sie sicher, dass ein Mikrofon angeschlossen ist
3. Testen Sie das Mikrofon in anderen Anwendungen

### Keine Burg gefunden
1. Versuchen Sie eine einfachere Formulierung (nur der Burgname)
2. Sprechen Sie langsamer und deutlicher
3. Überprüfen Sie, ob die Burg in den Daten vorhanden ist
4. Prüfen Sie die Console auf Debug-Ausgaben

### Browser nicht unterstützt
- Verwenden Sie Chrome, Edge, Safari oder Opera
- Firefox unterstützt die Web Speech API nicht
- Aktualisieren Sie Ihren Browser auf die neueste Version

## Erweiterungsmöglichkeiten

### Zukünftige Features
- [ ] Mehrsprachige Unterstützung (Englisch, etc.)
- [ ] Kontinuierliche Spracherkennung
- [ ] Sprachbefehle für Karten-Navigation ("Zoom in", "Zoom out")
- [ ] Offline-Spracherkennung
- [ ] Benutzerdefinierte Synonyme für Burgnamen

### Anpassungen

**Sprache ändern:**
```javascript
recognition.lang = 'en-US'; // Für Englisch
```

**Mindest-Score anpassen:**
```javascript
if (bestScore >= 0.3) { // Niedrigerer Score = toleranter
    return bestMatch;
}
```

**Zoom-Level anpassen:**
```javascript
map.flyTo(latlng, 17, { // Höherer Zoom
    duration: 2
});
```

## Performance

- **Speicherverbrauch**: Minimal (nur Event-Listener)
- **Netzwerk**: Keine zusätzlichen Requests (nutzt bereits geladene POI-Daten)
- **CPU**: Gering (nur während aktiver Spracherkennung)
- **Latenz**: ~1-2 Sekunden von Spracheingabe bis Zoom

## Datenschutz

⚠️ **Wichtig**: Die Web Speech API sendet Audiodaten an Google-Server zur Verarbeitung
- Audiodaten werden nicht dauerhaft gespeichert
- Nur während aktiver Spracherkennung übertragen
- Kein Benutzer-Tracking implementiert
- Mikrofonzugriff erfordert explizite Nutzer-Berechtigung

## Support & Beiträge

Bei Fragen oder Problemen:
1. Prüfen Sie die Browser-Console auf Fehlermeldungen
2. Testen Sie verschiedene Formulierungen
3. Erstellen Sie ein Issue im Repository mit Details zu Browser, Betriebssystem und Fehlerbeschreibung
