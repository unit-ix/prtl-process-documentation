# Add `/plan`, `/execute`, `/commit`, `/ship` Slash-Command Workflow to UNIT-IX Shared Workspace

> Status: executing
> Created: 2026-06-05 | Owner: kolja
> Related: `.claude/CLAUDE.md`, `.claude/docs/code-app-patterns.md`, [`2026-05-27-add-plan-execute-workflow.md`](2026-05-27-add-plan-execute-workflow.md) (vorgänger, abandoned)

<!--
Folge-Plan zum abandonierten 2026-05-27. Scope erweitert von 2 auf 4 Skills wegen Separation of Concerns:
/execute macht nicht mehr verify/commit selbst, sondern getrennte /commit + /ship Skills.
Außerdem: optional Assignee pro Phase, konditionale Branch-Erstellung in /plan, kein Review-Step.

Reviewer-Hinweise bitte als <!-- HUMAN: ... -->  oder  > 💬 DEV-NOTE: ...  inline einfügen.
-->

## Goal

Vier standardisierte Slash-Commands für den UNIT-IX Code-Apps-Workflow ins `.claude/`-Submodul einbauen: `/plan` erzeugt einen Implementierungs-Plan (im VS Code Plan Mode mit autosave + konditionalem Feature-Branch), `/execute` arbeitet eine Phase ab und staged Files, `/commit` validiert via `pnpm verify` und committet mit Plan-Referenz, `/ship` schiebt + erstellt Draft-PR + macht squash-merge auf main. Plan-Files in `docs/plans/YYYY-MM-DD-<slug>.md` werden zur lebenden Spec + zum Audit-Trail + als Trainingsdaten für künftige Migrations-Agents.

## Constraints

- **Submodul-Konventionen** (siehe `.claude/commands/README.md`, `.claude/agents/README.md`): Slash-Commands je eine Markdown-Datei in `.claude/commands/<name>.md`, Aufruf via `/<filename-ohne-md>`, Argumente via `$ARGUMENTS`/`$1`.
- **Workflow-Regel** (`CLAUDE.md`, nicht verhandelbar): "Ein Schritt → Prüfung → nächster Schritt. Keine autonomen Ketten." `/execute` arbeitet **genau eine** Phase pro Aufruf ab und stoppt — auch wenn die nächste Phase trivial scheint.
- **Kein Code-Review-Schritt bei UNIT-IX.** `/ship` macht `gh pr create --draft` + `gh pr merge --auto --squash --delete-branch`. Safety-Net ist Phase 7 (Testphase mit Kunde via Asana). Siehe Memory `unit-ix-no-review-workflow`.
- **Branch-Strategie ist konditional.** `/plan` detektiert ob `git remote -v` einen `github.com`-Remote zeigt → Ja: `git checkout -b feature/<slug>`. Nein (Bootstrap-Repos, lokale Repos): bleibt auf aktuellem Branch (i.d.R. `main`). Werkzeug-Repos (`code-apps-template`, `code-apps-context`) arbeiten direkt auf main. Siehe Memory `unit-ix-werkzeug-repos-direct-push`.
- **Verify-Gate sitzt in `/commit`, nicht in `/execute`.** `/execute` staged auch bei rotem Code. `/commit` läuft `pnpm verify` (= `pnpm lint && pnpm tsc --noEmit && pnpm build`), bei rot: kein commit, Phase optional als `[!]` markiert, Dev fixt manuell + `/commit` erneut.
- **`pnpm verify` konditional.** `/commit` detektiert ob `package.json` ein `verify`-Script enthält. Wenn nicht (z.B. Meta-Repos), wird verify übersprungen mit Log-Eintrag — kein hartes Fail.
- **Plan-File ist Single Source of Truth.** `/execute`, `/commit`, `/ship` dürfen `## Goal`, `## Constraints`, `## Out of Scope`, `## Phases`-Steps **nie** umschreiben. Nur Status-Zeile, Checkboxes innerhalb Phasen, `## Execution Log` (append-only), `## Decisions Made During Execution` (append-only) sind mutierbar.
- **Checkbox-Lexikon:** Drei Zustände: `- [ ]` (offen), `- [x] (YYYY-MM-DD HH:MMZ) <step>` (erledigt), `- [!] <step> — <reason>` (blockiert). Keine weiteren Marker.
- **Inline-Kommentare** zulässig in beiden Formen: `<!-- HUMAN: ... -->` und `> 💬 DEV-NOTE: ...`. Skills lesen und respektieren sie, entfernen sie aber nicht.
- **Optional `Assignee:`-Zeile pro Phase** für 2-Personen-Projekte (siehe Memory `unit-ix-projektprozess`). Solo-Projekte lassen weg. `/execute` warnt freundlich wenn aktueller `git config user.name` ≠ Assignee, blockiert aber nicht.
- **Commit-Message-Format**: Conventional Commits ohne Scope (matched bestehende Repo-History), mit Phase-Ref im Subject und Plan-Pfad im Body. Format: `feat: phase N — <phase-title>\n\nPlan: docs/plans/<file>.md`. Sprache: Englisch.
- **PR-Body-Format**: `## Goal` (aus Plan) + `## Phases` (Liste mit Status-Checkmarks + Commit-Hashes) + Link zur Plan-File. `/ship` baut den Body aus Plan-File-Inhalt + `git log`.

