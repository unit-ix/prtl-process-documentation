# PRETTL - Prozessdokumentation

**Erstellt am:** 2026-07-09
**Erstellt von:** UNIT IX
**Status:** Entwurf

---

## Inhaltsverzeichnis

- [Executive Summary](#executive-summary)
- [1. Problem & Ziele](#1-problem--ziele)
- [2. Nutzergruppen](#2-nutzergruppen)
- [3. Scope & Decisions](#3-scope--decisions)
- [4. Anforderungen](#4-anforderungen)
- [5. Geschäftslogik](#5-geschäftslogik)
- [6. Automatisierungen & KI](#6-automatisierungen--ki)
- [7. Lizenzen & Dienste](#7-lizenzen--dienste)
- [8. Timeline](#8-timeline)
- [9. Verknüpfte Artefakte](#9-verknüpfte-artefakte)
- [10. Offene Punkte](#10-offene-punkte)

---

## Executive Summary

PRETTL Electronics (Radeberg, ~400 Mitarbeitende, Elektronik-Zulieferer u.a. für die Medizintechnik) dokumentiert Prozesse bisher unzureichend in Intrexx — schwer pflegbar, schlecht auffindbar, Freigaben nicht durchgängig systemgestützt. Die Lösung ist eine Canvas App auf Basis von SharePoint und Power Automate mit vier zusammenhängenden Bereichen: **Prozesse** (strukturiert erfassen, mehrstufig freigeben, in einer Prozessbibliothek sichtbar machen), **Unterweisungen** (Mitarbeitende auf Prozesse schulen und Kenntnisnahme nachweisen), **Qualifikationsmatrix** (Unterweisungen, Qualifikationen und Aufgaben je Mitarbeiter) und ein **KI-Chatbot** (Fragen zu freigegebenen Prozessen in natürlicher Sprache). Die App ist das führende Autorensystem; ein Word/PDF-Dokument wird nicht erzeugt — die digitale Freigabekette ersetzt den Unterschriftenblock.

---

## 1. Problem & Ziele

### 1.1 Problem Statement

Prozesse werden bei PRETTL nach zwei Vorlagentypen dokumentiert — IMS (allgemein) und PROD (Fertigung) — heute in Intrexx als Word/PDF. Die Erfassung ist uneinheitlich, das Vier-Augen-Prinzip der Freigabe (laut VA PE 1 IMS.002) nicht durchgängig systemgestützt, und freigegebene Prozesse sind schwer auffindbar. Eng damit verbunden sind Unterweisungen (wer wurde auf welchen Prozess geschult) und die Qualifikationsübersicht der Mitarbeitenden — beides heute manuell und ohne Verknüpfung zu den Prozessen. Auslöser ist der Wunsch nach einem geführten, nachvollziehbaren Ablauf von der Erfassung bis zur Freigabe, einer zentralen Prozessbibliothek und einem durchgängigen Nachweis von Unterweisung und Qualifikation.

### 1.2 Bestehende Systeme

- **Microsoft 365 (SharePoint, Power Automate, Outlook)** → Datenbasis, Automatisierung, Benachrichtigung
- **Entra ID** → Authentifizierung und Rollen
- **Azure AI Foundry** → KI-Chatbot

### 1.3 Erfolgskriterien

- Alle neuen Prozesse durchlaufen die App vollständig (Erfassung → fachliche Prüfung → Freigabe)
- Jeder freigegebene Prozess trägt eine vollständige digitale Freigabekette (Autor · Prüfer · Freigeber)
- Unterweisungen sind je Mitarbeiter und Prozess lückenlos nachweisbar (inkl. MA ohne M365-Account)
- Freigegebene Prozesse sind zentral auffindbar — über die Bibliothek und den Chatbot

---

## 2. Nutzergruppen

| Rolle | Beschreibung | Anzahl |
| --- | --- | --- |
| Verfasser (Mitarbeiter) | Erstellt/erfasst zugewiesene Prozesse; bestätigt Unterweisungen; sieht nur die eigenen zugewiesenen Prozesse | viele (Fertigungs-MA teils ohne M365-Account) |
| Prozessverantwortlicher (= Abteilungsleiter) | Inhaltliche (Vier-Augen-)Prüfung der Prozesse seiner Abteilung, automatisch zugeordnet; erstellt Unterweisungen; pflegt Qualifikationen/Aufgaben | je Abteilung |
| Qualitätsmanagement (QM) | Finale/formelle Prüfung (Norm-/Kundenanforderungen) → Freigabe; vergibt finale Dok-Nummer | wenige |
| Administrator | Pflegt Bereiche, Prozessverantwortliche, Mitarbeiter, Stammdaten | wenige |

Alle App-Nutzer können freigegebene Prozesse in der Bibliothek lesen und den Chatbot nutzen.

---

## 3. Scope & Decisions

### In Scope

Die vollständige App mit vier Bereichen:

1. **Prozesse** — anlegen, zuweisen, erfassen (Vorlage IMS/PROD), zweistufige Freigabe, Versionierung, halbautomatisches Identkennzeichen, Prozessbibliothek, Admin-Stammdaten.
2. **Unterweisungen** — Einzel- und Sammelunterweisung, Mail-Bestätigung, PDF-Unterschriftenliste, Erinnerungen.
3. **Qualifikationsmatrix** — Unterweisungen (abgeleitet), Qualifikationen und Aufgaben je Mitarbeiter, mit Filtern.
4. **KI-Chatbot** — Fragen zu freigegebenen Prozessen mit Absprung-Link.

### Out of Scope

- **Kein VA-Dokument-Export** (Word/PDF) — bestätigt: es zählt die „dokumentierte Information", nicht ein Einzeldokument; zudem müssen Inhalte **übersetzbar** sein (Dokumente wären es nicht). Dokumente nur als Ergänzung (Beiblatt/Zeichnung/Vorlage).
- **E-Learning-Plattform & Arbeitsschutz (Quentic)** bleiben in den bestehenden Systemen (spätere Integration = Perspektive).
- **Turnus-/Regelunterweisungen** (gesetzliche Wiederholungen) nicht als eigene Engine — die Unterweisung wird hier bei Prozess-Revision ausgelöst.

### Initialbefüllung

Kein leerer Start: Import einer **Mitarbeiterliste** (Excel) und einer **Prozessliste** (Excel: Prozess, Bezeichnung, Abteilung) mit **KI-gestützter Vorbefüllung** der Prozessfelder aus bestehenden Beschreibungen; Dokumente als Ergänzung.

### Architektur-Decisions

**App-Typ: Canvas App** — PRETTL nutzt Microsoft 365; keine Dataverse-Lizenzen nötig; Anforderungen bestehen aus Formularen, Listen und geführten Workflows.

**Datenbasis: SharePoint-Listen** — im Tenant vorhanden; Datenmodell siehe [DataModel.mmd](Detailkonzepte/DataModel.mmd).

**Zwei Vorlagen (IMS/PROD): frontend-gelöst** — beide Feldsätze liegen auf `tblProcess`; die App blendet je Vorlagentyp die passenden Felder ein/aus. Zusatzfelder in `tblProcessAdditionalField`.

**Benachrichtigungen & KI: Power Automate** — Freigabe- und Unterweisungs-Mails über Outlook; der Chatbot läuft über einen Power-Automate-Flow mit Azure AI Foundry (kein Copilot Studio).

**App = führendes Autorensystem** — Single Source of Truth ohne Dokument-Generierung; die digitale Freigabekette ersetzt den Unterschriftenblock.

**Übersetzbarkeit** — Inhalte als strukturierter Text (browser-übersetzbar), keine dokumentgetragenen Prozesse. ⚠️ Offen: ob Browser-Übersetzung auf **Canvas** trägt — sonst Plattform (Code App/React) neu bewerten (siehe §10).

---

## 4. Anforderungen

### 4.1 Funktionale Anforderungen

#### Prozesse

##### US-001: Prozess anlegen
**Als** Prozessverantwortlicher **möchte ich** einen neuen Prozess mit Basisdaten anlegen **damit** die Dokumentation strukturiert startet.
- Felder: Titel, Bezeichnung, Bereich, Vorlagentyp (IMS/PROD), Geltungsbereich (PE/PER/PEL)
- Nach dem Speichern Status „Backlog"; Bereich bestimmt Prozesskategorie und Kurzbezeichnung für das Identkennzeichen

##### US-002: Prozess-Übersicht einsehen
**Als** Nutzer **möchte ich** meine relevanten Prozesse in einer Übersicht sehen **damit** ich den Status auf einen Blick erkenne.
- Rollenfilter in der Erfassung: Verfasser nur zugewiesene; Prozessverantwortlicher seine Abteilung; QM/Admin alle. Freigegebene Prozesse sind für alle sichtbar.
- Suche und Filter nach Bereich, Status, Vorlagentyp

##### US-003: Prozess zuweisen
**Als** Prozessverantwortlicher **möchte ich** einen Backlog-Prozess einem Mitarbeiter zuweisen **damit** die Erfassung beginnt.
- Status wechselt auf „In Erfassung"; der Mitarbeiter erhält eine Benachrichtigung

##### US-004: Prozess bearbeiten
**Als** Mitarbeiter **möchte ich** den Prozess auf einer vollständigen Bearbeiten-Seite erfassen **damit** ich alle Inhalte übersichtlich pflege.
- „Bearbeiten"-Button öffnet eine eigene Seite mit allen Feldern (kein Slide-in)
- Je Vorlagentyp werden IMS- bzw. PROD-Felder ein-/ausgeblendet; Vollständigkeitsanzeige (Anteil ausgefüllter Felder)

##### US-005: Zusatzfelder, Dokumente & mitgeltende Unterlagen
**Als** Mitarbeiter **möchte ich** Zusatzfelder, Dokumente und Verweise ergänzen **damit** der Prozess vollständig ist.
- Frei definierbare Zusatzfelder (Titel + Typ) als Galerie unten im Formular
- Dokumenten-Upload; mitgeltende Unterlagen (interne Prozesse + externe Links) gemeinsam

##### US-006: Einreichen & inhaltliche Prüfung
**Als** Prozessverantwortlicher **möchte ich** eingereichte Prozesse inhaltlich prüfen **damit** nur fachlich korrekte Inhalte zur formellen Freigabe gelangen.
- Verfasser reicht ein → „In inhaltlicher Prüfung"; der Prozessverantwortliche (automatisch aus der Abteilung) wird benachrichtigt
- Inhaltliche/Vier-Augen-Prüfung; weiterleiten → „In formeller Prüfung" (QM benachrichtigt) oder ablehnen

##### US-007: Formelle Freigabe (QM)
**Als** Qualitätsmanagement **möchte ich** geprüfte Prozesse gegen Norm-/Kundenanforderungen final freigeben, ablehnen oder einen Nachtest anfordern **damit** die Freigabe eindeutig und normkonform ist.
- Freigeben → neue **Ausgabe** (finale Dok-Nummer, Freigabekette Verfasser · Prozessverantwortlicher · QM vollständig; vorherige Ausgabe → „Abgelöst")
- Ablehnen **oder** Nachtest anfordern (Pflicht-Begründung) → Entwurf zurück an Verfasser („In Erfassung"); als **Prüfverlauf-Ereignis** protokolliert; erhöht die Ausgabe-Nummer **nicht**

##### US-008: Versionierung (Ausgabe & Entwurf)
**Als** Prozessverantwortlicher **möchte ich** einen freigegebenen Prozess überarbeiten **damit** Änderungen nachvollziehbar zu einer neuen Ausgabe führen.
- „Überarbeiten" klont die Live-Ausgabe zu einem **Entwurf** (die Live-Ausgabe bleibt gültig, bis die neue freigegeben ist); jede Prüfrunde steht im **Prüfverlauf**; alte Ausgaben bleiben read-only lesbar. Detailkonzept: [Versionierung.md](Detailkonzepte/Versionierung.md)

##### US-009: Prozessbibliothek nutzen
**Als** Nutzer **möchte ich** freigegebene Prozesse zentral durchsuchen **damit** ich benötigte Prozesse schnell finde.
- Nur freigegebene Prozesse, schreibgeschützt; Suche/Filter; Absprung in die Detailansicht

##### US-010: Stammdaten verwalten
**Als** Administrator **möchte ich** Bereiche, Abteilungsleiter und Mitarbeiter pflegen **damit** Zuständigkeiten und Zugriffe korrekt sind.
- Bereiche mit Abteilungsleiter-Zuordnung; Mitarbeiterliste inkl. MA ohne M365-Account

#### Unterweisungen

##### US-011: Einzelunterweisung erstellen
**Als** Prozessverantwortlicher **möchte ich** eine Einzelunterweisung mit Teilnehmern und mehreren Prozessen anlegen **damit** Mitarbeitende die Prozesse bestätigen.
- Typischer Auslöser: **neue, freigegebene Version** eines Prozesses → der Prozessverantwortliche wählt die Empfänger (ganze Abteilung, einzelne Personen oder mehrere Abteilungen; bei mehreren ggf. gestaffelt an die jeweiligen Verantwortlichen)
- Auswahl mehrerer Prozesse und Teilnehmer; Frist (Standard 14 Tage)
- Beim Erstellen geht je Teilnehmer × Prozess automatisch eine Mail raus
- Übersicht: alle zugewiesenen Prozesse, darunter die Teilnehmer mit Status

##### US-012: Unterweisung bestätigen oder ablehnen
**Als** Mitarbeiter **möchte ich** eine Unterweisung per Mail bestätigen oder ablehnen **damit** meine Kenntnisnahme dokumentiert ist.
- Mail mit „Genehmigen/Ablehnen" (Send email with options); Antwort setzt Status (Bestätigt/Abgelehnt) + Zeitstempel
- Voraussetzung M365-Postfach; MA ohne Postfach laufen über die Sammelunterweisung

##### US-013: Erinnerungen versenden
**Als** Ersteller **möchte ich** offene Teilnehmer erinnern **damit** die Frist eingehalten wird.
- „Erinnern"-Button löst einen Sweep-Flow aus, der nur noch offene Teilnehmer anschreibt (einzeln oder „Alle erinnern")

##### US-014: Sammelunterweisung mit Unterschriftenliste
**Als** Ersteller **möchte ich** eine Vor-Ort-Unterweisung mit ausdruckbarer Unterschriftenliste durchführen **damit** auch MA ohne Account erfasst werden.
- Auswahl Prozess(e) + Teilnehmer; keine Mails
- PDF-Unterschriftenliste (Name, Abteilung, Unterschrift) zum Ausdruck; gescannte Liste als Dokument hochladen
- Bestätigung manuell oder als Bulk

##### US-015: Unterweisungs-Status verfolgen
**Als** Ersteller **möchte ich** den Status je Teilnehmer sehen **damit** ich den Fortschritt überblicke.
- Status offen/bestätigt/abgelehnt + Datum; „Alle bestätigen"; Filter

#### Qualifikationsmatrix

##### US-016: Qualifikationsmatrix einsehen
**Als** Nutzer **möchte ich** je Mitarbeiter die Aufgaben/Tätigkeiten sehen **damit** ich weiß, wer wofür zuständig ist (Vertretung/Transparenz).
- Tabelle Mitarbeiter × (Unterweisungen / Qualifikationen / Aufgaben); Detailansicht je Mitarbeiter
- **Sichtbarkeit:** Aufgaben/Tätigkeiten für alle; **Qualifikationen inkl. Skill-Punkte nur für den Prozessverantwortlichen (der Abteilung) + Admin**
- Ebene „Unterweisungen" automatisch aus bestätigten Unterweisungen; Filter nach Abteilung, Qualifikation, Aufgabe

##### US-017: Qualifikation erfassen
**Als** Prozessverantwortlicher/Administrator **möchte ich** Qualifikationen je Mitarbeiter manuell pflegen **damit** Nachweise dokumentiert und Vertretungen absicherbar sind.
- Felder: Bezeichnung, Beschreibung, Datum, Fälligkeit, Skill-Punkte (1–4), Dokument
- Skill-Punkte dienen der **Prozessstabilität/Vertretung** (wer kann was) — **keine Leistungsbewertung**
- Bei Fälligkeit: Erinnerung an den Prozessverantwortlichen (siehe §6)

##### US-018: Aufgaben / Tätigkeiten pflegen
**Als** Prozessverantwortlicher **möchte ich** Aufgaben/Tätigkeiten je Mitarbeiter pflegen **damit** Zuständigkeiten und Vertretungen für alle transparent sind.
- Felder: Bezeichnung, Beschreibung — reine Rollendokumentation (keine Deadline, keine Benachrichtigung)
- Für alle sichtbar

#### KI-Chatbot

##### US-019: Prozess-Chatbot nutzen
**Als** Mitarbeiter **möchte ich** in natürlicher Sprache nach Prozessen fragen **damit** ich schnell den richtigen finde.
- Frage → Antwort mit Absprung-Link zum passenden Prozess; ausschließlich freigegebene Prozesse
- Umsetzung: Power-Automate-Flow mit Azure AI Foundry; Prozesse (Titel + Kurzbeschreibung) als Kontext; Rückgabe via „Respond to PowerApp"

### 4.2 Begleitende Maßnahmen

- **Initialbefüllung:** Import Mitarbeiter- + Prozessliste (Excel); Prozessfelder KI-gestützt aus Alt-Beschreibungen vorbefüllt (siehe §3)
- **Schulung:** kurze Einführung für Prozessverantwortliche, Mitarbeiter und Admin
- **Dokumentation:** Kurzanleitung als Begleitmaterial

---

## 5. Geschäftslogik

### Prozess-Statusmodell

**Backlog → In Erfassung → In inhaltlicher Prüfung → In formeller Prüfung → Freigegeben** (ersetzte Ausgabe → Abgelöst; terminal → Zurückgezogen).
Anlegen = Backlog. Zuweisung → In Erfassung (Verfasser erfasst). Einreichen → In inhaltlicher Prüfung durch den **Prozessverantwortlichen** (= Abteilungsleiter, automatisch aus der Abteilung; Vier-Augen). Weiterleiten → In formeller Prüfung durch das **QM** (Norm-/Kundenanforderungen), das freigibt (→ neue Ausgabe). **Ablehnung (PV/QM) und Nachtest (QM)** sind keine Ruhestatus: der Entwurf geht mit Pflicht-Kommentar zurück auf „In Erfassung" und die Runde wird im **Prüfverlauf** protokolliert (erhöht die Ausgabe-Nummer nicht). Zwei Ebenen — **Ausgabe** (freigegeben, nummeriert) vs. **Entwurf** (Arbeitskopie); Detail: [Versionierung.md](Detailkonzepte/Versionierung.md).

### Zwei Vorlagen (IMS / PROD)

Rein im Frontend gelöst: je Vorlagentyp passende Felder ein-/ausblenden. IMS betont Zweck, Geltungsbereich, Begriffe, Zuständigkeiten, Prozessbeschreibung; PROD ergänzt Arbeitsabfolge, Prozessparameter, Dokumentation, Reaktionsplan bei Abweichungen und Wartungsverweis. Zusatzfelder in `tblProcessAdditionalField`. Die PROD-Vorlage gilt für den Fertigungs-Nachfolgebereich **Operation + Technology** (die frühere „Fertigung/PROD" entfällt in der Struktur 2026; siehe [Bereiche.md](Detailkonzepte/Bereiche.md)).

### Identkennzeichen (halbautomatisch)

Format `{VA/AA} {PE/PER/PEL} {1/2/3} {Bereich-Kurz}.{lfd. Nr.}` (z.B. `VA PE 1 IMS.001`). Die App leitet Typ/Geltungsbereich/Kategorie/Bereich ab und schlägt die laufende Nummer vor; die finale Dok-Nummer bestätigt die QMB bei der Freigabe.

### Versionierung

Eine neue Ausgabe zählt nur, wenn ein bereits freigegebener Prozess wieder geöffnet, geändert und erneut freigegeben wird — nicht bei jeder Bearbeitung. Die Änderungshistorie (Ausgabe, Datum, Grund, Bearbeiter) bleibt erhalten.

### Vollständigkeit

Der Anteil der ausgefüllten (nicht leeren) Felder — als Anzeige in der Bearbeiten-Ansicht.

### Sichtbarkeit

Prozesse sind grundsätzlich **offen** — alle App-Nutzer sehen alle Prozesse (keine Pro-Prozess-Berechtigung); in der Erfassung filtert die App nach Zuständigkeit (Verfasser: eigene; Prozessverantwortlicher: Abteilung). `optConfidentiality` ist nur ein Label, steuert keinen Zugriff. **Ausnahme Qualifikationsmatrix:** Aufgaben/Tätigkeiten für alle sichtbar; Qualifikationen inkl. Skill-Punkte nur für den Prozessverantwortlichen (der Abteilung) + Admin.

### Unterweisungs-Logik

Auslöser ist i.d.R. eine **neue, freigegebene Prozessversion** — der Prozessverantwortliche entscheidet, wer unterwiesen wird. **Kein fixer Turnus** in dieser App (gesetzliche Regelunterweisungen laufen in den bestehenden Systemen). Einzelunterweisung: Teilnehmer × Prozesse ergibt je Kombination einen Datensatz (`tblInstructionParticipant`, unterschieden über `refInstruction` und `refProcess`) mit eigenem Status. Erst-Mail bei Erstellung; die Frist ist nur der Termin, bis zu dem bestätigt sein muss; Erinnerungen laufen über einen Sweep-Flow. Sammelunterweisung (Fertigung, Sammelaccount): keine Mails, stattdessen ausgedruckte Unterschriftenliste (PDF) + Scan-Upload; Bestätigung manuell.

### Qualifikationsmatrix

Drei Ebenen je Mitarbeiter: **Unterweisungen** (automatisch aus bestätigten Unterweisungen abgeleitet), **Qualifikationen** (manuell, mit Skill-Punkten 1–4 und Fälligkeit; Skill-Punkte = Prozessstabilität/Vertretung, **keine Leistungsbewertung**) und **Aufgaben/Tätigkeiten** (manuell, Rollendokumentation). Sichtbarkeit s. Abschnitt „Sichtbarkeit"; Pflege durch den Prozessverantwortlichen der Abteilung.

### Übersetzung

Inhalte liegen als strukturierter Text vor, damit die **Browser-Übersetzung** greift (Fertigung, u.a. polnisch); Dokumente nur als Ergänzung. ⚠️ Ob Browser-Übersetzung auf **Canvas** zuverlässig funktioniert, ist zu verifizieren (siehe §10).

---

## 6. Automatisierungen & KI

### Freigabe-Benachrichtigungen

Power Automate versendet Mails bei den Übergängen: Zuweisung → Verfasser; Einreichung → Prozessverantwortlicher (inhaltliche Prüfung); Weiterleitung → QM (formelle Prüfung); Ergebnis (Freigabe **oder** Ablehnung/Nachtest mit Kommentar) → Verfasser. Zustellung als Outlook-Mail mit Absprung in die App.

### Unterweisungs-Mails

Erst-Mail automatisch bei Erstellung; Entscheidung Genehmigen/Ablehnen per „Send email with options" (Flow bleibt bis zur Antwort offen). Erinnerungen als separater, geplanter Sweep-Flow, der offene Teilnehmer findet und anschreibt — on demand über den „Erinnern"-Button. Details siehe [App-Notizen.md](Detailkonzepte/App-Notizen.md).

### Qualifikations-Fälligkeit

Geplanter Sweep-Flow über `dteExpiry`: läuft eine Qualifikation aus, wird der Prozessverantwortliche erinnert (Verteiler später konfigurierbar).

### Unterweisungs-Trigger

Nach Freigabe einer neuen Prozessversion kann der Prozessverantwortliche eine Unterweisung mit Empfängerauswahl anstoßen.

### KI-Chatbot

Ein Power-Automate-Flow mit Azure AI Foundry (System-Prompt) beantwortet Fragen zu Prozessen. Dem Modell werden die freigegebenen Prozesse mit Titel und Kurzbeschreibung mitgegeben (nicht nur IDs); es schlägt den passenden Prozess vor und gibt die Antwort mit Link über „Respond to PowerApp" zurück.

---

## 7. Lizenzen & Dienste

| Dienst | Lizenz / Hinweis |
| --- | --- |
| SharePoint, Outlook, Power Automate (Standard-Connectoren) | in M365 enthalten |
| Azure-Function / Custom-Connector (Chatbot) | Premium — Bedarf klären |
| Azure AI Foundry (Chatbot) | Verbrauch + Datenschutz bewerten |

---

## 8. Timeline

Alle vier Bereiche gehören zum Liefergegenstand; Reihenfolge des Rollouts:

| Phase | Inhalt |
| --- | --- |
| 1 | Prozesse (Fundament) |
| 2 | Unterweisungen |
| 3 | Qualifikationsmatrix |
| 4 | KI-Chatbot |

Aufwände und Termine je Phase im Umsetzungsplan (separat).

---

## 9. Verknüpfte Artefakte

| Artefakt | Status | Link |
| --- | --- | --- |
| Datenmodell | Vorhanden | [DataModel.mmd](Detailkonzepte/DataModel.mmd) |
| App-Notizen (Detailkonzept) | Vorhanden | [App-Notizen.md](Detailkonzepte/App-Notizen.md) |
| Bereiche (Seed 2026) | Vorhanden | [Bereiche.md](Detailkonzepte/Bereiche.md) |
| Berechtigungskonzept | Ausstehend | — |
| Power Automate Flows | Ausstehend | — |
| Initialbefüllung (Import) | Geplant | Mitarbeiter- + Prozessliste (Excel) + KI-Vorbefüllung |

---

## 10. Offene Punkte

- 🔴 **Übersetzung auf Canvas:** Browser-Übersetzung (Fertigung/polnisch) funktioniert auf Power Apps Canvas evtl. nicht zuverlässig → vor Baubeginn testen; ggf. Plattform (Code App/React) neu bewerten.
- **Neue Abteilungsstruktur 2026 (Vorschlag):** 18 Bereiche (siehe [Bereiche.md](Detailkonzepte/Bereiche.md)) — ab wann verbindlich?
- **PROD-Vorlage-Bereich:** Annahme „Operation + Technology" — bestätigen.
- **Kürzel „F / T"** ungünstig fürs Identkennzeichen — sauberes Ein-Token-Kürzel.
- **POD-Prozessart** im Vorschlag inkonsistent (2-Kern vs. 3-Unterstützung) — klären.
- **Geltungsbereich** Einfach- vs. Mehrfachauswahl bestätigen.
- **Initialbefüllung:** Format/Umfang der Mitarbeiter- + Prozessliste (Excel) abstimmen.
- **Reminder-Verteiler** (Qualifikations-Fälligkeit) konfigurierbar — Logik später festlegen.
- **Lizenzen/Accounts** (Premium-Connector Chatbot; Sammelaccount) mit IT klären.
- **E-Learning-Integration** (Ablösung E-Learning-Plattform; Quentic bleibt) — spätere Perspektive.

**Erledigt im Termin (2026-07-15):** Freigabe = 3-stufig (Verfasser → Prozessverantwortlicher → QM) · Prozessverantwortlicher = Abteilungsleiter (auto) · Nummernkreis je Abteilung · Prozesse offen (keine Pro-Prozess-Rechte) · MA ohne M365 via Sammelaccount/Sammelunterweisung · kein Dokument-Export · Fälligkeits-Erinnerungen ja · Skill-Punkte behalten (kein Rating).
