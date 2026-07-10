# Code Apps Projekt-Template

**Prototype-First Golden Template** für UNIT-IX Power Platform Code Apps (React 19 + Vite + TypeScript SPA).
Jedes Projekt startet als lauffähiger **Mock-Prototyp** — seed-basiert, ohne Backend, lokal im Browser
erlebbar — und wird erst nach Kunden-OK auf ein echtes Backend geforkt (Supabase oder Dataverse).
Das Template bringt Struktur, Toolchain, Data-Seam und Claude-Konfiguration mit.

---

## Zwei Achsen: Stage × Target

Ein Projekt bewegt sich auf zwei unabhängigen Achsen:

| Achse      | Steuert                          | Werte                                                              |
| ---------- | -------------------------------- | ------------------------------------------------------------------ |
| **Stage**  | Reifegrad (= Git-Branch)         | `feature/*` → `dev` → `prototype` → `main`                         |
| **Target** | Datenquelle (= Backend)          | `mock` (Default) → `supabase` **oder** `dataverse` (Fork nach OK)  |

Das aktive Target steht in [`.unitix/project.json`](.unitix/project.json) und ist die **Single Source of Truth**:

```json
{ "target": "mock", "hosting": "cloudflare" }
```

Der **Data-Seam** (`src/data/`) entkoppelt UI von Backend: UI und Hooks sprechen nur einen
Port (`@/data`) an, nie einen konkreten Adapter. Der Fork ist deshalb ein Ein-Datei-Swap in
`src/data/index.ts` — die Features bleiben unangetastet. Was am Fork wegfällt, listet
[`docs/prototype-manifest.md`](docs/prototype-manifest.md).

---

## Neues Projekt starten

```bash
# 1. Repository aus diesem Template anlegen (GitHub → "Use this template")
git clone git@github.com:unit-ix/<projekt-name>.git
cd <projekt-name>

# 2. Submodul initialisieren
git submodule update --init --recursive

# 3. Node-Version setzen
nvm use   # liest .nvmrc → Node 24

# 4. Abhängigkeiten installieren
pnpm install
```

---

## Zwei Command-Tracks

Die Arbeit läuft über zwei Slash-Command-Ketten — eine erzeugt den Prototyp, die andere iteriert ihn:

**Track 1 — Prototyp aufbauen (einmalig, autonom):**

- **`/bootstrap [<pm-pfad>]`** — zieht den fachlichen Kontext (PRD/Datenmodell/Architektur) aus dem
  PM-Framework-Ordner nach `docs/`. Der **OneDrive-Quellordner wird nie geschrieben**, nur gelesen.
- **`/prototype <projektordner>`** — baut aus dem PRD den vollständigen Mock-Prototyp: pro Feature ein
  Modul nach dem Muster von [`src/features/_example`](src/features/_example) (Port-Hook + AsyncBoundary +
  die fünf DoD-Zustände + `canSee`/`canEdit`). *(Autonome Engine — wird über das `.claude`-Submodul geliefert.)*

**Track 2 — Feature iterieren (pro Änderung, gated):**

1. **`/plan <slug>`** — interview-first, lädt Pflicht-Kontext, schreibt `docs/plans/YYYY-MM-DD-<slug>.md`
   (+ `feature/<slug>`-Branch), schlägt einen `Autopilot:`-Wert vor.
2. **Plan inline reviewen** — Phasen/Constraints direkt im Editor anpassen.
3. **`/execute docs/plans/<file>.md`** — **gated** (Default): genau eine Phase, stagen, abhaken, STOP.
   Bei `Autopilot: true`: alle Phasen am Stück, `pnpm verify` zwischen jeder. **Committet nie.**
4. **`/commit`** — `pnpm verify` als Gate → mehrere geordnete Phasen-Commits + SHA ins Execution Log.
5. **`/ship`** — push + Draft-PR (SHAs aus dem Log) + auto-squash-merge → `main`.