## Out of Scope

- **Asana-Bridge** (v1). Plan-Files leben in Git, Asana macht sein eigenes Tracking. Manuelle Verlinkung möglich aber nicht erzwungen. Möglicher v2-Scope.
- **PRD-Auto-Kopplung.** `Related:`-Zeile im Plan-Header bleibt optional und freitext.
- **Deutsche Commit-Messages.** Englisch bleibt Standard (matched Conventional-Commits-Ökosystem).
- **Mobile/Web-spezifische Workflows.** Code Apps sind Browser-only, dieser Workflow auch.
- **Skill-Format `.claude/skills/`.** Wir nutzen klassische `.claude/commands/`, weil Slash-Commands explizit user-getriggert sein sollen (Skills auto-invozieren).
- **CLI-Fallback ohne VS Code.** `/plan` ist primär für die VS Code Extension Plan Mode. CLI-User können Plan-File auch manuell aus Template erzeugen.
- **Cross-Session-Resumability per Subagent.** Resumability lebt komplett im Plan-File, nicht im Agent-State.
- **Skill-übergreifende Plan-State-Validation.** Wenn jemand das Plan-File händisch korrupt editiert (z.B. `[x]`-Marker ohne Timestamp, oder fehlende `## Phases`-Sektion), brechen Skills mit klarem Fehler ab, versuchen aber kein Auto-Repair.
- **`/ship` in Werkzeug-Repos.** Hier wird direkt-gepusht auf main (kein PR, kein auto-merge). `/ship` ist primär für Kundenprojekte. Werkzeug-Repo-Updates passieren via manueller `git commit` + `git push origin main`.

## Phases

Sieben Phasen. Stop nach jeder Phase, manueller Commit + Push pro logischer Einheit. Verify-Block pro Phase reduziert sich auf strukturelle Checks (Files existieren, Frontmatter korrekt, Cross-References auflösbar), weil dieses Meta-Repo kein `pnpm verify` hat.

### Phase 1: Foundation-Files für 4-Skill-Welt aktualisieren

Update der bereits existierenden Phase-1-Files aus dem abandonierten Vorgänger-Plan, damit sie alle vier Skills + Assignee-Feld kennen.

