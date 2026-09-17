# Prüfsystematik — drei Stufen, ein Auswahlkriterium

Projektunabhängig. Gedacht zum Übertragen: die Regeln stehen ohne Projektnamen da, die Belege
kommen aus WiGrIT (React · TanStack · Tailwind · Supabase · Cloudflare Worker, Kunde testet
live auf `main`).

---

## Das Prinzip

**Die Maschine prüft, was der Mensch nicht sehen kann. Alles andere prüft der Mensch — am
Bildschirm, schneller und zuverlässiger als jedes Skript.**

Das ist der ganze Trick, und er dreht die übliche Reihenfolge um. Nicht „so viel prüfen wie
möglich", sondern: *Was entgeht dem Blick?* Drei Dinge entgehen ihm systematisch:

1. **Ein Absturz vor dem ersten Rendern.** Die Seite ist weiß, und man sieht nicht warum.
2. **Eine falsche Zahl.** Sie sieht auf dem Bildschirm genau richtig aus.
3. **Eine Prüfung, die blind grün ist.** Sie sieht aus wie eine, die nichts zu finden hat.

Alles Übrige — Layout, Beschriftung, Bedienweg, ob ein Knopf am richtigen Platz sitzt — sieht
ein Mensch in zwei Minuten und in einem Urteil, für das ein Test zwanzig Zeilen bräuchte und
das er trotzdem falsch abbildet.

**Die Folge:** Browsertests wandern aus der Entwicklungsschleife heraus in die CI. Sie
verschwinden nicht — sie hören auf, jede Runde zu kosten.

> Der Anlass in WiGrIT (Oliver, 08.09.2026): *„Können wir das Tempo bitte jetzt immer so
> lassen? So kommen wir im Projekt auch endlich mal voran und ich kann sinnvoll prüfen."*
> Vorher: 7,5 Minuten Prüflauf je Runde, dreimal Wiederholung eingebaut, damit er grün wird.
> Nachher: 35 Sekunden.

---

## Die drei Stufen

| | Stufe 1 — schnelle Spur | Stufe 2 — voller Lauf | Stufe 3 — CI |
|---|---|---|---|
| **Wann** | jede Runde, nicht verhandelbar | auf Verlangen, oder wenn der Umbau die Testfläche selbst anfasst | jeder Push |
| **Budget** | **unter 60 s** | unter 6 min | egal, läuft ohne Wartezeit |
| **Ein Befehl** | `npm run pruefen` | `npm run pruefen -- --voll` | derselbe, plus Browser |
| **Enthält** | Typen · Rechenproben · Unit · Lint · Hausregeln · Prüfer-Selbsttests | + echter Build + Klick-Probe | + alles, Verwundbarkeiten, Artefakte |
| **Wer liest das Ergebnis** | die Session, sofort | die Session, selten | Mensch, asynchron |

Die harte Zahl ist das **Budget von Stufe 1**. Überschreitet sie eine Minute, wird sie
übersprungen — nicht durch Beschluss, sondern durch Gewohnheit. Dann ist die Systematik weg.

---

## Das Auswahlkriterium

Für jede Prüfung genau eine Frage: **Sieht ein Mensch das in zwei Minuten am Bildschirm?**

| Antwort | Wohin |
|---|---|
| Nein, es ist unsichtbar (Typfehler, Zahl, Rundung, Grenzwert) | **Stufe 1** |
| Nein, es bricht erst im echten Build (Bündelung, Umgebungsvariablen, Serverpfade) | **Stufe 2** |
| Ja, aber niemand schaut jedes Mal hin (jede Route lädt, kein Absturz beim Klick) | **Stufe 3** |
| Ja, sofort und besser als jedes Skript (Layout, Text, Bedienweg, Gestaltung) | **gar nicht — Mensch** |

Die letzte Zeile ist die, die Zeit freisetzt. Sie zu akzeptieren ist die eigentliche
Entscheidung.

### Was in Stufe 1 gehört — mit Begründung, nicht mit Werkzeugnamen