**Regel:** Ein Plan = ein Feature = ein PR. **Gated by default**, Autopilot opt-in pro Plan.
Kein Merge ohne grünes `pnpm verify` (Gate sitzt in `/commit`, nicht in CI).

Kanonische Workflow-Quelle + Repo-Mode-Detection: [`.claude/CLAUDE.md`](.claude/CLAUDE.md).
Plan-Template: [`.claude/docs/plan-template.md`](.claude/docs/plan-template.md).

---

## Dev-Loop — localhost-first

Der Prototyp läuft **lokal im Browser** gegen den Mock-Adapter — kein Backend, keine Power-Platform-Verbindung nötig:

```bash
pnpm dev        # Vite Dev-Server → im Browser öffnen (Vite wählt den Port selbst)
pnpm verify     # lint + knip + typecheck + build (spiegelt CI 1:1)
```

`pnpm verify` ist das eine Gate: `lint && knip && tsc --noEmit && build`. Es muss vor jedem Commit
grün sein und wird von CI 1:1 gespiegelt. Review passiert am laufenden `pnpm dev` im Browser —
nicht über einen Deploy. Geteilt wird der Prototyp über **Cloudflare Pages** (`hosting: cloudflare`).

> Der Power-Platform-Connections-Server (`npx power-apps run`) und `npx power-apps push` sind
> **erst am `dataverse`-Fork** relevant, nicht im Mock-Prototyp.

---

## Repo-Struktur

```
.claude/              Geteiltes UNIT-IX Claude-Submodul (CLAUDE.md, docs/, commands/, settings.json)
.github/workflows/    CI — lint + knip + typecheck + build (spiegelt pnpm verify)
.unitix/              project.json — Target- + Hosting-Achse (Single Source of Truth)
docs/                 Projekt-Doku (PRD, Datenmodell, Architektur, prototype-manifest.md)
src/app/              Einstieg (main.tsx, App.tsx) — Provider, Router, QueryClient
src/domain/           Reine Domänen-Typen (kennt kein Backend)
src/data/             Data-Seam: ports/ (Interfaces) · index.ts (Swap-Punkt) · adapters/ (mock/…)
src/features/         Feature-Module (_example = kanonisches Referenz-Feature)
src/shared/           Übergreifend: components/ (ui = shadcn), lib/, hooks/
eslint.config.js      Hard-Rules + Lean-Coding-Gates + Layer-Boundaries
```

---

## Was wohin gehört

| Artefakt                                    | Ort                                                  |
| ------------------------------------------- | ---------------------------------------------------- |
| Angebot, Meetings, sonstige Kundendokumente | OneDrive only — **nie ins Repo, nie überschrieben**  |
| PRD, Datenmodell, Architektur               | `docs/` im Repo (Owner-Entscheidung — privates Repo) |
| Code, Konfiguration                         | Repo                                                 |

`/bootstrap` kopiert PRD/Datenmodell/Architektur aus dem PM-Framework-Ordner **einseitig** nach `docs/`
(liest OneDrive, schreibt es nie). Ab dem Import liegt die Verantwortung für `docs/` beim Dev-Team.

---

## Fork: mock → supabase/dataverse

Sobald der Kunde den Prototyp abgenommen hat:

1. `target` in [`.unitix/project.json`](.unitix/project.json) umstellen.
2. Backend-Adapter pro Entität am jeweiligen Port implementieren, `src/data/index.ts` um den Zweig ergänzen.
3. `RoleProvider` auf den Host-User umstellen, `RoleSwitcher` entfernen.
4. Prototyp-Artefakte gemäß [`docs/prototype-manifest.md`](docs/prototype-manifest.md) auf `forked`/`n/a` ziehen.

Beim `dataverse`-Fork kommt die Power-Platform-Toolchain ins Spiel (`npx power-apps run` / `push`).

---

## Shared-Ressourcen aktualisieren

```bash
git submodule update --remote .claude
git add .claude && git commit -m "chore: update shared claude resources"
```
