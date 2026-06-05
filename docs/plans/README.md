# Implementierungs-Pläne

Standardisierte Plan-Files für die 4-Skill-Kette `/plan → /execute → /commit → /ship` in UNIT-IX Code-Apps-Projekten.

## Workflow (4 Skills)

1. **`/plan [slug]`** — Claude entert VS Code Plan Mode mit standardisiertem Template aus [`.claude/docs/plan-template.md`](../../.claude/docs/plan-template.md), du reviewst/kommentierst inline, approvst, Claude speichert nach `YYYY-MM-DD-<slug>.md`. In Kundenprojekten zusätzlich: `git checkout -b feature/<slug>`. In Werkzeug-Repos: bleibt auf `main`.
2. **`/execute docs/plans/<file>.md`** — arbeitet **genau eine** offene Phase ab: Files ändern + `git add`. Updated Status (`draft` → `executing` beim ersten Aufruf), hakt Steps ab mit UTC-Timestamp, schreibt Execution-Log-Eintrag, stoppt. **Kein verify, kein commit.**
3. **`/commit`** — `pnpm verify` als Gate (konditional, wenn package.json + verify-Script vorhanden). Bei grün: `git commit -m "feat: phase N — <title>\n\nPlan: <pfad>"`. Bei rot: stoppt, Plan-File-Log dokumentiert das, Dev fixt manuell + `/commit` erneut. Loggt Commit-SHA.
4. **`/ship`** — Kundenprojekte: `git push -u origin <branch>` → `gh pr create --draft` mit Goal + Phases-Liste (Commit-SHAs) + Plan-Link als Body → `gh pr merge --auto --squash --delete-branch` → zurück auf `main`. Werkzeug-Repos: nur `git push origin main`, kein PR.

```
/plan invoice-export
  ↓ (Plan Mode → autosave → feature-branch in Kundenprojekt)
/execute docs/plans/2026-06-05-invoice-export.md
  ↓ (1 Phase staged + abgehakt)
git diff --cached   # Dev reviewt
/commit
  ↓ (verify → commit)
[ggf. weitere /execute + /commit Zyklen]
/ship
  ↓ (push + PR + auto-merge → main)
```

> Hard Rule aus [`CLAUDE.md`](../../CLAUDE.md): "Ein Schritt → Prüfung → nächster Schritt. Keine autonomen Ketten."

## Werkzeug-Repos vs. Kundenprojekte

Die Skills verhalten sich konditional nach Repo-Typ:

| Aspekt | Werkzeug-Repo (`code-apps-template`, `code-apps-context`) | Kundenprojekt |
| --- | --- | --- |
| `/plan` Branch-Verhalten | bleibt auf `main` | erstellt `feature/<slug>` |
| `/ship` PR-Erstellung | nein, nur `git push origin main` | ja, Draft-PR mit Plan-Body, auto-merge |
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

- `/execute`: Status-Zeile, Checkboxes innerhalb Phasen, `## Execution Log` (append-only), `## Decisions Made During Execution` (append-only)
- `/commit`: `## Execution Log` (append-only: Commit-SHA-Eintrag)
- `/ship`: `## Execution Log` (append-only: PR-Nr + Merge-SHA), ggf. Status auf `done`

Niemals: `## Goal`, `## Constraints`, `## Out of Scope`, Phase-Titel oder Phase-Steps. Abweichungen wandern in den Decisions-Block, nicht in den Plan oben.

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