- **Typprüfung.** Die einzige Stufe, die die weiße Seite verhindert. Ohne Ausnahme die erste.
- **Rechenproben.** Für jede Zahl, die das Produkt ausrechnet und anzeigt: Summen, Quoten,
  Boni, Umrechnungsfaktoren. Gegen feste Eingaben, ohne Netz und ohne Datenbank, damit sie in
  Millisekunden laufen.
- **Unit-Tests** der reinen Funktionen: Formatierung, Datum, Zeitzonen, Gültigkeitsfenster.
- **Linter.** Findet toten Code und kaputte Effekt-Abhängigkeiten. **Reicht allein nicht** — er
  führt den Code nie aus.
- **Hausregeln als Skript.** Alles, was im Projekt „genau ein Wert je Dimension" heißt (eine
  Schriftgröße je Rolle, eine Farbe je Bedeutung, ein Tabellenmuster). Eine Regel, die nur in
  einem Dokument steht, halten die, die es gelesen haben.
- **Selbsttests der Prüfer.** Siehe unten, Falle 2 — die unscheinbarste und teuerste Falle.

### Was nicht in Stufe 1 gehört

- Alles mit Browser. Sekundenbudget reißt sofort.
- Alles mit Netz oder echter Datenbank. Langsam, unzuverlässig, und im schlimmsten Fall
  **schreibend** (siehe Falle 5).
- Bildvergleiche. Der Mensch sieht Abweichungen schneller, und Referenzbilder veralten.
- Abhängigkeits-Audits. Die werden rot, ohne dass jemand Code geändert hat (Falle 1).

---

## Aufsetzen in einem neuen Projekt — sechs Schritte

1. **Inventur.** Alle vorhandenen Prüfbefehle auflisten und **einzeln die Laufzeit messen**,
   nicht schätzen. Erst die Zahlen zeigen, welche Prüfungen tatsächlich billig sind.
2. **Einsortieren** nach dem Kriterium oben. Ergebnis ist meist überraschend: das meiste, was
   Zeit kostet, prüft Dinge, die ein Mensch sofort sieht.
3. **Einen Sammelbefehl bauen**, nicht eine Kette in die Doku schreiben. Sechs Befehle, die
   man von Hand tippt, sind fünf Gelegenheiten, einen zu vergessen — und man merkt es nicht.
   Grundgerüst unten.
4. **Das Budget prüfen.** Über 60 s: die teuerste Stufe nach Stufe 2 verschieben, nicht das
   Budget erhöhen.
5. **CI als Auffangnetz** einrichten, mit der Reihenfolge aus Falle 1.
6. **In die Projektanweisung schreiben** (`CLAUDE.md`, `AGENTS.md`, README) — mit dem *einen*
   Befehl, dem Budget und dem Satz, was bewusst **nicht** geprüft wird. Sonst prüft die nächste
   Session wieder alles und nennt es Sorgfalt.

---

## Die fünf Fallen

Alle fünf sind in WiGrIT eingetreten. Sie kosten mehr als jede Prüfung, die man auslässt.

### 1. Ein Audit vor den Tests legt die ganze Testfläche still

`npm audit` (oder jede andere Abhängigkeitsprüfung) wird rot, **ohne dass jemand Code geändert
hat** — Meldungen erscheinen laufend. Steht der Schritt vorn und blockierend, fällt danach
alles aus.

> WiGrIT, 09.–10.09.2026: eine neue Meldung zu `browserslist` erschien, der Audit-Schritt stand
> als erster im ersten Job. Sieben Läufe hintereinander rot, der Browsertest-Job als `skipped`
> übersprungen. **Zwei Tage lang prüfte die CI nichts** — und niemand sah es, weil rot wie rot
> aussieht.

**Regel:** Audits stehen **hinter** den Prüfstufen, und zwar in zwei Schritten:

```yaml
- name: Verwundbarkeiten (Laufzeit, blockierend)
  run: npm audit --audit-level=high --omit=dev    # was ausgeliefert wird

- name: Verwundbarkeiten (Werkzeugkette, nur Meldung)
  continue-on-error: true
  run: npm audit --audit-level=high              # Build-/Deploy-Werkzeug, läuft nie beim Nutzer
```

