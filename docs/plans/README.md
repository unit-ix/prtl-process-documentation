# Implementierungs-Pläne

Standardisierte Plan-Files für die Customer-Track-Kette `/prototype → /handoff → /plan → /execute → /ship`. `/plan` schreibt hierher (+ legt `feature/<slug>` von `dev` an), `/execute` arbeitet sie ab.

> **Kanonische Workflow-Quelle:** [`.claude/CLAUDE.md`](../../.claude/CLAUDE.md) Sektion „Workflow-Skills" (Kette, Gated-vs-Autopilot, Hard Rule). **Plan-File-Mechanik** (Status-Lifecycle, Checkbox-Lexikon, Immutable/Mutable, Assignee, Inline-Kommentare, Pflicht-Sektionen): [`.claude/docs/plan-template.md`](../../.claude/docs/plan-template.md). Diese Datei dupliziert das bewusst **nicht** — sie beschreibt nur, was ordner-lokal ist.

## Dieser Ordner = Kundenprojekt-Pläne

In einem neuen Projekt (via GitHub „Use this template") liegen hier eure eigenen Feature-Pläne. Pläne, die das **Tooling selbst** weiterentwickeln (`code-apps-template` / `code-apps-context`), liegen dagegen in `.claude/dev-plans/` — damit sie nicht via „Use this template" in jedes Kundenrepo kopiert werden (dort läuft der Tool-Track `/dev-plan → /dev-execute`).

## Naming

`YYYY-MM-DD-<kebab-slug>.md` — z.B. `2026-06-03-add-invoice-export.md`. Datum = Plan-Erstellung, nicht Implementierungs-Ende. Slug menschenlesbar, kein technisches Kürzel.

## Abandoned Plans

Plan verworfen? `> Status: abandoned` setzen, kurz im Execution Log warum, Datei im Repo lassen (Audit-Trail + künftige Migration-Agent-Trainingsdaten).
