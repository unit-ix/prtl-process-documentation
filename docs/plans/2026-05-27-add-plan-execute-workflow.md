# Add `/plan` and `/execute` Slash-Command Workflow to UNIT-IX Shared Workspace

> Status: abandoned
> Created: 2026-05-27 | Owner: kolja
> Abandoned: 2026-06-05 → ersetzt durch [`2026-06-05-add-plan-execute-commit-ship-workflow.md`](2026-06-05-add-plan-execute-commit-ship-workflow.md)
> Related: `.claude/CLAUDE.md`, `.claude/docs/code-app-patterns.md`, `.claude/README.md`

<!--
This plan is the FIRST instance of the standardized plan format it introduces.
Treat it as the canonical reference for what every future `docs/plans/*.md` should look like.
Reviewer-Hinweise bitte als `<!-- HUMAN: ... -->` (HTML-Kommentar) ODER `> 💬 DEV-NOTE: ...` (Blockquote) inline einfügen.
-->

## Goal

Standardisierte `/plan`- und `/execute`-Slash-Commands ins `.claude/`-Submodul einbauen, damit alle UNIT-IX Code-Apps-Projekte einen einheitlichen Plan-and-Execute-Workflow nutzen können: Devs schreiben einen Plan via VS Code Plan Mode (mit den geliebten Inline-Kommentaren), der wird strukturiert nach `docs/plans/YYYY-MM-DD-<slug>.md` gespeichert, und `/execute` arbeitet ihn phasenweise mit `pnpm verify`-Gate ab. Plan-Files dienen gleichzeitig als Audit-Trail und als Trainingsdaten für künftige Migrations-Agents.

## Constraints

- **Submodul-Konventionen:** Slash-Commands sind je eine Markdown-Datei in `.claude/commands/<name>.md`, Aufruf über `/<filename-ohne-md>`, Argumente via `$ARGUMENTS`/`$1`. Subagents in `.claude/agents/<name>.md` mit Frontmatter (`name`, `description`, optional `tools`, `model`). Siehe `.claude/commands/README.md`, `.claude/agents/README.md`.
- **Workflow-Regel (nicht verhandelbar):** "Ein Schritt → Prüfung → nächster Schritt. Keine autonomen Ketten." (`CLAUDE.md`). `/execute` arbeitet **genau eine** Phase pro Aufruf ab und stoppt — selbst wenn die nächste Phase trivial wäre.
- **Verify-Gate:** `pnpm verify` (= `pnpm lint && pnpm tsc --noEmit && pnpm build`) muss zwischen Phasen grün sein, bevor abgehakt wird (`CLAUDE.md`).
- **Plan-File ist Single Source of Truth:** `/execute` darf `## Goal`, `## Constraints`, `## Out of Scope`, `## Phases` **nie** umschreiben. Nur `## Execution Log` und `## Decisions Made During Execution` werden append-only mutiert. Status-Zeile im Header wird automatisch aktualisiert.
- **Checkbox-Lexikon:** Drei Zustände: `- [ ]` (offen), `- [x]` (erledigt, mit Timestamp im Format `(YYYY-MM-DD HH:MMZ)` davor), `- [!] <reason>` (blockiert). Keine weiteren Status-Marker.
- **Inline-Kommentare zulässig in beiden Formen:** HTML `<!-- ... -->` und Blockquote `> 💬 DEV-NOTE: ...` bzw. `> HUMAN: ...`. `/execute` muss diese lesen und beachten, bevor er Steps ausführt, aber nicht entfernen.
- **Git-Verhalten von `/execute`:** Nach grünem Verify werden veränderte Files via `git add` gestaged, **nicht committed**. Der Dev entscheidet, wann committed wird.
- **Fail-Modus:** Bei rotem `pnpm verify` macht `/execute` genau **einen** automatischen Fix-Versuch (Fehler lesen, gezielter Edit, erneut `pnpm verify`). Bleibt es rot, wird die Phase als `- [!] <phase-title> — verify failed: <kurz-grund>` markiert, voller Fehler-Output ins `## Execution Log` geschrieben, STOP.
- **Plan Mode-Integration:** `/plan` entert VS Code Plan Mode mit standardisiertem Template; nach User-Approval schreibt Claude die Datei nach `docs/plans/YYYY-MM-DD-<slug>.md`. Slug ist optional (Default: Claude generiert aus Plan-Mode-Inhalt).
- **Plan-Status-Lifecycle:** `draft` (nach `/plan`) → `executing` (sobald `/execute` erste Phase startet) → `done` (alle Checkboxes `[x]`). `abandoned` wird manuell gesetzt. Übergänge `draft → executing` und `* → done` werden von `/execute` automatisch eingetragen.