- [x] (2026-06-05 11:00Z) `.claude/docs/plan-template.md` erweitern: optional `Assignee:` als Phase-Header-Feld dokumentieren (mit Beispiel). Status-Lifecycle bleibt unverändert. Konventionen-Sektion ergänzen um Branch-Logik (konditional) und commit-message-Format. — Drei neue Sektionen hinzugefügt: "Workflow-Skills (4-Kette)", "Phase-Header-Felder (optional)", "Branch-Erstellung in /plan (konditional)", "Commit-Message-Format". "Mutable vs. Immutable" auf Tabelle umgestellt mit /execute + /commit + /ship.
- [x] (2026-06-05 11:00Z) `.claude/docs/plan-template.md` TEMPLATE-BEGIN/END-Block: `Assignee:`-Beispiel in einer Phase einfügen (optional, kommentiert). — Phase-1-Beispiel im Template-Block hat jetzt `<!-- Optional bei 2-Personen-Projekten: Assignee: @<git-username> -->`.
- [x] (2026-06-05 11:00Z) `docs/plans/README.md` aktualisieren: Workflow-Abschnitt von 2 auf 4 Skills erweitern (`/plan → /execute → /commit → /ship`), Branch-Logik dokumentieren, Werkzeug-Repo-Asymmetrie erwähnen. — Neue Sektion "Werkzeug-Repos vs. Kundenprojekte" mit Tabelle, vollständiger 4-Skill-Flow-Diagramm im Workflow-Abschnitt, neue "Optional: Assignee pro Phase"-Sektion.
- [x] (2026-06-05 11:00Z) `.claude/CLAUDE.md` "Plan-and-Execute Workflow"-Sektion erweitern um `/commit` und `/ship`, mit Mini-Beispiel der vollen Kette. — Sektion umbenannt zu "Workflow-Skills (4-Kette)", alle 4 Skills erklärt, Mini-Beispiel-Block, Hard-Rule + Hinweis auf fehlenden Code-Review.
- [x] (2026-06-05 11:00Z) `.claude/docs/code-app-patterns.md` Cross-Reference-Zeile bleibt unverändert (verlinkt schon auf `plan-template.md`). — bestätigt, keine Änderung nötig (3-zeiliger Cross-Reference-Header bleibt strukturell korrekt).

Files touched: `.claude/docs/plan-template.md`, `docs/plans/README.md`, `.claude/CLAUDE.md`

Verify:
- `grep -c "Assignee:" .claude/docs/plan-template.md` ≥ 2 (Erklärung + Beispiel)
- `grep -c "/commit\|/ship" docs/plans/README.md .claude/CLAUDE.md` ≥ 4
- Cross-References in CLAUDE.md auflösbar (relative Pfade stimmen)
- Markdown ist syntaktisch sauber (kein gebrochener Codeblock, keine Frontmatter-Fehler)

### Phase 2: `/plan`-Command bauen

- [x] (2026-06-05 11:08Z) `.claude/commands/plan.md` anlegen mit Frontmatter (`description`, `argument-hint: [slug]`). — Frontmatter mit description + argument-hint "[slug]" gesetzt.
- [x] (2026-06-05 11:08Z) Command-Body: (a) Slug aus `$1` lesen oder aus Plan-Mode-Inhalt ableiten + Dev-Bestätigung, (b) Branch-Logik: `git remote -v | grep github.com` → ja: `git checkout -b feature/<slug>`, nein: aktueller Branch, (c) Plan Mode entern mit Template aus `.claude/docs/plan-template.md` (kopiere zwischen TEMPLATE-BEGIN/END-Marker), (d) Platzhalter (`<Title>`, `<git user.name>`, `YYYY-MM-DD`) ersetzen, (e) nach Plan-Mode-Approval Datei nach `docs/plans/$(date +%Y-%m-%d)-<slug>.md` schreiben mit `Status: draft`. — 8-Schritt-Sequenz im Body: Repo-Check, Template laden, Plan Mode entern (via EnterPlanMode-Tool), Approval abwarten, Slug bestätigen, Feature-Branch nur in Kundenprojekt-Modus, Speichern, Edge Cases.
- [x] (2026-06-05 11:08Z) Edge-Case: Datei existiert bereits → Dev fragen ob überschreiben oder Slug anpassen (`<slug>-2`, `<slug>-v2` etc). — Edge Case dokumentiert mit Prompt-Format `[O]verwrite, [R]ename slug, [A]bort`.
- [x] (2026-06-05 11:08Z) Edge-Case: kein Git-Repo → Skill mit klarem Fehler abbrechen (kein Plan ohne Git). — Pre-Flight-Check via `git rev-parse --is-inside-work-tree` mit definierter Fehlermeldung.

