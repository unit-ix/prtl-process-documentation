# Nummerierung für Unterdokumente, Nummernpflege und pflegbare Stammdaten

> Status: executing
> Created: 2026-10-12 | Owner: SamerSol99
> Autopilot: false (gated — zwei Migrationen und schreibende Admin-Endpunkte)
> Related: docs/prd.md (§5.1 Identkennzeichen, §9.7 Einstellungen), docs/datamodel.md, Testauswertung PRETTL vom 09.10.2026

## Goal

Nach der Testauswertung vom 09.10. bekommt PRETTL drei Dinge vor dem Go-live: Eine Arbeitsanweisung unter einer Verfahrensanweisung trägt deren Nummer mit Unternummer (`VA PE 1 OM.001` → `AA PE 1 OM.001_01`). Ein Administrator kann Nummern vergeben und korrigieren, damit beim Import aus Word die bisherigen Nummern erhalten bleiben, auch wenn die Dokumente nicht in Reihenfolge kommen. Dafür gibt es eine schlanke Nummernübersicht je Bereich. Außerdem können Bereiche (Abteilungen) in den Einstellungen angelegt, umbenannt und deaktiviert werden, ohne dass UNIT IX dafür etwas tun muss.

## Constraints

- Pflicht-Lektüre: `.claude/docs/naming-conventions.md`, `.claude/docs/lean-coding.md`, `.claude/docs/patterns-azure.md`
- `pnpm verify` muss zwischen den Phasen grün sein
- Migrationen nur additiv oder als Constraint-Tausch. Kein `DROP COLUMN/TABLE`, damit `deploy:prod` ohne `--allow-destructive` durchläuft
- Getestet wird nach Prüfsystematik: Kennzeichenbildung, Unternummer, Berechtigung und Nummernprüfung als reine Funktionen in `packages/domain` mit `*.test.ts`
- Entscheidungen vom 12.10.: Unternummer zweistellig mit Unterstrich (`_01`). Nummern ändern darf nur `isAdministrator`
- Bewusste Abweichung von §5.1 („einmal geprägt, nie geändert"): ein Administrator darf ein geprägtes Kennzeichen ändern. Jede Änderung wird als Ereignis protokolliert. Eingefrorene Snapshots früherer Ausgaben bleiben unverändert, denn sie sind das Rechtsdokument ihrer Zeit

## Out of Scope

- Typo-Korrektur in der formellen Prüfung ohne neue Version. Bleibt offen, bis PRETTL es ausdrücklich will
- Pflegbarer Geltungsbereich (PE/PER/PEL): am 12.10. geklärt, gemeint war nur die Bereichsliste in den Einstellungen
- Pflegbare Anweisungsart (VA/AA), Vorlage (IMS/PROD), Vertraulichkeit, Prozesskategorie: daran hängt Programmlogik
- Go-live (leere Prod-DB, Nutzerliste, Rollentest): eigener Schritt nach dem Termin am 16.10.
- Flowchart-Editor: eigenes Angebot, noch nicht beauftragt

## Phases

### Phase 1: Regeln für Unternummer und Nummernänderung in der Domain

- [x] (2026-10-12 14:22Z) `buildIdentifier` kennt eine optionale Unternummer: `OM.001_01`; `SUB_NUMBER_DIGITS = 2` — `packages/domain/src/identifier.ts`
- [x] (2026-10-12 14:22Z) `keepOrMintSubNumber(existing, maxAmongSiblings)` analog zu `keepOrMintDocumentNumber` — `packages/domain/src/identifier.ts`
- [x] (2026-10-12 14:22Z) `canChangeNumbers(u) = u.isAdministrator` — `packages/domain/src/permissions.ts`
- [x] (2026-10-12 14:22Z) Ereignisart `number_changed` („Nummer geändert", Ton neutral) — `packages/domain/src/enums.ts`
- [x] (2026-10-12 14:22Z) Tests beidseitig: Kennzeichen mit und ohne Unternummer, Unternummer 9 → `_09` und 10 → `_10`, Admin darf, QM und Prozessverantwortlicher dürfen nicht — `identifier.test.ts`, `permissions.test.ts`

Files touched: `packages/domain/src/identifier.ts`, `packages/domain/src/identifier.test.ts`, `packages/domain/src/permissions.ts`, `packages/domain/src/permissions.test.ts`, `packages/domain/src/enums.ts`

Verify:
- `pnpm verify` grün
- `pnpm test -- identifier permissions` zeigt die neuen Fälle grün

### Phase 2: Unterdokument bekommt bei Freigabe die Nummer der übergeordneten VA

- [x] (2026-10-12 14:24Z) Migration: `processes.sub_number smallint`, `unique(parent_process_id, sub_number)`, Check-Constraint der Ereignisarten um `number_changed` erweitert — `apps/api/src/db/schema/processes.ts`, `processContent.ts`, `apps/api/drizzle/0006_*.sql`
- [x] (2026-10-12 14:24Z) `mint()`: hat der Prozess eine übergeordnete VA, nimmt er deren `documentNumber` und Bereichskürzel plus die nächste freie Unternummer unter dieser VA. Das Unterdokument selbst bekommt keine `documentNumber`, so bleibt `unique(area_id, document_number)` gültig — `apps/api/src/workflow/release.ts`
- [x] (2026-10-12 14:24Z) Hat die übergeordnete VA noch keine Nummer: Freigabe abbrechen mit „Die übergeordnete Verfahrensanweisung hat noch keine Nummer. Erst sie freigeben oder die Nummer in der Nummernübersicht vergeben." — `release.ts`
- [x] (2026-10-12 14:24Z) Ein Unterdokument liegt im Bereich seiner VA: beim Anlegen und beim Ändern der übergeordneten VA prüfen — `apps/api/src/workflow/create.ts`, `apps/api/src/workflow/saveContent.ts`
- [!] `subNumber` in Detail- und Listenansicht mitliefern — `apps/api/src/router/processMappers.ts`, `packages/domain/src/Process.ts` — nicht nötig, siehe Decisions

Files touched: `apps/api/src/db/schema/processes.ts`, `apps/api/src/db/schema/processContent.ts`, `apps/api/drizzle/0006_*.sql`, `apps/api/drizzle/meta/*`, `apps/api/src/workflow/release.ts`, `apps/api/src/workflow/create.ts`, `apps/api/src/workflow/saveContent.ts`, `apps/api/src/router/processMappers.ts`, `packages/domain/src/Process.ts`

Verify:
- `pnpm verify` grün; die Migration enthält nur `ADD COLUMN`, `ADD CONSTRAINT` und den Tausch des Ereignis-Checks
- Dev: VA freigeben → `… OM.001`; AA darunter freigeben → `AA … OM.001_01`; zweite AA → `_02`
- Dev: AA unter einer noch nicht freigegebenen VA freigeben → verständliche Meldung, nichts geprägt

<!-- HUMAN: Bestehende AA auf app_dev mit eigener Nummer sind Testdaten; Prod startet leer. Keine Umrechnung nötig. -->

### Phase 3: Administrator vergibt und korrigiert Nummern

- [x] (2026-10-12 14:26Z) `PATCH /processes/:id/number` mit `{ documentNumber }` (VA oder AA ohne VA) oder `{ subNumber }` (Unterdokument), nur `canChangeNumbers` — `apps/api/src/router/routes.ts`, neu `apps/api/src/workflow/renumber.ts`
- [x] (2026-10-12 14:26Z) Vor der ersten Freigabe wird die Nummer nur reserviert, `mint()` behält sie schon heute (`keepOrMintDocumentNumber`)
- [x] (2026-10-12 14:26Z) Nach der Freigabe wird das Kennzeichen neu gebildet. Bei einer VA werden die Kennzeichen aller Unterdokumente mitgezogen
- [x] (2026-10-12 14:26Z) Doppelte Nummer im Bereich bzw. unter der VA → 409 „Die Nummer 004 ist in diesem Bereich schon vergeben (Titel)."
- [x] (2026-10-12 14:26Z) Ereignis `number_changed` mit Kommentar „OM.003 → OM.004", ohne Mailempfänger — `apps/api/src/workflow/events.ts`
- [x] (2026-10-12 14:26Z) Port und Adapter: `processRepository.changeNumber(id, input)` — `apps/web/src/data/ports/ProcessRepository.ts`, `apps/web/src/data/adapters/azure/AzureProcessRepository.ts`

Files touched: `apps/api/src/workflow/renumber.ts`, `apps/api/src/router/routes.ts`, `apps/api/src/workflow/events.ts`, `apps/web/src/data/ports/ProcessRepository.ts`, `apps/web/src/data/adapters/azure/AzureProcessRepository.ts`

Verify:
- `pnpm verify` grün
- Dev als Admin: Nummer einer freigegebenen VA von 001 auf 005 ändern → VA und ihre AA heißen `…005` und `…005_01`, Verlauf zeigt „Nummer geändert"
- Dev als QM: derselbe Aufruf → 403
- Snapshot der früheren Ausgabe zeigt weiter die alte Nummer

### Phase 4: Nummernübersicht in den Einstellungen

- [ ] `GET /numbers` (nur Admin): je Bereich die Prozesse mit Nummer, Unternummer, Titel, Status, übergeordneter VA — `apps/api/src/router/numbers.ts`, `routes.ts`
- [ ] Reiter „Nummern" in den Einstellungen, nur für Admins sichtbar: je Bereich eine Tabelle, VA-Zeilen mit ihren AA eingerückt darunter, Nummer direkt in der Zeile änderbar, „noch nicht vergeben" für Entwürfe — `apps/web/src/features/einstellungen/components/NumberSettings.tsx`, `pages/SettingsPage.tsx`
- [ ] Konflikt aus Phase 3 als Toast mit der Meldung der API

Files touched: `apps/api/src/router/numbers.ts`, `apps/web/src/features/einstellungen/components/NumberSettings.tsx`, `apps/web/src/features/einstellungen/pages/SettingsPage.tsx`, `apps/web/src/data/ports/MasterDataRepository.ts`, `apps/web/src/data/adapters/azure/AzureMasterDataRepository.ts`

Verify:
- `pnpm verify` grün
- `pnpm dev:full`, als Admin `/settings` → Reiter „Nummern" zeigt jeden Bereich mit VA und eingerückten AA; als QM fehlt der Reiter
- Nummer in der Tabelle ändern → Zeile und Kennzeichen aktualisieren sich ohne Neuladen

### Phase 5: Bereiche anlegen und bearbeiten

- [ ] `POST /areas` (Titel, Kürzel, Prozesskategorie), `PATCH /areas/:id` erweitert um Titel, Kürzel, Kategorie, aktiv. Berechtigung wie bisher `canSeeSettings` — `apps/api/src/router/masterDataWrites.ts`, `routes.ts`
- [ ] Kürzel und Kategorie sind gesperrt, sobald ein Prozess im Bereich ein Kennzeichen hat. Beides steckt im Kennzeichen, eine Änderung würde freigegebene Nummern stillschweigend falsch machen. Meldung statt Fehler — `masterDataWrites.ts`
- [ ] Kürzel eindeutig unter den aktiven Bereichen
- [ ] Deaktivierter Bereich verschwindet aus der Auswahl beim Anlegen, seine Prozesse bleiben sichtbar
- [ ] Einstellungen → Bereiche: „Bereich anlegen" und je Zeile ein Bearbeiten-Dialog für Titel, Kürzel und Kategorie neben der bestehenden Leitungsauswahl (Sheet, `p-6`, `space-y-5`) — `apps/web/src/features/einstellungen/components/AreaSettings.tsx`, neu `AreaDialog.tsx`

Files touched: `apps/api/src/router/masterDataWrites.ts`, `apps/api/src/router/routes.ts`, `apps/web/src/features/einstellungen/components/AreaSettings.tsx`, `apps/web/src/features/einstellungen/components/AreaDialog.tsx`, `apps/web/src/data/ports/MasterDataRepository.ts`, `apps/web/src/data/adapters/azure/AzureMasterDataRepository.ts`

Verify:
- `pnpm verify` grün
- Dev: Bereich „Fertigung" mit Kürzel `FT` anlegen → erscheint sofort beim Anlegen eines Prozesses
- Dev: Kürzel eines Bereichs mit freigegebenem Prozess ändern → Feld gesperrt mit Erklärung

## Execution Log
- 2026-10-12 14:22Z — Phase 1 — Regeln in der Domain, verify grün
- 2026-10-12 14:24Z — Phase 2 — Unternummer bei Freigabe, Migration 0006, verify grün
- 2026-10-12 14:26Z — Phase 3 — PATCH /processes/:id/number, verify grün

## Decisions Made During Execution

- 2026-10-12 — Phase 2: `subNumber` geht nicht in Detail- und Listenansicht. Das Kennzeichen zeigt die Unternummer schon, und die Nummernübersicht (Phase 4) bekommt einen eigenen Endpunkt. `Process.ts` und `processMappers.ts` bleiben unverändert.
- 2026-10-12 — Phase 2: Ein Wechsel der übergeordneten VA wird nach der ersten Freigabe abgelehnt (409), sonst stimmte das Kennzeichen nicht mehr. Vorher prüft `saveContent` dieselben Regeln wie das Anlegen (VA, gleicher Bereich).
- 2026-10-12 — Phase 3: `events.ts` blieb unverändert, `writeEvent` kann Ereignisse ohne Empfänger schon. Dafür zeigt der Prüfverlauf (`ApprovalTab.tsx`) Kommentare nur bei Ablehnungen rot, sonst neutral.
- 2026-10-12 — Phase 3: Eine vor der Freigabe reservierte VA-Nummer reicht, damit ein Unterdokument schon freigegeben werden kann. Das ist der Importfall, VA und AA kommen nicht in Reihenfolge. Ändert sich die VA-Nummer, ziehen alle geprägten Unterdokumente mit, jedes mit eigenem Verlaufseintrag.
