# Implementierungs-Pläne

Standardisierte Plan-Files für die Skill-Kette `/plan → /execute → /commit → /ship` in UNIT-IX Code-Apps-Projekten. Vorgelagert läuft **einmalig** `/bootstrap` nach dem Lovable-Import (Kontext-Import + Standards-Audit → erster Plan hier im Ordner).

> **Kanonische Workflow-Quelle:** [`.claude/CLAUDE.md`](../../.claude/CLAUDE.md) Sektion „Workflow-Skills". Diese Datei beschreibt die Plan-File-Konventionen; die Erklär-Prosa der Kette lebt dort.

> **Dieser Ordner ist für Kundenprojekt-Pläne.** In einem neuen Projekt (via GitHub „Use this template") liegen hier eure eigenen Feature-Pläne. Pläne, die das **Tooling selbst** weiterentwickeln (`code-apps-template` / `code-apps-context`), liegen dagegen in `.claude/dev-plans/` — damit sie nicht via „Use this template" in jedes Kundenrepo kopiert werden.

## Workflow

Die fünf Skills (`/bootstrap → /plan → /execute → /commit → /ship`), ihr Gated-vs-Autopilot-Verhalten und die Hard Rule sind **kanonisch** in [`.claude/CLAUDE.md`](../../.claude/CLAUDE.md) Sektion „Workflow-Skills" beschrieben (Verweis oben). Diese Datei behandelt ausschließlich die **Plan-File-Konventionen** für diesen Ordner — Naming, Status, Checkbox-Lexikon, Sektionen, Mutationsregeln.

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