Files touched: `.claude/commands/plan.md` (NEW)

Verify:
- Frontmatter-Felder korrekt (yaml lint optional)
- Body referenziert `plan-template.md`-TEMPLATE-Block explizit
- Branch-Logik dokumentiert: was passiert wenn Remote = GitHub, was wenn nicht

### Phase 3: `/execute`-Command bauen

- [x] (2026-06-05 11:42Z) `.claude/commands/execute.md` anlegen mit Frontmatter (`description`, `argument-hint: <docs/plans/file.md>`). — Frontmatter gesetzt mit description (kein verify, kein commit) + argument-hint quoted für yaml.
- [x] (2026-06-05 11:42Z) Command-Body — die Pflicht-Sequenz: (1) `$1` Pfad validieren, (2) Plan lesen, alle `<!-- HUMAN: -->` + `> 💬 DEV-NOTE:`-Hinweise verzeichnen, (3) erste `### Phase N` mit ≥ einem `- [ ]` finden — keine offen: STOP "Plan vollständig", (4) Status-Lifecycle: wenn `draft` → auf `executing` setzen + Log-Eintrag, (5) Phase + Steps + `Verify:`-Block dem Dev im Chat anzeigen, (6) optional `Assignee:` prüfen + freundlich warnen wenn ≠ aktueller `git config user.name` (nicht blockieren), (7) Steps ausführen mit Respekt der Inline-Hinweise, (8) `git add` auf veränderte Files (kein commit), (9) `- [ ]` der Phase auf `- [x] (UTC-Timestamp) <step>` setzen, (10) Log-Eintrag append, (11) wenn alle Phasen `[x]`: Status auf `done`, (12) STOP mit Report. — Alle 12 Schritte als H3-Subsections im Body. Schritt 3 implementiert [!]-Skip per Decision-Eintrag. Schritt 6 weicht von der Spec ab: KEIN Assignee-Check (Decision-Eintrag erklärt). Mid-Phase-Error in Schritt 6: STOPP ohne stage (Decision-Eintrag).
- [x] (2026-06-05 11:42Z) Hard-Rule im Body: "Niemals zwei Phasen in einem Aufruf abarbeiten." — Hard Rule 1 unter eigener `## Hard Rules (nicht verhandelbar)`-Sektion.
- [x] (2026-06-05 11:42Z) Hard-Rule: "Niemals Goal/Constraints/Out of Scope/Phase-Steps umschreiben." — Hard Rule 2, mit expliziter mutable-Liste (Status, Checkboxes, Execution Log, Decisions).
- [x] (2026-06-05 11:42Z) Hard-Rule: "Niemals committen — das ist /commit's Aufgabe." — Hard Rule 3. Zusätzlich eigene "Was /execute NICHT tut"-Sektion mit erweiterten Verbotenen (kein verify, kein push, kein Assignee-Check, keine Branch-Ops, kein Auto-Rollback).

Files touched: `.claude/commands/execute.md` (NEW)

Verify:
- Frontmatter korrekt
- 12-Schritt-Sequenz vollständig im Body
- Alle drei Hard-Rules explizit markiert (z.B. mit "**Hard Rule:**"-Prefix)
- Beispiel-Section: "Was /execute NICHT tut" (verify, commit, push)

### Phase 4: `/commit`-Command bauen

