# Projekt-Konfiguration

> Projektspezifische Ergänzung. Geteilte UNIT-IX-Standards inkl. Pflicht-Lektüre und Workflow: [`.claude/CLAUDE.md`](.claude/CLAUDE.md) (wird automatisch mitgeladen).

## Projektkontext

**Prototype-First Golden Template.** Das Projekt startet als lauffähiger Mock-Prototyp (seed-basiert, localhost, kein Backend) und bekommt erst nach Kunden-OK ein echtes Backend. Zwei unabhängige Achsen:

- **Stage** = Git-Branch. Prototyp-Phase: `/prototype` committet Feature für Feature direkt auf `prototype`; nach Kunden-OK ist der Branch eingefroren. Produkt-Phase (nach `/handoff`): `feature/* → dev → main`, wobei `prototype` eingefroren bleibt und bewusst übersprungen wird.
- **Backend** = `backend`-Feld in [`.unitix/project.json`](.unitix/project.json) (`mock` → `azure` oder `dataverse`). Single Source of Truth. UI und Hooks sprechen nur den Port (`@/data`) an, nie einen Adapter — der Fork ist ein Ein-Datei-Swap in `apps/web/src/data/index.ts`, siehe [`docs/prototype-manifest.md`](docs/prototype-manifest.md).

**Repo-Layout:** pnpm-Workspace mit zwei Packages — `apps/web/` (SPA) und `apps/api/` (Node-API: im Mock-Prototyp ungenutzt, am `azure`-Fork Fastify + Drizzle gegen PostgreSQL). Die Root ist reiner Orchestrator und **kein** Package: `pnpm dev` / `pnpm verify` / `pnpm deploy:cloudflare` laufen dort, `vite.config.ts` / `tsconfig.json` / `components.json` liegen in `apps/web/`. Das Layout gilt backend-unabhängig, damit der Fork ein Adapter-Swap bleibt und kein Repo-Umbau wird.

**Design-Regel:** UI ausschließlich über die Design-Tokens und die shadcn-Komponenten in `apps/web/src/shared/components/ui/` — **kein eigenes CSS-File, keine Inline-Farben.** Tokens (oklch) leben in `apps/web/src/index.css`, Varianten laufen über Komponenten-Props. Welche Komponente wann: [`COMPONENTS.md`](COMPONENTS.md).

## Projektspezifische Regeln

- **localhost-first:** entwickelt und reviewt wird am laufenden `pnpm dev` im Browser gegen den Mock-Adapter, nicht über einen Deploy. Geteilt wird der Prototyp über Cloudflare Pages ([`docs/hosting.md`](docs/hosting.md)); die Power-Platform-Toolchain ist erst am `dataverse`-Fork relevant.
- Neue Features spiegeln [`apps/web/src/features/_example`](apps/web/src/features/_example) — der Build muss nach jedem Schritt grün bleiben.
- `pnpm verify` (`check:env && lint && knip && build`) muss vor jedem Commit grün sein — `build` fächert über beide Packages (`apps/web`: `tsc --noEmit && vite build`, `apps/api`: `tsc`), `lint` und `knip` laufen einmal an der Root über den gesamten Workspace. Das Gate sitzt pro Phase in `/execute`.

## Projekt-Doku

| Thema | Datei |
| --- | --- |
| Roter Faden / Onboarding | [`docs/overview.md`](docs/overview.md) |
| Anforderungen | [`docs/prd.md`](docs/prd.md) |
| Datenmodell | [`docs/datamodel.md`](docs/datamodel.md) + [`docs/datamodel.mmd`](docs/datamodel.mmd) |
| Hosting / Deploy | [`docs/hosting.md`](docs/hosting.md) |
| Azure-Setup (Fork `mock → azure`) | [`docs/azure-setup.md`](docs/azure-setup.md) |
| Anmeldung & Absicherung (`backend: azure`) | [`docs/auth.md`](docs/auth.md) |
| Prototyp-Artefakte | [`docs/prototype-manifest.md`](docs/prototype-manifest.md) |

`docs/prd.md`, `docs/datamodel.md` und `docs/datamodel.mmd` sind vom `/prototype`-Ingest gespiegelte **Snapshots** des SharePoint-Masters (Kopf-Header `Stand:`/`Quelle:`), nicht die Live-Wahrheit — bei Änderung via erneutem Ingest (`[O]verwrite`) auffrischen.