## Out of Scope

- **Auto-Commit:** `/execute` committet nicht. Phase=Commit-Mapping bleibt Dev-Hoheit (auch wenn die Migration-Agent-Trainingsdaten dadurch etwas unschärfer werden).
- **Cross-Session-Resumability per Subagent:** Die Subagent-Resume-API ist 2026 noch instabil. Resumability lebt komplett im Plan-File, nicht im Agent-State. Kein Versuch, `agentId`s zu persistieren.
- **CLI-Fallback ohne VS Code:** `/plan` ist primär für die VS Code Extension. CLI-User können das Plan-File auch manuell aus dem Template erzeugen (oder `/plan` schreibt direkt ohne Plan Mode). Ein dedizierter CLI-Workflow ist nicht Teil dieses Plans.
- **Migration-Agent selbst:** Dieser Plan baut nur die Voraussetzungen (standardisierte, parsebare Plan-Files). Der Migration-Agent, der diese Pläne später erntet, ist ein separates Projekt.
- **Skill-Format `.claude/skills/`:** Wir nutzen klassische `.claude/commands/`, weil Slash-Commands explizit user-getriggert sein sollen und nicht von Claude auto-invoziert werden (was Skills tun würden).
- **Mehrere parallele Plans / `/execute` ohne Pfad:** `/execute` braucht immer einen expliziten Plan-Pfad. Keine "neuester Plan"-Magic.

## Phases

Pro Phase: ein logisch zusammengehöriger, durch `pnpm verify` (wo anwendbar) verifizierbarer Schritt. Stop nach jeder Phase. Reviewer prüft mit den `Verify:`-Kommandos, dann erneut `/execute <plan>`.

### Phase 1: Plan-Template und `docs/plans/` etablieren

- [x] (2026-06-03 11:41Z) `docs/plans/README.md` im Template-Repo anlegen — erklärt Workflow (`/plan` → File → review → `/execute`), Checkbox-Lexikon, Inline-Kommentar-Konventionen, Status-Lifecycle, Naming `YYYY-MM-DD-<slug>.md`.
- [x] (2026-06-03 11:41Z) `.claude/docs/plan-template.md` im Submodul anlegen — die kanonische Template-Quelle, die `/plan` rendert. Enthält alle 6 Sektionen (Goal, Constraints, Out of Scope, Phases, Execution Log, Decisions Made During Execution), Beispiel-Phase mit `Files touched:` + `Verify:`-Block, dokumentierte Drei-Zustands-Checkboxen.
- [x] (2026-06-03 11:41Z) In `.claude/CLAUDE.md` einen kurzen Verweis auf `plan-template.md` ergänzen (Pflicht-Lektüre-Block erweitern um den Workflow). — als neue Sektion "Plan-and-Execute Workflow" am Ende eingefügt statt im Pflicht-Lektüre-Block, weil der Workflow keine Hard-Rule ist sondern eine Methodik.
- [x] (2026-06-03 11:41Z) In `.claude/docs/code-app-patterns.md` einen Cross-Reference-Block ergänzen: "Implementierungs-Pläne liegen unter `docs/plans/` — siehe `.claude/docs/plan-template.md`." — als dritte Header-Zeile direkt unter der Naming-Conventions-Zeile.

Files touched: `docs/plans/README.md` (NEW), `.claude/docs/plan-template.md` (NEW), `.claude/CLAUDE.md`, `.claude/docs/code-app-patterns.md`