- [ ] `.claude/commands/commit.md` anlegen mit Frontmatter (`description: pnpm verify Gate + Conventional-Commit mit Plan-Referenz. Stoppt nach Commit.`, kein argument).
- [ ] Command-Body: (1) `git diff --cached --quiet` prüfen → keine staged changes: abbrechen mit Hinweis "erst /execute laufen lassen", (2) Detektieren ob `package.json` existiert + `verify`-Script hat — wenn ja: `pnpm verify`, wenn nein: skip + Log-Eintrag im Plan, (3) bei rotem verify: STOP, kein commit, Dev fixt manuell + `/commit` erneut (optional: Phase im Plan als `[!]` markieren — ask user first or skip?), (4) bei grün: finde aktiven Plan-File (neueste `Status: executing` in `docs/plans/`), extrahiere zuletzt abgehakte Phase (höchste Phase-Nummer mit `[x]`), (5) `git commit -m "feat: phase N — <phase-title>\n\nPlan: docs/plans/<file>.md"`, (6) Plan-File-Log: `- <UTC-Z> — Phase N committed (<short-sha>)`, (7) STOP mit Report (commit-SHA, files-count).
- [ ] Edge-Case: kein aktiver Plan gefunden (Bootstrap-Modus oder Plan komplett done) → trotzdem committen aber ohne Plan-Ref, Message: `feat: <user-defined>` oder Dev nach Subject fragen.
- [ ] Edge-Case: mehrere "executing" Plans → den mit neuester `--mtime` nehmen, oder Dev fragen.

Files touched: `.claude/commands/commit.md` (NEW)

Verify:
- Frontmatter korrekt
- Verify-Gate konditional auf `verify`-Script-Existenz
- Commit-Message-Format spec'd: `feat: phase N — <title>` + Body `Plan: <pfad>`
- Behavior bei rotem verify dokumentiert
- Behavior ohne aktiven Plan dokumentiert (Bootstrap)

### Phase 5: `/ship`-Command bauen

- [ ] `.claude/commands/ship.md` anlegen mit Frontmatter (`description: push + Draft-PR-Erstellung mit Plan-Body + auto-squash-merge. Endet auf main.`, kein argument).
- [ ] Command-Body: (1) detektieren ob aktueller Branch = `main` und Remote = GitHub-Werkzeug-Repo → Bootstrap-Modus: nur `git push origin main` + STOP, (2) sonst: `git push -u origin <branch>`, (3) finde aktiven Plan-File, (4) baue PR-Body: `## Goal` aus Plan + `## Phases` (jede `### Phase N: <title>` mit Status [`x`/`[ ]`] + zugehörige Commit-Hash aus `git log --grep="phase N"`) + Link `docs/plans/<file>.md`, (5) `gh pr view` → existiert: `gh pr edit --body-file -`, existiert nicht: `gh pr create --draft --title <plan-title> --body-file -`, (6) `gh pr merge --auto --squash --delete-branch`, (7) `git checkout main && git pull && git branch -d <feature-branch>`, (8) Plan-File-Log: `- <UTC-Z> — Phase X shipped (PR #N, commit <sha> auf main)`, (9) wenn alle Phasen `[x]`: Status auf `done`, (10) STOP mit Report.
- [ ] Edge-Case: `gh` nicht installiert → klarer Fehler + Anleitung.
- [ ] Edge-Case: PR-Merge schlägt fehl (CI rot, Branch-Protection) → kein lokales Branch-Löschen, Status loggen, STOP.
- [ ] Edge-Case: kein aktiver Plan (Bootstrap-Modus) → nur push + STOP, kein PR.

Files touched: `.claude/commands/ship.md` (NEW)

Verify:
- Frontmatter korrekt
- Werkzeug-Repo-Erkennung (main + GitHub-Werkzeug-Remote) → direkt-push-Pfad dokumentiert
- PR-Body-Template explizit definiert (Goal + Phases-mit-SHAs + Link)
- `gh pr merge --auto --squash --delete-branch` Flags konsistent
- Cleanup-Sequenz (back to main, delete local branch) dokumentiert

### Phase 6: Docs-Polish

- [ ] `.claude/commands/README.md` erweitern um konkrete `/plan`-, `/execute`-, `/commit`-, `/ship`-Sektion mit Mini-Beispiel-Workflow.
- [ ] `.claude/README.md` ergänzen: Sektion "Workflow-Skills" mit kompakter 4-Skill-Übersicht.
- [ ] Projekt-Root `CLAUDE.md` (Template) ergänzen: "Für nicht-triviale Änderungen: `/plan <slug>` → review → `/execute` → `/commit` → `/ship`."
- [ ] Top-Level `README.md` des Template-Repos: in der Workflow-Sektion Bullet ergänzen.

