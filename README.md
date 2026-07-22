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

## Die Command-Kette (Customer-Track)

Die Arbeit läuft in zwei Phasen mit zwei Promotion-Pfaden: `/prototype → /handoff → /plan → /execute → /ship`.

**Prototyp-Phase (einmalig, autonom):**

- **`/prototype <projektordner>`** — der einzige Consultant-Einstieg. Faltet die Ingestion ein (zieht
  PRD/Datenmodell aus dem **SharePoint-Quellordner** read-only nach `docs/` — als Snapshot) und baut daraus
  den vollständigen Mock-Prototyp: pro Feature ein Modul nach dem Muster von
  [`src/features/_example`](src/features/_example) (Port-Hook + AsyncBoundary + die fünf DoD-Zustände +
  `canSee`/`canEdit`). Landet auf `prototype` → Cloudflare → Kunden-Abstimmung → `prototype` **eingefroren**.
  *(Autonome Engine — wird über das `.claude`-Submodul geliefert.)*

**Übergabe (einmalig):**

- **`/handoff`** — seedet `dev` aus dem abgestimmten, eingefrorenen `prototype` und eröffnet die Produkt-Phase.

**Produkt-Phase (pro Änderung):**

1. **`/plan <slug>`** — interview-first, lädt Pflicht-Kontext, schreibt `docs/plans/YYYY-MM-DD-<slug>.md`
   (+ `feature/<slug>`-Branch **von `dev`**), schlägt einen `Autopilot:`-Wert vor.
2. **Plan inline reviewen** — Phasen/Constraints direkt im Editor anpassen.
3. **`/execute docs/plans/<file>.md`** — **autonomer Kern (Autopilot-Default):** committet nach jeder Phase
   (verify-Gate pro Phase), pusht auf einen Draft-PR gegen `dev` und merged ihn am Ende (echter Merge-Commit)
   → `dev`. `Autopilot: false` erzwingt den Per-Phasen-Stopp.
4. **`/ship`** — Produktions-Promotion `dev → main` (echter Merge-Commit, kein Squash).

**Regel:** Autonom bis `dev`; der einzige bewusste menschliche Gate-Punkt ist **`/ship` (dev→main)**.
`prototype` ist in der Produkt-Phase eingefroren und aus dem Pfad raus. Kein Merge ohne grünes `pnpm verify`
(Gate sitzt in `/execute`, pro Phase). `/commit` ist kein Customer-Schritt mehr (nur noch Tool-Track-Mechanik-Referenz).

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
docs/                 Projekt-Doku (PRD, Datenmodell — SharePoint-Snapshots, prototype-manifest.md)
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
| Angebot, Meetings, sonstige Kundendokumente | SharePoint only — **nie ins Repo, nie überschrieben** |
| PRD, Datenmodell                            | `docs/` im Repo als Snapshot (Owner-Entscheidung — privates Repo) |
| Code, Konfiguration                         | Repo                                                 |

`/prototype` kopiert PRD/Datenmodell aus dem **SharePoint-Quellordner** (lokal via OneDrive-Sync) **einseitig**
nach `docs/` — als Snapshot mit `Stand:`/`Quelle:`-Header, liest SharePoint read-only, schreibt es nie. Die
SharePoint-Bibliothek bleibt die laufend gepflegte Single Source of Truth; bei Änderung frischt ein erneuter
`/prototype`-Ingest (`[O]verwrite`) den Snapshot auf. Ab dem Import liegt die Verantwortung für `docs/` beim Dev-Team.

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