Verify:
- `docs/plans/README.md` existiert und beschreibt den Workflow auf max. 60 Zeilen
- `.claude/docs/plan-template.md` enthält alle 6 Sektionen + Beispiel-Phase mit `Verify:`-Block
- `pnpm verify` ist grün (Doku-only Phase, sollte trivial sein)

### Phase 2: `/plan`-Command implementieren

- [ ] `.claude/commands/plan.md` anlegen mit Frontmatter (`description: Standardisierten Implementierungs-Plan via Plan Mode erstellen und nach docs/plans/ speichern.`, `argument-hint: [slug]`).
- [ ] Command-Body: Anweisungen an Claude (a) Plan Mode entern, (b) Plan exakt nach Template aus `.claude/docs/plan-template.md` strukturieren, (c) Dev kommentiert/approvt inline, (d) NACH Approval Datei nach `docs/plans/$(date +%Y-%m-%d)-<slug>.md` schreiben mit `Status: draft`, `Created: <date>`, `Owner: <git config user.name>`.
- [ ] Slug-Logik: wenn `$1` gesetzt → nutzen; sonst aus Plan-Titel kebab-case generieren und Dev vor Speichern bestätigen lassen.
- [ ] Edge-Case: Datei existiert bereits → Dev fragen ob überschreiben oder `<slug>-2` anhängen.

Files touched: `.claude/commands/plan.md` (NEW)

Verify:
- Fresh Claude Code Session: `/plan invoice-export` rendert Plan Mode mit standardisiertem Template, nach Approval landet `docs/plans/2026-MM-DD-invoice-export.md` mit allen 6 Sektionen, Status `draft`, Owner aus `git config user.name`.
- `/plan` (ohne Slug) generiert Slug aus Plan-Titel, fragt vor Save nach.
- `/plan invoice-export` mit existierender Datei → Dev wird gefragt.
- `pnpm verify` ist grün.

### Phase 3: `/execute`-Command implementieren

- [ ] `.claude/commands/execute.md` anlegen mit Frontmatter (`description: Eine Phase eines docs/plans/-Plans ausführen, mit pnpm verify gate. Stoppt nach jeder Phase.`, `argument-hint: <docs/plans/file.md>`).
- [ ] Command-Body — die Pflicht-Sequenz:
  1. `$1` validieren (Pfad existiert, File-Format-Check).
  2. Plan lesen, alle `<!-- HUMAN: -->`- und `> 💬 DEV-NOTE:`-Notes mental verzeichnen, erste `### Phase N` mit ≥ einem `- [ ]` finden.
  3. Wenn keine offene Phase: melden "Plan ist vollständig", Status auf `done` setzen falls noch nicht, STOP.
  4. Wenn Plan-Status noch `draft`: auf `executing` setzen, Log-Eintrag `<ISO-Z> — execute started`.
  5. Phase-Titel + Steps + `Verify:`-Block dem User im Chat zeigen ("ich werde jetzt Phase N abarbeiten").
  6. Alle Steps der Phase ausführen (Edits, Bash, etc.). Inline-Kommentare als bindende Hinweise behandeln.
  7. `pnpm verify` ausführen.
     - Grün → weiter zu Schritt 8.
     - Rot → genau einen Fix-Versuch (Fehler lesen, gezielter Edit), `pnpm verify` erneut. Wieder rot → Phase als `- [!] <phase-title> — verify failed: <kurzer Grund>` markieren, voller stderr ins Execution Log, STOP.
  8. `git add` auf alle veränderten Files (aus `Files touched:` + tatsächliche Änderungen via `git status --porcelain`). KEIN commit.
  9. Alle `- [ ]` der Phase auf `- [x] (YYYY-MM-DD HH:MMZ) <step-text>` setzen.
  10. Execution-Log-Eintrag: `- <ISO-Z> — Phase N complete, <X> files staged`.
  11. Wenn nach diesem Schritt alle Phasen `[x]`: Status auf `done` + Log-Eintrag.
  12. STOP — Report im Chat: was getan wurde, welche Files staged, was die nächste Phase wäre.
