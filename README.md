# Code Apps Projekt-Template

**Prototype-First Golden Template** für UNIT-IX Code Apps (React 19 + Vite + TypeScript SPA).

Jedes Projekt startet als lauffähiger **Mock-Prototyp** — seed-basiert, ohne Backend, lokal im Browser erlebbar — und bekommt erst nach Kunden-OK ein echtes Backend (Azure oder Dataverse). Der Prototyp ist kein Wegwerf-Mockup: er **wird** die App.

---

## Zwei Achsen: Stage × Backend

| Achse       | Steuert                  | Werte                                                                     |
| ----------- | ------------------------ | ------------------------------------------------------------------------- |
| **Stage**   | Reifegrad (= Git-Branch) | Prototyp-Phase: `→ prototype` · Produkt-Phase: `feature/* → dev → main`   |
| **Backend** | Datenquelle              | `mock` (Default) → `azure` **oder** `dataverse` (Fork nach Kunden-OK)     |

Die beiden Achsen sind unabhängig. Das aktive Backend steht in [`.unitix/project.json`](.unitix/project.json) und ist die **Single Source of Truth**:

```json
{ "backend": "mock", "frontend": "cloudflare" }
```

`prototype` ist nach dem Kunden-OK eingefroren und **nicht** Teil des Produkt-Pfads. Was auf welchen Branch deployt: [`docs/hosting.md`](docs/hosting.md).

## Der Data-Seam

Die App weiß nicht, woher ihre Daten kommen. Sie fragt einen **Port**; dahinter steckt ein austauschbarer **Adapter**:

```
apps/web/src/data/index.ts        ← der eine Swap-Punkt
apps/web/src/data/ports/          ← Interfaces, backend-agnostisch
apps/web/src/data/adapters/mock/  ← faker-Seed-Store (später: azure/ oder dataverse/)
```

**UI und Hooks sprechen nur den Port an (`@/data`), nie einen Adapter** — mechanisch erzwungen via `eslint-plugin-boundaries`, nicht nur als Bitte. Die Domain-Typen in `apps/web/src/domain/` sind der Vertrag: eine Entität = eine künftige Tabelle. Stimmen sie, fällt das Backend-Schema später mechanisch heraus. Backend-Naming lebt ausschließlich im Adapter.

Das ist nicht Architektur-Geschmack, sondern das Einlösen eines Vertriebs-Versprechens: wir bauen von vornherein umstöpselbar, damit wir nicht an einen Hersteller gekettet sind. Der Fork ist deshalb ein Ein-Datei-Swap statt eines Neubaus. Was am Fork wegfällt, listet [`docs/prototype-manifest.md`](docs/prototype-manifest.md).

---

## Neues Projekt starten

```bash
# 1. Repository aus diesem Template anlegen (GitHub → "Use this template")
git clone git@github.com:unit-ix/<projekt-name>.git
cd <projekt-name>

git submodule update --init --recursive   # .claude-Submodul holen
nvm use                                    # liest .nvmrc → Node 24
pnpm install
```

## Dev-Loop — localhost-first

```bash
pnpm dev       # Vite Dev-Server (apps/web), Mock-Adapter, kein Backend nötig
pnpm dev:full  # API + SPA zusammen — der Einstieg bei backend: azure
pnpm verify    # check:env + lint + knip + build (build fächert über apps/*)
```

Alle Befehle laufen **an der Repo-Root**, nicht im Package — die Root ist der Orchestrator.

`pnpm verify` ist das eine Gate, muss vor jedem Commit grün sein und wird von CI 1:1 gespiegelt. Entwickelt und **intern** reviewt wird am laufenden `pnpm dev` im Browser, nicht über einen Deploy. Die **Kunden-Abstimmung** läuft über den Cloudflare-Deploy des `prototype`-Branches.

> Die Power-Platform-Toolchain (`npx power-apps …`) ist erst am `dataverse`-Fork relevant, im Mock-Prototyp nie.

## Der Workflow

