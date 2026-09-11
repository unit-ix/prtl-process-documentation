# Architektur — PRETTL Prozessdokumentation (QMS)

> **Status:** Entwurf v0.2 · 2026-07-17 · UNIT-IX (Stand nach Kundentermin)
> **Scope:** Vollständige App — Prozesse · Unterweisungen · Qualifikationsmatrix · Chatbot.
> **Zugehörig:** [PRD](PRD%20-%20PRETTL%20-%20Prozessdokumentation.md) · [DataModel.mmd](Detailkonzepte/DataModel.mmd) · [App-Notizen](Detailkonzepte/App-Notizen.md) · [Offene Punkte](Detailkonzepte/Offene-Punkte-Kundentermin.md)

---

## 1. Überblick & Komponenten

```
                          ┌─────────────────────────────┐
        Entra ID  ──auth──►      Power Apps Canvas App    │  (Browser + Teams + mobil)
     (SSO, Gruppen)        │  Prozesse · Detail · Biblio  │
                          └───────┬───────────────┬──────┘
                                   │ SP-Connector  │ Custom/Flow-Connector
                                   ▼               ▼
                   ┌───────────────────────┐   ┌──────────────────────────┐
                   │   SharePoint Online    │   │      Power Automate        │
                   │  Listen + Dokument-Bib.│◄──┤  Benachrichtigung, Nummer, │
                   │  (Datenhaltung/SSoT)   │   │  Status-Flows, KI-Proxy    │
                   └───────────────────────┘   └────────────┬─────────────┘
                                                             │ (spätere Phase)
                                                             ▼
                                                 ┌──────────────────────────┐
                                                 │   Azure Function (KI)      │
                                                 │  RAG → Azure OpenAI /      │
                                                 │  AI Foundry                │
                                                 └──────────────────────────┘
```

| Komponente | Rolle |
|---|---|
| **Entra ID** | Authentifizierung (SSO), Sicherheitsgruppen je App-Rolle |
| **Canvas App** | einzige UI (Erfassung, Freigabe-Workflow, Prozessbibliothek); Business-Logik & Sichtbarkeitsfilter |
| **SharePoint Online** | Datenhaltung (Listen aus [DataModel.mmd](Detailkonzepte/DataModel.mmd)) + Dokumentbibliothek; Single Source of Truth |
| **Power Automate** | Benachrichtigungen, halbautomatische Nummernvergabe, Statusfolge-Automatik, (später) KI-Proxy |
| **Azure Functions** | *(spätere Phase)* KI-Endpoint für den Prozess-Chatbot (RAG über die Prozessbibliothek) |

**Bewusst nicht genutzt:** Dataverse (Entscheidung: SharePoint), Copilot Studio (Entscheidung: Azure-Function-Weg), Word/PDF-Generierung (Entscheidung: kein VA-Dokument-Export).

---

## 2. Canvas-App — Screens & Navigation

Ausgangspunkt ist die rollen-gefilterte Prozessliste; Navigation über eine linke Leiste (Prozesse · Prozessbibliothek · Einstellungen[Admin]).

| # | Screen | Zweck / Kernelemente | Rollen |
|---|---|---|---|
| 1 | **Prozesse** (Liste) | Galerie aller *sichtbaren* Prozesse (rollengefiltert), Suche + Filter (Bereich, Status, Vorlagentyp), Statusbadges; Button „Prozess anlegen" | alle (gefiltert) |
| 2 | **Prozess anlegen** (Formular/Dialog) | Titel, Bezeichnung, Bereich, Vorlagentyp (IMS/PROD, Default aus Bereich), Geltungsbereich → Anlage in `Backlog`; setzt Prozessverantwortlichen | PV, Admin (ggf. MA) |
| 3 | **Prozess-Detail** | Tabs **Übersicht / Dokumente / Genehmigung & Versionen** (Ausgaben-Verlauf + Prüfverlauf); Inline-Edit der Felder **je Vorlagentyp** (IMS-Block vs. PROD-Block), Abschnitte/Aufgaben/RACI, „eigenes Feld", Vollständigkeits-Ampel; Aktionsleiste (kontextabhängig): Zuweisen · Einreichen · Inhaltlich freigeben · Ablehnen · Formell freigeben · Nachtest anfordern · Überarbeiten (neuer Entwurf) · Zurückziehen | kontextabhängig |
| 4 | **Prozessbibliothek** | nur `Freigegeben`, read-only; Suche/Filter; „Absprung" in Detailansicht | alle |
| 5 | **Einstellungen** | Bereiche + Abteilungsleiter-Zuordnung, Mitarbeiterliste, Stammdatenpflege | Admin |
| (opt.) | **Erfassungs-Assistent** | geführter Frage-für-Frage-Modus (aus Prototyp) als komfortabler Alternativpfad zur Inline-Erfassung | MA |



---

## 2b. Rollen, Workflow & Sichtbarkeit

