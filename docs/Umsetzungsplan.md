# Umsetzungsplan — PRETTL Prozessdokumentation (Canvas)

> **Status:** Entwurf v0.1 · 2026-07-17 · UNIT-IX
> **Plattform:** Power Apps **Canvas App** + SharePoint Online + Power Automate + Azure AI Foundry + Entra ID

---

## Teil A — Große Challenges → Canvas-Umsetzung

| # | Challenge | So wird es in Canvas gebaut |
|---|---|---|
| **C1** 🔴 | **Übersetzung** Fertigung (u.a. polnisch). Browser-Übersetzung greift im Canvas-**Player** i.d.R. **nicht** zuverlässig. | **Vor Baubeginn testen** (Canvas + Browser-Translate am echten Player). Fallback in Canvas: In-App-Sprachumschalter (`colLanguage`); |
| **C2** | **RBAC** — Qualifikationen inkl. Skill-Punkte nur PV(Abteilung)+Admin. Canvas-Filter ist **keine harte Security**. | UI: Galerien/Screens über Rollen-Flags (`blnIsProcessOwner`, `blnIsAdministrator`) + `refArea`-Abgleich filtern. |
| **C3** | **3-stufige Freigabe** (Verfasser → PV inhaltlich → QM formell). | `optStatus` steuert alles. **Kontextabhängige Aktionsleiste** (Buttons nur sichtbar, wenn Rolle + Status passen). Statuswechsel per `Patch`; Mail-Benachrichtigung über Flows **F1–F4** (Trigger = Statusänderung). |
| **C4** | **Unterweisung** „Send email with options" (Genehmigen/Ablehnen aus der Mail). | **Flow F7**: je Kombination Prozess × Teilnehmer eine Mail → Antwort schreibt `tblInstructionParticipant.optStatus`. **Erst-Mail bei Erstellung**; **„Erinnern"** = geplanter **Sweep-Flow** über noch `Offen`e Teilnehmer. Voraussetzung M365-Postfach (Fertigung: **Sammelaccount**). |
| **C5** | **KI-Chatbot** (reiner **Finder**, Einzelfrage, Deutsch) über freigegebene Prozesse. | Canvas → **Power-Automate-Proxy `flwProcessAssistant`** → Azure AI Foundry. Kontext = **Index** (Titel + `mstrShortDescription`) nur der `Freigegeben`-Prozesse — kein Volltext/RAG-Store. Rückgabe via **„Respond to PowerApp"** (`antwort` + `trefferJson`) → Treffer-Karten mit Absprung. Detail: [Chatbot.md](Detailkonzepte/Chatbot.md). |
| **C6** | **Initialbefüllung** (kein net-new). | Import Mitarbeiter-/Prozessliste (Excel → SP-Listen). |
| **C7** | **Zwei Vorlagen (IMS/PROD)** aus einer Liste. | Reine **Frontend-Logik**: Feld-Blöcke je `optTemplateType` per `Visible` ein-/ausblenden (IMS-Block vs. PROD-Block). Frei definierbare Zusatzfelder aus `tblProcessAdditionalField` als **Galerie** unten (Titel + Typ + Wert). |
| **C8** | **Vollständigkeits-Ampel**. | Power Fx: Anteil nicht-leerer Kernfelder in % (`CountIf`/Coalesce über die relevanten Felder je Vorlagentyp). Rein berechnet, **kein** zusätzliches Feld. |

---

## Teil B — Große Workflows → Canvas-Ablauf

### B1 · Prozess-Lifecycle

**Screens:** Prozessliste (rollengefiltert, Suche/Filter) → **Prozess-Detail** (Tabs *Übersicht / Dokumente / Genehmigung & Versionen*, Inline-Edit je Vorlagentyp) → kontextabhängige Aktionsleiste. Bearbeiten = eigene Seite (kein Slide-in).

| Status (`optStatus`) | Sichtbare Aktion | Rolle | Flow |
|---|---|---|---|
| `Backlog` | Zuweisen (Verfasser setzen) → `InErfassung` | PV / Admin | **F1** → Mail an `refAuthor` |
| `InErfassung` | Einreichen → `InhaltlichePruefung` | Verfasser | **F2** → Mail an `refProcessOwner` |
| `InhaltlichePruefung` | Inhaltlich freigeben → `FormellePruefung` · Rückfrage/Ablehnen | PV (`refProcessOwner`) | **F3** → Mail an QM; setzt `dteContentReviewed` |
| `FormellePruefung` | Formell freigeben → neue **Ausgabe** · Ablehnen/Nachtest → zurück auf `InErfassung` (Prüfverlauf) | QM (`blnIsQM`) | **F4** → Mail an Verfasser (+PV); bei Freigabe `dteApproved` + Nr. (**C3**) |
| `Freigegeben` (Ausgabe live) | **Überarbeiten** (Klon → neuer **Entwurf**) · **Zurückziehen** | PV / Verfasser (Admin) | Neu-Freigabe → alte Ausgabe `Abgeloest`, löst **B2** aus |

**Versionierung (Detail: [Versionierung.md](Detailkonzepte/Versionierung.md)):** Zwei Ebenen — **Ausgabe** (nur freigegebene, `intEdition`) vs. **Entwurf** (Arbeitskopie im Workflow). PV-/QM-Ablehnung + QM-Nachtest setzen den Entwurf auf `InErfassung` zurück (Pflicht-Kommentar) und landen als **Prüfverlauf** (`tblProcessReviewEvent`) — sie erhöhen die Ausgabe-Nummer **nicht**.

### B2 · Unterweisung

Auslöser = **neue freigegebene Version** (aus B1). Ablauf:
1. PV wählt Empfänger (ganze Abteilung / Personen / mehrere Bereiche).
2. `tblInstruction` anlegen (`optType` Einzel/Sammel) + je Prozess × Teilnehmer eine `tblInstructionParticipant`-Zeile.
3. **Erst-Mail automatisch** (F7, „Send email with options" → Bestätigen/Ablehnen).
4. Antwort schreibt `optStatus` (Offen → Bestätigt/Abgelehnt) + `dteConfirmed`.
5. **„Erinnern"**-Button = Sweep-Flow über `Offen`e Teilnehmer. **Kein Turnus** (gesetzliche Regelunterweisungen bleiben in Quentic/E-Learning).

### B3 · Qualifikationsmatrix

3 Ebenen je Mitarbeiter:
- **Unterweisungen** — abgeleitet aus `tblInstructionParticipant` (read-only).
- **Qualifikationen** — manuell (`tblQualification`), **Skill-Punkte 1–4 = Prozessstabilität/Vertretung, kein Rating**, `dteExpiry`. **Sichtbar nur PV(Abteilung)+Admin** (C2).
- **Aufgaben** — `tblEmployeeTask`, reine **Rollendokumentation** (keine Deadline/Benachrichtigung), für **alle** sichtbar.

**Fälligkeit:** Sweep-Flow **F6** über `dteExpiry` → Erinnerung an PV (Verteiler später konfigurierbar).

---

## Offen 

- 🔴 **C1 verifizieren** (Canvas + Browser-/In-App-Übersetzung) — kann Plattform-Annahme kippen.