Consultant-Einstieg ist `/prototype <projektordner>`, dann `/handoff` in die Produkt-Phase, dann pro Änderung `/plan → /execute → /ship`. Autonom bis `dev`; der einzige bewusst gegatete Schritt ist `/ship` (dev→main).

Kanonische Beschreibung aller Commands und Regelsätze: [`.claude/CLAUDE.md`](.claude/CLAUDE.md). Roter Faden für neue Teammitglieder: [`docs/overview.md`](docs/overview.md).

---

## Repo-Struktur

```
.claude/                  Geteiltes UNIT-IX Claude-Submodul (CLAUDE.md, docs/, commands/, settings.json)
.github/workflows/        CI — spiegelt pnpm verify, plus gegateter Cloudflare-Deploy
.unitix/                  project.json — Backend- + Hosting-Achse (Single Source of Truth)
docs/                     Projekt-Doku (PRD + Datenmodell als SharePoint-Snapshots, hosting, manifest)
scripts/                  Projektweites Node-Tooling (deploy, check:env)
pnpm-workspace.yaml       Workspace: apps/* — die Root ist reiner Orchestrator, kein Package
eslint.config.js          Hard-Rules + Lean-Coding-Gates + Layer-Boundaries (deckt beide Apps)
knip.jsonc                Dead-Code-Gate, ein Eintrag pro Workspace
COMPONENTS.md             Design-Vokabular: welche Komponente wann

apps/web/                 Die SPA — wird statisch deployt (Cloudflare Pages bzw. SWA)
  src/app/                Einstieg (main.tsx, App.tsx) — Provider, Router, QueryClient
  src/domain/             Reine Domänen-Typen (kennen kein Backend)
  src/data/               Data-Seam: ports/ · index.ts (Swap-Punkt) · adapters/
  src/features/           Feature-Module (_example = kanonisches Referenz-Feature)
  src/shared/             components/ (ui = shadcn), lib/, hooks/

apps/api/                 Node-API (Fastify + Drizzle). Im mock-Prototyp ungenutzt, am azure-Fork
  src/db/                 die Serverseite. Existiert immer, damit das Layout backend-unabhängig
  src/router/             bleibt und der Fork ein Swap statt eines Umbaus ist.
  src/auth/

```

## Was wohin gehört

| Artefakt                                    | Ort                                                   |
| ------------------------------------------- | ----------------------------------------------------- |
| Angebot, Meetings, sonstige Kundendokumente | SharePoint only — **nie ins Repo**                    |
| PRD, Datenmodell                            | `docs/` im Repo als Snapshot (privates Repo)          |
| Code, Konfiguration                         | Repo                                                  |

`/prototype` spiegelt PRD und Datenmodell **einseitig** aus dem SharePoint-Quellordner (lokal via OneDrive-Sync) nach `docs/` — mit `Stand:`/`Quelle:`-Header, read-only, nie zurückschreibend. SharePoint bleibt die laufend gepflegte Single Source of Truth; bei Änderung frischt ein erneuter Ingest den Snapshot auf.

## Fork: mock → azure/dataverse

1. `backend` in [`.unitix/project.json`](.unitix/project.json) umstellen.
2. Backend-Adapter pro Entität am jeweiligen Port implementieren, `apps/web/src/data/index.ts` um den Zweig ergänzen.
3. `RoleProvider` auf den Host-User umstellen, `RoleSwitcher` entfernen.
4. Prototyp-Artefakte gemäß [`docs/prototype-manifest.md`](docs/prototype-manifest.md) auf `forked`/`n/a` ziehen.

Beim `azure`-Fork kommen Node-API, PostgreSQL und Entra ID dazu — Ablauf und Voraussetzungen: [`docs/azure-setup.md`](docs/azure-setup.md).
Beim `dataverse`-Fork kommt die Power-Platform-Toolchain ins Spiel (`npx power-apps run` / `push`).

## Shared-Ressourcen aktualisieren

```bash
git submodule update --remote .claude
git add .claude && git commit -m "chore: update shared claude resources"
```
