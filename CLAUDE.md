# Projekt-Konfiguration

> Projektspezifische Claude-Konfiguration für DIESES Repo.
> Geteilte UNIT-IX-Standards inkl. Pflicht-Lektüre: `[.claude/CLAUDE.md](.claude/CLAUDE.md)` (wird automatisch zusätzlich geladen).

## Projektkontext

**Prototype-First Golden Template.** Das Projekt startet als lauffähiger **Mock-Prototyp** (seed-basiert, localhost, kein Backend) und wird erst nach Kunden-OK auf ein echtes Backend geforkt. Zwei Achsen:

- **Stage** = Git-Branch (`feature/*` → `dev` → `prototype` → `main`).
- **Target** = Datenquelle aus [`.unitix/project.json`](.unitix/project.json) (`mock` → `supabase` **oder** `dataverse`). Das ist die Single Source of Truth der `target`-Achse; UI/Hooks sprechen nur den Port (`@/data`) an, nie einen Adapter. Der Fork ist ein Ein-Datei-Swap in `src/data/index.ts` — siehe [`docs/prototype-manifest.md`](docs/prototype-manifest.md) und [`docs/architecture.md`](docs/architecture.md).

**Design-Regel:** UI ausschließlich über die Design-Tokens und die shadcn-Komponenten in `src/shared/components/ui/` — **kein eigenes CSS-File, keine Inline-Farben.** Tokens leben in `src/index.css` (oklch), Varianten über die Komponenten-Props.

## Workflow-Regeln

- **Gated by default**: ein Schritt → Prüfung → nächster Schritt. Autopilot ist **opt-in pro Plan** (`Autopilot: true` im Header, vom `/plan`-Interview vorgeschlagen, vom Dev bestätigt) und läuft Phasen am Stück, stoppt nur bei rotem verify oder am Ende. Keine impliziten autonomen Ketten ohne dieses Flag.
- **localhost-first**: entwickelt und reviewt wird am laufenden `pnpm dev` im Browser (Mock-Target), nicht über einen Deploy. Der Prototyp wird über Cloudflare Pages geteilt; die Power-Platform-Toolchain (`npx power-apps …`) ist erst am `dataverse`-Fork relevant.
- Neue Features spiegeln [`src/features/_example`](src/features/_example) — Build muss nach jedem Schritt grün bleiben.
- `pnpm verify` muss vor jedem Commit grün sein (`pnpm lint && pnpm knip && pnpm tsc --noEmit && pnpm build`). Das Gate sitzt im `/commit`-Skill.
- **Prototyp aufbauen (einmalig):** `/bootstrap [<pm-pfad>]` importiert PRD/Datenmodell/Architektur nach `docs/` (liest den OneDrive-Quellordner, schreibt ihn nie); `/prototype <projektordner>` baut daraus den Mock-Prototyp Feature für Feature nach dem `_example`-Muster.
- Für nicht-triviale Änderungen danach: `/plan <slug> [<beschreibung>]` (interview-first, lädt Pflicht-Kontext) → Plan-File inline editieren → `/execute docs/plans/<file>.md` (eine Phase gated, oder alle bei Autopilot) → ggf. nachjustieren → `/commit` (erzeugt mehrere geordnete Phasen-Commits) → `/ship`.
- **Kanonische Workflow-Quelle:** `[.claude/CLAUDE.md](.claude/CLAUDE.md)` Sektion „Workflow-Skills" (5-Kette `/bootstrap → /plan → /execute → /commit → /ship`). Diese Datei führt nur die projektspezifische Kurz-Summary — Details und Repo-Mode-Detection dort.

## Projekt-Doku


| Thema         | Datei                                                                                 |
| ------------- | ------------------------------------------------------------------------------------- |
| Anforderungen | `[docs/prd.md](docs/prd.md)`                                                          |
| Datenmodell   | `[docs/datamodel.md](docs/datamodel.md)` + `[docs/datamodel.mmd](docs/datamodel.mmd)` |
| Architektur   | `[docs/architecture.md](docs/architecture.md)`                                        |