- [ ] Hard-Rule im Command-Body explizit verankern: "Niemals zwei Phasen in einem Aufruf abarbeiten, auch nicht wenn die nächste trivial scheint."
- [ ] Hard-Rule: "Niemals `## Goal`, `## Constraints`, `## Out of Scope` oder `## Phases`-Steps umschreiben. Nur Checkboxes innerhalb von Phasen, Status-Zeile, `## Execution Log`, `## Decisions Made During Execution` sind mutierbar."

Files touched: `.claude/commands/execute.md` (NEW)

Verify:
- Mit `docs/plans/2026-05-27-add-plan-execute-workflow.md` (DIESE Datei) als Test-Plan: `/execute docs/plans/2026-05-27-add-plan-execute-workflow.md` führt EINE Phase aus, läuft `pnpm verify`, staged Files, hakt ab, stoppt.
- Manuell `[ ]` einer beliebigen Phase auf `[!] test` setzen → `/execute` erkennt das, überspringt die nächste offene Phase NICHT (nimmt die erste mit `[ ]`).
- Test mit absichtlich brechendem Plan-Step → Verify failt → 1 Fix-Versuch → bleibt rot → Phase wird `[!]` → STOP wie spec'd.
- Status-Updates funktionieren: `draft` → `executing` → `done`.
- `pnpm verify` ist grün am Ende dieser Phase.

### Phase 4: End-to-End-Test in Test-Projekt

- [ ] In einem frischen Code-Apps-Test-Projekt das Submodul auf diesen Branch zeigen lassen.
- [ ] `/plan` aufrufen für ein triviales Test-Feature ("Add `<HelloBanner />` to homepage"), Plan reviewen, kommentieren, approven.
- [ ] Alle Phasen via wiederholtes `/execute` durchlaufen lassen (eine Phase pro Aufruf, Reviewer prüft zwischen jeder).
- [ ] Edge-Case: Phase manuell unterbrechen (Strg+C), erneut `/execute` → erkennt korrekt die noch offene Phase.
- [ ] Edge-Case: Inline-Kommentar `<!-- HUMAN: nimm Tailwind utility classes, kein eigenes CSS -->` in einer Phase → `/execute` respektiert.

Files touched: (keine im Template-Repo; nur Verifikation)

Verify:
- Plan-File wird korrekt erzeugt, Status-Lifecycle läuft komplett durch (`draft` → `executing` → `done`).
- Inline-Kommentare werden in der Implementierung sichtbar berücksichtigt.
- Zwischen Phasen ist `git status` immer staged-aber-nicht-committed.
- Nach erfolgreichem Durchlauf: Test-Projekt funktioniert, `pnpm verify` grün, Plan-File hat alle Logs.

### Phase 5: Doku in Submodul + Template-Root nachziehen

- [ ] `.claude/commands/README.md` erweitern um konkrete `/plan`- und `/execute`-Sektion mit Mini-Beispiel.
- [ ] `.claude/README.md` ergänzen: kurzer Verweis "siehe `commands/plan.md` und `commands/execute.md` für den standardisierten Plan-and-Execute-Workflow".
- [ ] Projekt-Root `CLAUDE.md` (Template) ergänzen: "Für größere Änderungen `/plan <slug>` → review → `/execute docs/plans/...md`."
- [ ] Top-Level `README.md` des Template-Repos: in der Workflow-Sektion einen Bullet ergänzen.

Files touched: `.claude/commands/README.md`, `.claude/README.md`, `CLAUDE.md`, `README.md`

Verify:
- `grep -r "/plan" .claude/` und `grep -r "/execute" .claude/` zeigen Doku-Treffer.
- `cat .claude/commands/README.md` zeigt funktionierendes Beispiel.
- `pnpm verify` ist grün.

### Phase 6: PR und Submodul-Bump

- [ ] Submodul-Branch in `.claude/`-Repo pushen, PR aufmachen mit Beschreibung "Add /plan and /execute workflow", Referenz auf diesen Plan.
- [ ] Nach Merge: im `code-apps-template`-Repo `git submodule update --remote .claude`, Bump-Commit.
- [ ] Smoke-Test im Template-Repo nach Bump: `/plan` und `/execute` sind verfügbar.