Die Trennung ist keine Bequemlichkeit: eine Lücke im Deploy-Werkzeug erreicht keinen Nutzer,
eine im ausgelieferten Bündel schon. Und **die Schwelle nie hochdrehen, um grün zu werden** —
das ist der eine Handgriff, der die Prüfung wertlos macht.

### 2. Eine Prüfung, die blind grün ist, sieht aus wie eine, die nichts findet

> WiGrIT, 20.08.2026: eine Gestaltungsregel suchte mit `\b(auto)\b` — und traf in
> `grid-cols-[1fr_auto_1fr]` nie, weil `_` als Wortzeichen gilt. Die Regel war monatelang grün
> und hat nie etwas geprüft.

**Regel:** Jede selbstgebaute Prüfung bekommt einen **Selbsttest mit beiden Seiten** — Fälle,
die anschlagen *müssen*, und Fälle, die schweigen *müssen*. Der Selbsttest läuft in Stufe 1 mit
und kostet Millisekunden.

### 3. Ein Test, der von der Uhr abhängt, kippt irgendwann

> WiGrIT, 10.09.2026: eine Prüfaussage verglich `Math.round(gerechnet) === Math.round(erwartet)`.
> Die gerechnete Quote enthielt den Tagesanteil des Jahres und stand an diesem Tag bei
> 34,4996 %. Angezeigt wurde „34.50", gerundet 34, erwartet 35 → rot, obwohl die Euro-Rechnung
> daneben nur 7 € von 100 € Toleranz abwich.

**Regel:** Gegen **Toleranzen** prüfen, nie zwei gerundete Ganzzahlen vergleichen. Und was vom
Datum abhängt, fragt die Quelle nach ihrer eigenen Erwartung, statt eine Zahl zu behaupten.

Der Schaden ist nicht der rote Lauf, sondern die Gewöhnung: **ein Rot, das nichts bedeutet,
entwertet jedes Rot.** Dieser eine Fall macht die ganze Stufe 1 wertlos.

### 4. Wiederholungen verstecken echte Fehler

Steht `retries: 3` im Browsertest, ist ein Fehler, der in einem von vier Läufen auftritt,
unsichtbar. Meist sind die Wiederholungen eingebaut worden, um eine Eigenheit des
Entwicklungsservers zu überdecken.

**Regel:** Lokal **keine** Wiederholungen, in der CI höchstens eine. Und gegen einen **echten
Produktions-Build** testen, nicht gegen den Entwicklungsserver mit heißem Nachladen — dann gibt
es die Eigenheiten nicht, die man überdecken wollte.

### 5. Ein Testlauf, der die Produktivdatenbank erreicht

> WiGrIT, 08.09.2026: ein Screenshot-Skript lief gegen den Entwicklungsserver — der mit den
> echten Zugangsdaten läuft. Ein Klick im Skript setzte eine echte Aufgabe auf „erledigt".
> Gefunden hat es nicht der Bildschirm, sondern die Gegenprüfung einer Zahl.

**Regel:** Der Testbuild kennt die Datenbank **nicht** — mit leeren Zugangsvariablen bauen, so
dass die Adresse in **null** Dateien des Testartefakts steht. Ein Lauf, dem die Adresse fehlt,
kann die Produktivdatenbank nicht erreichen. Das ist eine Struktur, keine Disziplin.

---

## Kopiervorlage: der Sammelbefehl

Node, ohne Abhängigkeiten. Der vollständige Läufer steht in `scripts/pruefen.mjs`; das hier ist
das Gerüst, das jedes Projekt braucht.

