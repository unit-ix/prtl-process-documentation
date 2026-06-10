# Implementierungs-Pläne

Standardisierte Plan-Files für die 4-Skill-Kette `/plan → /execute → /commit → /ship` in UNIT-IX Code-Apps-Projekten.

> **Dieser Ordner ist für Kundenprojekt-Pläne.** In einem neuen Projekt (via GitHub „Use this template") liegen hier eure eigenen Feature-Pläne. Pläne, die das **Tooling selbst** weiterentwickeln (`code-apps-template` / `code-apps-context`), liegen dagegen in `.claude/dev-plans/` — damit sie nicht via „Use this template" in jedes Kundenrepo kopiert werden.

## Workflow (4 Skills, v2)

1. **`/plan [slug]`** — **interview-first**: lädt Pflicht-Kontext (`.claude/docs/code-app-patterns.md` + `naming-conventions.md` immer; `prd/datamodel/architecture` wenn nicht-Stub), stellt adaptive Rückfragen (`AskUserQuestion`, nur bei echter Mehrdeutigkeit), schlägt einen `Autopilot:`-Wert vor, rendert das Template aus [`.claude/docs/plan-template.md`](../../.claude/docs/plan-template.md) und speichert nach `YYYY-MM-DD-<slug>.md`. Kundenprojekt: zusätzlich `feature/<slug>`-Branch. Klickbarer Pfad im Chat.
2. **`/execute docs/plans/<file>.md`** — **gated** (Default): **genau eine** offene Phase, dann STOP. Bei `Autopilot: true` im Plan: **alle** offenen Phasen am Stück, `pnpm verify` zwischen jeder, STOP nur bei rot/Fehler/Ende. Files ändern + `git add`, Status/Checkboxes/Execution-Log. **Committet NIE** (auch im Autopilot) — staged nur, du kannst danach nachjustieren.
3. **`/commit`** — `pnpm verify` als Gate (einmal vorab, konditional). Bei grün: **ein Aufruf erzeugt mehrere geordnete Phasen-Commits** (`feat: phase N — <title>`, Staging-Quelle = `Files touched:` der Phase) und schreibt pro Commit den SHA ins Execution Log. Bei rot: kein Commit.
4. **`/ship`** — Kundenprojekte: `git push -u origin <branch>` → `gh pr create --draft` mit Goal + Phases-Liste (Commit-SHAs **aus dem Execution Log**) + Plan-Link → `gh pr merge --auto --squash --delete-branch` → zurück auf `main`. Werkzeug-Repos: Submodul-Push + Root-Bump-Push, kein PR.

```
/plan invoice-export
  ↓ (Interview + Pflicht-Kontext + Autopilot-Vorschlag → autosave → feature-branch)
/execute docs/plans/2026-06-05-invoice-export.md
  ↓ (gated: 1 Phase staged + abgehakt | Autopilot: alle Phasen am Stück)
git diff --cached   # Dev reviewt, ggf. nachjustieren
/commit
  ↓ (verify → mehrere geordnete Phasen-Commits + SHAs ins Log)
[gated: ggf. weitere /execute + /commit Zyklen]
/ship
  ↓ (push + PR mit SHAs aus Log + auto-merge → main)
```

> Hard Rule aus [`CLAUDE.md`](../../CLAUDE.md): **Gated by default** (ein Schritt → Prüfung → nächster Schritt). **Autopilot ist opt-in pro Plan** (`Autopilot: true`) und läuft Phasen am Stück, stoppt nur bei rotem verify oder am Ende.

## Werkzeug-Repos vs. Kundenprojekte

Die Skills verhalten sich konditional nach Repo-Typ:

| Aspekt | Werkzeug-Repo (`code-apps-template`, `code-apps-context`) | Kundenprojekt |
| --- | --- | --- |
| `/plan` Plan-Pfad | `.claude/dev-plans/`, bleibt auf `main` | `docs/plans/`, erstellt `feature/<slug>` |
| `/ship` PR-Erstellung | nein — Submodul-Push + Root-Submodul-Bump-Push | ja, Draft-PR mit Plan-Body, auto-merge |
| Review | kein Review-Schritt | kein Review-Schritt (Phase 7 Testphase = Safety-Net) |

Detection: `git remote -v` enthält `code-apps-template` oder `code-apps-context` → Werkzeug-Repo; sonst Kundenprojekt.

## Naming

`YYYY-MM-DD-<kebab-slug>.md` — z.B. `2026-06-03-add-invoice-export.md`. Datum = Plan-Erstellung, nicht Implementierungs-Ende. Slug menschenlesbar, kein technisches Kürzel.

## Status-Lifecycle

Header-Zeile `> Status: <wert>` mit:

- `draft` — frisch erzeugt, noch nicht ausgeführt
- `executing` — auto-gesetzt von `/execute` beim ersten Aufruf
- `done` — auto-gesetzt sobald alle Checkboxes `[x]` sind
- `abandoned` — manuell, wenn Plan verworfen wird

Zusätzliches Header-Feld `> Autopilot: <true|false> (<grund>)`: `/plan` schlägt es im Interview vor, Dev bestätigt/ändert inline. `true` = `/execute` läuft alle Phasen am Stück (verify nach jeder); `false`/fehlend = gated (genau eine Phase pro `/execute`). Für riskante Arbeit (Dataverse-Writes, Auth, Migration) `false`; für Low-Risk (Scaffolding, Doku, Mappings) `true`.

## Checkbox-Lexikon (nur diese drei)

| Marker | Bedeutung |
| --- | --- |
| `- [ ]` | offen |
| `- [x] (2026-06-03 11:39Z) <step>` | erledigt, UTC-Timestamp |
| `- [!] <step> — <reason>` | blockiert (z.B. verify failed) |

Keine weiteren Status-Marker (`[~]`, `[>]`, Emojis) — sie brechen Downstream-Parsing für künftige Migrations-Agents.

## Inline-Kommentare für Reviewer

Zwei Konventionen, beide gültig — `/execute` liest und respektiert sie als bindende Hinweise, entfernt sie aber nicht:

- HTML-Kommentar: `<!-- HUMAN: nimm Tailwind utility classes -->` (im Render unsichtbar)
- Blockquote: `> 💬 DEV-NOTE: nimm Tailwind utility classes` (im Render sichtbar)

## Pflicht-Sektionen (Reihenfolge fix)

`## Goal`, `## Constraints`, `## Out of Scope`, `## Phases`, `## Execution Log`, `## Decisions Made During Execution`. Template-Quelle: [`../../.claude/docs/plan-template.md`](../../.claude/docs/plan-template.md).

## Immutable vs. Mutable

Skills mutieren je nach Verantwortung:

- `/execute`: Status-Zeile, Checkboxes innerhalb Phasen (im Autopilot mehrere Phasen nacheinander), `## Execution Log` (append-only), `## Decisions Made During Execution` (append-only)
- `/commit`: `## Execution Log` (append-only: **ein SHA-Eintrag pro erzeugtem Phasen-Commit** — Multi-Commit)
- `/ship`: `## Execution Log` (append-only: PR-Nr + Merge-SHA), ggf. Status auf `done`

Niemals: `## Goal`, `## Constraints`, `## Out of Scope`, das `Autopilot:`-Feld, Phase-Titel oder Phase-Steps. Abweichungen wandern in den Decisions-Block, nicht in den Plan oben.

## Optional: Assignee pro Phase

In 2-Personen-Projekten kann eine Phase einen expliziten Owner haben:

```
### Phase 2: API-Client erweitern
Assignee: @kolja

- [ ] Step
```

`/execute` warnt freundlich (blockiert aber nicht), wenn der aktuelle `git config user.name` nicht der Assignee ist. Bei Solo-Projekten weglassen.

## Abandoned Plans

Plan verworfen? `> Status: abandoned` setzen, kurz im Execution Log warum, Datei im Repo lassen (Audit-Trail + künftige Migration-Agent-Trainingsdaten).