Files touched: `.claude` (Submodul-Pointer), Commit-Message im Template-Repo

Verify:
- PR ist gemerged, `.claude` zeigt auf neuen Commit-Hash.
- Im Template-Repo: `/plan` taucht in Slash-Command-Auswahl auf.
- `/execute docs/plans/2026-05-27-add-plan-execute-workflow.md` läuft (alternativ: dieser Plan ist zu diesem Zeitpunkt vermutlich schon `done`).
- `pnpm verify` ist grün.

## Execution Log

Append-only. `/execute` schreibt hier nach jeder Phase einen Eintrag. Niemals umschreiben.

- 2026-06-03 11:39Z — execute started (Phase 1, manuell ausgeführt durch Claude in der Rolle des noch-nicht-gebauten /execute-Commands)
- 2026-06-03 11:42Z — Phase 1 complete: 2 Files neu (`docs/plans/README.md`, `.claude/docs/plan-template.md`), 2 Files editiert (`.claude/CLAUDE.md`, `.claude/docs/code-app-patterns.md`). Verify-Checks alle grün (Sektions-Präsenz, Phase-Beispiel mit Verify-Block, Cross-References). `pnpm verify` übersprungen — siehe Decisions.
- 2026-06-05 10:53Z — Plan abandoned. Scope-Erweiterung: 2 Skills (/plan + /execute) → 4 Skills (/plan + /execute + /commit + /ship). Foundation-Files aus Phase 1 bleiben gültig und werden im Folge-Plan in Phase 1 für 4-Skill-Welt aktualisiert (Assignee-Feld, Skill-References). Folge-Plan: `2026-06-05-add-plan-execute-commit-ship-workflow.md`.

## Decisions Made During Execution

Append-only. Jede Abweichung vom Plan oben wird hier mit Begründung dokumentiert.

- 2026-06-03 — **`pnpm verify` für dieses Meta-Template-Repo nicht anwendbar.** Das `code-apps-template`-Repo ist die META-Template-Quelle ohne eigene `package.json` / `pnpm`-Setup; verify ist nur in den daraus erzeugten Code-App-Projekten relevant. Für Doku-Phasen in diesem Meta-Repo gilt: Verify reduziert sich auf "Files existieren, Markdown ist syntaktisch sauber, Cross-References auflösbar". Konsequenz für künftige `/execute`-Implementierung: Command sollte detektieren ob `package.json` mit `verify`-Script existiert und verify-Gate konditional anwenden (kein hartes Fail bei Abwesenheit). Wird als Constraint in `commands/execute.md` aufgenommen.
- 2026-06-03 — **CLAUDE.md-Sektion an Ende statt in Pflicht-Lektüre.** Plan sagt "Pflicht-Lektüre-Block erweitern", ich habe stattdessen eine neue Sektion "Plan-and-Execute Workflow" am Dateiende eingefügt. Grund: Pflicht-Lektüre listet nicht-verhandelbare Hard-Rules (Patterns, Naming). Der Plan-Workflow ist eine Methodik, kein Constraint — er gehört semantisch nicht in denselben Block. Reviewer-Hinweis ungeachtet dessen begründet vermeintliche Abweichung explizit hier.
- 2026-06-05 — **Plan abandoned wegen Scope-Erweiterung auf 4 Skills.** Interview-Runde am 2026-06-05 hat ergeben: Separation of Concerns → `/execute` macht nur Phase + stage, `/commit` macht verify+commit, `/ship` macht push+PR-create+auto-merge (--squash --delete-branch, kein Review). Außerdem: optional `Assignee:`-Feld pro Phase für 2-Personen-Projekte. Werkzeug-Repos arbeiten direkt auf main (keine Feature-Branches), Kundenprojekte mit konditionaler Branch-Erstellung in `/plan`. Foundation aus Phase 1 (plan-template.md, README, CLAUDE.md, code-app-patterns.md) bleibt strukturell korrekt und wird im Folge-Plan in Phase 1 inhaltlich auf 4-Skill-Welt angehoben.