Files touched: `.claude/commands/README.md`, `.claude/README.md`, `CLAUDE.md`, `README.md`

Verify:
- `grep -rc "/plan\|/execute\|/commit\|/ship" .claude/ docs/plans/ README.md CLAUDE.md` ≥ 8
- READMEs zeigen funktionierende End-to-End-Beispiele
- Kein toter Link

### Phase 7: Bootstrap-Ship (direkt-push beider Repos)

Manueller Ship für die Werkzeug-Repos (kein `/ship`, weil Bootstrap-Modus). Phasen 1–6 werden in beiden Repos committed und auf `origin main` gepusht.

- [ ] Submodul: alle Phase-1-bis-6-Files committen (pro logischer Einheit, manuelle Subject-Lines), `git push origin main`.
- [ ] Haupt-Repo: Plan-Files (alt + neu) + ggf. Bump-Commit für Submodul-SHA committen, `git push origin main`.
- [ ] Smoke-Test in einem leeren Test-Projekt: `git submodule add ... .claude` + `git submodule update --remote .claude`. Slash-Command-Listing zeigt `/plan`, `/execute`, `/commit`, `/ship`.
- [ ] Plan-File auf Status `done` setzen, finaler Log-Eintrag.

Files touched: alle Commits aus Phasen 1–6 + Bump-Commit im Haupt-Repo

Verify:
- `git log -5 --oneline` in beiden Repos zeigt die Bootstrap-Commits
- `git status` in beiden Repos: clean
- Test-Projekt-Smoke-Test: alle 4 Slash-Commands sichtbar

## Execution Log

Append-only. `/execute` schreibt hier nach jeder Phase einen Eintrag. Niemals umschreiben.

- 2026-06-05 10:55Z — execute started (Phase 1: Foundation-Update auf 4-Skill-Welt, manuell ausgeführt da Skills noch nicht existieren)
- 2026-06-05 11:00Z — Phase 1 complete: 3 Files geupdated (`.claude/docs/plan-template.md`, `docs/plans/README.md`, `.claude/CLAUDE.md`), 1 File bewusst unverändert (`.claude/docs/code-app-patterns.md`). Verify-Checks grün: Assignee=3, /commit-or-/ship=15 Mentions. Files staged (3 im Submodul-Index, 4 im Haupt-Repo-Index inkl. Plan + abandoned-Vorgänger).
- 2026-06-05 11:01Z — Phase 1 committed + pushed: Submodul `12ef0e5` (`feat: phase 1 — foundation files for 4-skill workflow`) auf origin/main; Haupt-Repo `872f1f2` (`feat: phase 1 — introduce plan-execute-commit-ship workflow + bump submodule`) auf origin/main.
- 2026-06-05 11:08Z — Phase 2 complete: `.claude/commands/plan.md` (NEW, 96 Zeilen) angelegt mit Frontmatter (description, argument-hint), 8-Schritt-Body inkl. Repo-Check + Template-Load + EnterPlanMode + Approval + Slug + Branch-Logik + Speichern + Edge Cases. Verify-Checks grün: Frontmatter sauber, TEMPLATE-BEGIN×2 referenziert, Kundenprojekt/Werkzeug-Modus×6 dokumentiert. File staged im Submodul.
- 2026-06-05 11:11Z — Phase 2 committed + pushed: Submodul `8f8997c` (`feat: phase 2 — /plan command`), Haupt-Repo `146a17c` (`chore: phase 2 — bump submodule + log /plan command`). Beide auf origin/main.
- 2026-06-05 11:42Z — Phase 3 complete: `.claude/commands/execute.md` (NEW, ~140 Zeilen) angelegt mit Frontmatter, 12-Schritt-Pflicht-Sequenz, 3 Hard Rules, "Was NICHT tut"-Sektion, Edge Cases, Verify-Block. Verify-Checks grün: Frontmatter, 12 Schritte als H3-Subsections, alle Hard Rules markiert. File staged im Submodul.
- 2026-06-05 13:53Z — Phase 2 **REWRITTEN** (Kiro-Style). Original EnterPlanMode-basierter /plan via Submodul-Commit `8aab7db` reverted. Neuer Kiro-Style /plan committed als `6d73957`. Phase 2 bleibt formal [x] aber der Skill-Inhalt ist komplett neu (siehe Decisions). Research-Quelle: zwei parallele Subagent-Researches haben gezeigt dass EnterPlanMode + AskUserQuestion in VS Code Extension nicht die gewünschte WYSIWYG-Inline-Edit-Erfahrung liefern können.

