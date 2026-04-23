# Claude-Konfiguration — Code Apps Projekt-Template

> Lebendes Dokument. Änderungen via PR-Review.

## Projektkontext

- Power Platform Code App (React + Vite + TypeScript SPA)
- Lovable-Export als Ausgangspunkt, Migration zu Microsoft Code Apps via PAC CLI
- Deployment läuft ausschließlich über `pac code push`

## Tech-Stack

- Node 24 LTS (siehe `.nvmrc`)
- pnpm 10.x (siehe `packageManager` in `package.json`)
- React 18.2 + TypeScript + Vite
- Fluent UI als UI-Library (UNIT-IX-Standard, falls nicht durch Lovable überschrieben)
- Dev-Server Port **3000** (Power-Platform-Anforderung)

## Hard Rules (NIEMALS!)

→ Vollständig in `docs/code-apps-constraints.md`. Knackpunkte:

- `power.config.json`, `src/PowerProvider.tsx`, `src/generated/` **nicht** manuell editieren
- Kein `localStorage`/`sessionStorage` für User-/Org-Daten
- Kein Next.js / kein SSR / kein Service Worker
- Externe APIs nur über Connectors (`pac code add-data-source`)
- Keine Secrets/Env-Vars zur Laufzeit — Build ist public

## Custom Commands

Aktuell keine definiert. Siehe `.claude/commands/` (leer) und `.claude/shared/commands/` (leer, Submodul).

## Shared Resources

- `@.claude/shared/docs/naming-conventions.md`
- `@.claude/shared/docs/power-apps-sdk.md`
- `@.claude/shared/docs/code-apps-constraints.md`
- `@.claude/shared/docs/react-patterns.md`

## Workflow-Regeln

- Ein Schritt → Prüfung → nächster Schritt. Keine autonomen Ketten.
- Lovable liefert das Grundgerüst, Claude iteriert — Build muss nach jedem Schritt grün bleiben.
- `pnpm verify` muss vor jedem Commit grün sein (`pnpm lint && pnpm tsc --noEmit && pnpm build`).

## Referenzen

| Thema | Datei |
|---|---|
| PRD | `docs/prd.md` |
| Datenmodell | `docs/datamodel.mmd` |
| Architektur | `docs/architecture.md` |
| Code-Apps-Constraints | `docs/code-apps-constraints.md` |
| CI-Pipeline | `.github/workflows/ci.yml` |
| Shared Claude-Ressourcen | `.claude/shared/` (Submodul) |