```js
import { spawnSync } from "node:child_process";
import { performance } from "node:perf_hooks";

const VOLL = process.argv.includes("--voll");

// Reihenfolge nach AUSSAGEKRAFT, nicht nach Laufzeit: die erste rote Zeile soll die
// wichtigste sein. `findet` ist keine Zierde — es sagt dem Leser, warum die Stufe existiert.
const STUFE_1 = [
  { name: "Typen",       befehl: ["npx", ["tsc", "--noEmit"]],                     findet: "Typfehler — verhindert die weiße Seite" },
  { name: "Rechenproben", befehl: ["npm", ["run", "--silent", "test:rechenfaelle"]], findet: "falsche Zahlen, die richtig aussehen" },
  { name: "Unit",        befehl: ["npm", ["run", "--silent", "test:unit"]],         findet: "Formatierung, Datum, Grenzwerte" },
  { name: "Lint",        befehl: ["npm", ["run", "--silent", "lint"]],              findet: "toten Code, kaputte Hooks" },
  { name: "Hausregeln",  befehl: ["npm", ["run", "--silent", "test:design"]],       findet: "Abweichungen von den Gestaltungsregeln" },
];
const STUFE_2 = [
  { name: "Build",       befehl: ["npm", ["run", "--silent", "build"]],             findet: "was nur beim echten Bauen bricht" },
  { name: "Klick-Probe", befehl: ["npm", ["run", "--silent", "test:gate"]],         findet: "Routen, die nicht laden" },
];

const stufen = VOLL ? [...STUFE_1, ...STUFE_2] : STUFE_1;
const rot = [];
const start = performance.now();

for (const stufe of stufen) {
  const t = performance.now();
  const [cmd, args] = stufe.befehl;
  const r = spawnSync(cmd, args, { encoding: "utf8" });
  const s = (performance.now() - t) / 1000;
  const ok = r.status === 0;                       // Warnungen sind kein Rot
  console.log(`${ok ? "✅" : "❌"} ${stufe.name.padEnd(14)} ${s.toFixed(1).padStart(5)} s   ${stufe.findet}`);
  if (!ok) rot.push({ name: stufe.name, ausgabe: `${r.stdout ?? ""}${r.stderr ?? ""}` });
}

// ALLE Stufen laufen, auch nach einem Rot — sonst verdeckt der erste Fehler die anderen und
// es braucht so viele Runden wie es Stufen gibt.
const gesamt = ((performance.now() - start) / 1000).toFixed(0);
if (rot.length > 0) {
  for (const { name, ausgabe } of rot) {
    // Nur die beanstandeten Zeilen: bei 50 grünen Häkchen geht die eine rote sonst unter.
    const treffer = ausgabe.split("\n").filter((z) => /❌|✖|\berror\b/i.test(z));
    console.log(`\n── ${name} ──\n${(treffer.length ? treffer : ausgabe.split("\n").slice(-15)).join("\n")}`);
  }
  console.log(`\n${rot.length} von ${stufen.length} Stufen rot — ${gesamt} s`);
  process.exit(1);
}
console.log(`\nAlle ${stufen.length} Stufen grün — ${gesamt} s.`);
```

Zwei Entscheidungen darin sind wichtiger als der Rest:

- **`r.status !== 0` ist das einzige Rot-Kriterium.** Eine Prüfung, die bei Warnungen rot wird,
  wird abgeschaltet statt gelesen — WiGrIT trägt 36 Lint-Warnungen und ist grün.
- **Alle Stufen laufen durch.** Eine `&&`-Kette bricht beim ersten Fehler ab; man repariert,
  fährt neu, findet den nächsten. Sechs Stufen, sechs Runden.

## In der CI: Einzelschritte statt Sammelbefehl

Bewusst anders als lokal. Der Sammelbefehl ist eine Zeile im Log, und man sucht, welche Stufe
rot war. Einzelne Schritte zeigen es im Balken. Lokal zählt der eine Befehl, in der CI die
Ablesbarkeit — dieselbe Systematik, zwei Verpackungen.

---

## Der Satz, der es zusammenhält

Prüfungen sind nicht dazu da, Sicherheit zu erzeugen. Sie sind dazu da, **die Fehler zu finden,
die der Mensch nicht findet.** Jede Prüfung, die etwas absichert, was ohnehin auffällt, kostet
Tempo und gibt nichts zurück.

Und: eine Prüfung, deren Rot nichts bedeutet, ist schlimmer als keine.