## Decisions Made During Execution

Append-only. Jede Abweichung vom Plan oben wird hier mit Begründung dokumentiert.

- 2026-06-05 — **`/execute` macht keinen Assignee-Check** (Plan-Spec sagte "freundlich warnen"). Interview-Decision am 2026-06-05: Assignee bleibt rein dokumentarisch, /execute liest und prüft das Feld nicht. Konsequenz: plan-template.md und docs/plans/README.md erwähnen aktuell noch eine "freundliche Warnung" — wird in Phase 6 (Docs Polish) abgeglichen. Begründung: minimal-friction-Workflow, Solo-Owner-Realität in vielen UNIT-IX-Projekten, Assignee-Sichtbarkeit auch ohne Tool-Gate gegeben.
- 2026-06-05 — **`/execute` skipt blockierte Phasen** statt zu stoppen. Plan-Spec war ambivalent zu blockierten Phasen — Interview-Decision: erste `- [ ]` ohne Rücksicht auf vorherige `[!]` bearbeiten. Sicherheitsnetz: wenn ALLE Phasen entweder `[x]` oder `[!]` sind (= keine `[ ]` mehr offen, aber Plan nicht "done"), gibt /execute "Plan hängt — manuelle Intervention nötig" raus.
- 2026-06-05 — **`/execute` macht keinen partial-stage bei Mid-Phase-Error.** Interview-Decision: bei Step-Fehler mitten in einer Phase wird sofort gestoppt, KEIN `git add`, Plan-File komplett unverändert. Working-Tree-Changes der bisher erfolgreichen Steps bleiben unstaged — Dev rolled manuell zurück (`git checkout -- <pfad>`) oder fixed. Begründung: Konsistenz "Phase = atomare Einheit", kein halber Stage-State der zu Verwirrung führt.
- 2026-06-05 — **`/plan` komplett umgeschrieben: Kiro-Style (file-write) statt EnterPlanMode.** Original-Spec aus Phase 2 nutzte `EnterPlanMode` + `AskUserQuestion`. Beim ersten Test (Screenshot vom Dev) schlug `AskUserQuestion` mit `InputValidationError: required parameter 'questions' is missing` fehl, und der Plan-Mode-Flow fühlte sich nicht wie die "Claude.ai-Artifact"-Inline-Edit-Erfahrung an. Zwei parallele Research-Subagents bestätigten: (a) `EnterPlanMode` ist eine Permission-Mode (read-only), kein WYSIWYG-Editor, kann nicht programmatisch vorgefüllt werden; (b) Claude.ai-Artifacts sind claude.ai-web-only und nicht via API erreichbar; (c) Anthropic's eigene Antwort darauf ist `/ultraplan` (cloud-Lift); (d) pragmatische Best-Practice 2026 ist die "Kiro-Philosophie" — schreibe direkt in eine Datei und nutze VS Code Markdown-Preview-Side-by-Side als Inline-Edit-Surface. Neuer `/plan`-Flow: schreibt direkt nach `docs/plans/<date>-<slug>.md`, öffnet via `code --goto` + `markdown.showPreviewToSide`, nutzt plain-text-Chat-Fragen (kein `AskUserQuestion`-Tool) bei fehlendem Slug. Submodul-Commits: `8aab7db` (revert) + `6d73957` (Kiro-Style rewrite). Sources: research/synthesis im Chat vom 2026-06-05.