**Freigabe (3-stufig):** Verfasser (erstellt) → **Prozessverantwortlicher** (= Abteilungsleiter, inhaltliche/Vier-Augen-Prüfung, automatisch aus der Abteilung) → **QM** (formelle Prüfung: Norm-/Kundenanforderungen) → Freigegeben. Status: `Backlog → InErfassung → InhaltlichePruefung → FormellePruefung → Freigegeben` (ersetzte Ausgabe → `Abgeloest`; terminal → `Zurueckgezogen`). **Ablehnung (PV/QM) und Nachtest (QM)** sind keine Ruhestatus, sondern setzen den Entwurf auf `InErfassung` zurück und werden als **Prüfverlauf-Ereignis** protokolliert — Versionierung siehe [Versionierung.md](Detailkonzepte/Versionierung.md).

**Rollen:** Verfasser (jede:r Mitarbeiter:in) · Prozessverantwortlicher (`blnIsProcessOwner`, je Abteilung) · QM (`blnIsQM`) · Admin (`blnIsAdministrator`).

**Sichtbarkeit / RBAC:**
- **Prozesse: offen** — alle App-Nutzer sehen alle Prozesse; keine Pro-Prozess-Berechtigung; Chatbot für alle (durchsucht nur freigegebene). `optConfidentiality` = nur Label.
- **Qualifikationsmatrix:** Aufgaben/Tätigkeiten für alle sichtbar; **Qualifikationen inkl. Skill-Punkte nur für Prozessverantwortlichen (der Abteilung) + Admin**.

---

## 3. Power-Automate-Flows

| ID | Trigger | Aktion |
|---|---|---|
| **F1 – Zuweisung** | `Status → InErfassung` | Mail an `refAuthor` (Verfasser) — „Prozess zur Bearbeitung offen" |
| **F2 – Einreichung** | `Status → InhaltlichePruefung` | Mail an `refProcessOwner` (Prozessverantwortlicher) |
| **F3 – Inhaltliche Prüfung ok** | `Status → FormellePruefung` | Mail an Gruppe **QM** |
| **F4 – Abschluss** | QM entscheidet | **Freigabe** → neue **Ausgabe** (`intEdition`+1, `dteApproved`, Dok-Nr., alte → `Abgeloest`); **Ablehnung/Nachtest** → Entwurf zurück auf `InErfassung`. Immer: Prüfverlauf-Ereignis + Mail an Verfasser (+ PV) |
| **F5 – Unterweisung nach Freigabe** | neue Version `Freigegeben` | PV wählt Empfänger (Abteilung(en)/Personen) → Unterweisung anlegen |
| **F6 – Qualifikations-Fälligkeit** | geplanter Sweep über `dteExpiry` | Erinnerung an Prozessverantwortlichen (Verteiler später konfigurierbar) |
| **F7 – Unterweisungs-Mails** | Unterweisung erstellt / „Erinnern" | Einzel: „Send email with options" (Bestätigen/Ablehnen); Erinnerungen als Sweep über offene Teilnehmer |


---

## 4. KI / Chatbot 

**Datenfluss:** `Canvas → Power Automate (Proxy-Flow flwProcessAssistant) → Azure AI Foundry → zurück`. Kein separater Azure Function nötig. Detailkonzept + Setup: [Chatbot.md](Detailkonzepte/Chatbot.md).

- **Scope: reiner Finder / Einzelfrage / Deutsch.** Findet den passenden **freigegebenen** Prozess, erklärt keine Inhalte (Absprung in den Prozess), kein Gesprächsverlauf.
- **Kontext:** Index der freigegebenen Prozesse (`strIdentifier`, `strTitle`, `mstrShortDescription`, `refArea`) — kein RAG-/Vektor-Store.
- **Antwort:** kurzer deutscher Satz + **Treffer-Karten** (Nummer + Titel + „Prozess öffnen"-Absprung), via „Respond to PowerApp".
- **Muster:** bestehender UNIT-IX-KI-Proxy (Flow als Gateway; API-Key nur im Flow, nicht in der App).
- **Lizenz-/Datenschutz:** HTTP/Azure-Connector = Premium; KI-Datenfluss bleibt im eigenen Azure-Tenant, datenschutzseitig bewerten.

---

## 5. Übersetzung

Inhalte liegen als **strukturierter Text** in den Feldern (nicht als hochgeladene Dokumente), damit die **Browser-Übersetzung** greift (Fertigung, u.a. polnisch). Dokumente nur als **Ergänzung** (Beiblatt/Zeichnung/Vorlage). **⚠️ Risiko:** Browser-Übersetzung funktioniert in **Power Apps Canvas** i.d.R. **nicht zuverlässig** (Player-Rendering). Vor Baubeginn verifizieren — sonst Plattform (Code App/React vs. Canvas) oder In-App-/KI-Übersetzung neu bewerten. Siehe [Offene Punkte](Detailkonzepte/Offene-Punkte-Kundentermin.md).

## 6. Initialbefüllung (Import)

Nicht leer: Kunde liefert **Mitarbeiterliste (Excel)** und **Prozessliste (Excel: Prozess, Bezeichnung, Abteilung)** + bestehende Beschreibungen. Prozess-Altbeschreibungen werden **KI-gestützt** in die strukturierten Felder vorbefüllt; Dokumente als Ergänzung.

## 7. Nicht im Scope / Perspektive

E-Learning-Plattform und Arbeitsschutz (Quentic) bleiben in den **bestehenden Systemen**; spätere Integration ist Perspektive. Bei weiteren Modulen die Plattform-Tragfähigkeit mitdenken (s. Übersetzungs-Risiko §5).

