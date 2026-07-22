# Projekt-Konfiguration

> Projektspezifische Claude-Konfiguration für DIESES Repo.
> Geteilte UNIT-IX-Standards inkl. Pflicht-Lektüre: `[.claude/CLAUDE.md](.claude/CLAUDE.md)` (wird automatisch zusätzlich geladen).

## Projektkontext

**Prototype-First Golden Template.** Das Projekt startet als lauffähiger **Mock-Prototyp** (seed-basiert, localhost, kein Backend) und wird erst nach Kunden-OK auf ein echtes Backend geforkt. Zwei Achsen:

- **Stage** = Git-Branch. **Zwei Promotion-Pfade, nicht linear:** Prototyp-Phase `/prototype → prototype` (die Engine committet Feature für Feature **direkt auf `prototype`**, Cloudflare, Kunden-Abstimmung) → `prototype` **eingefroren**. `dev` und `feature/*` gibt es erst in der **Produkt-Phase** (`dev` wird bei `/handoff` aus `prototype` geseedet): `feature → dev → main`, wobei `prototype` eingefroren bleibt und **aus dem Produkt-Pfad raus** ist (bewusst übersprungen).
- **Target** = Datenquelle aus [`.unitix/project.json`](.unitix/project.json) (`mock` → `supabase` **oder** `dataverse`). Das ist die Single Source of Truth der `target`-Achse; UI/Hooks sprechen nur den Port (`@/data`) an, nie einen Adapter. Der Fork ist ein Ein-Datei-Swap in `src/data/index.ts` — siehe [`docs/prototype-manifest.md`](docs/prototype-manifest.md).

**Design-Regel:** UI ausschließlich über die Design-Tokens und die shadcn-Komponenten in `src/shared/components/ui/` — **kein eigenes CSS-File, keine Inline-Farben.** Tokens leben in `src/index.css` (oklch), Varianten über die Komponenten-Props.

## Workflow-Regeln

- **Autonom bis `dev`, gegatet auf `main`** (Customer-Track): `/execute` läuft **Autopilot-by-default** — arbeitet alle Phasen am Stück ab, committet nach jeder Phase, pusht auf einen Draft-PR gegen `dev` und merged ihn am Ende autonom. `Autopilot: false` im Header erzwingt den Per-Phasen-Stopp. Der bewusste menschliche Gate-Punkt ist **`/ship` (dev→main)**. (Der Tool-Track `/dev-execute` bleibt gated-by-default — direct-push auf `main`.)
- **localhost-first**: entwickelt und reviewt wird am laufenden `pnpm dev` im Browser (Mock-Target), nicht über einen Deploy. Der Prototyp wird über Cloudflare Pages geteilt; die Power-Platform-Toolchain (`npx power-apps …`) ist erst am `dataverse`-Fork relevant.
- Neue Features spiegeln [`src/features/_example`](src/features/_example) — Build muss nach jedem Schritt grün bleiben.
- `pnpm verify` muss vor jedem Commit grün sein (`pnpm lint && pnpm knip && pnpm tsc --noEmit && pnpm build`). Das Gate sitzt in `/execute` (Customer, pro Phase vor dem Merge) bzw. `/commit`/`/dev-execute` (Tool-Track).
- **Prototyp aufbauen (einmalig):** `/prototype <projektordner>` ist der einzige Consultant-Einstieg — es faltet die Ingestion ein (importiert PRD/Datenmodell nach `docs/`, liest den **SharePoint-Quellordner** read-only, schreibt ihn nie) und baut daraus den Mock-Prototyp Feature für Feature nach dem `_example`-Muster. (`/bootstrap` ist kein consultant-facing Kommando mehr, nur noch das interne Ingest-Modul.)
- **Übergabe an die Produkt-Phase (einmalig):** `/handoff` seedet `dev` aus dem abgestimmten, eingefrorenen `prototype`.
- Für nicht-triviale Änderungen danach: `/plan <slug> [<beschreibung>]` (interview-first, Feature-Branch **von `dev`**) → Plan-File inline editieren → `/execute docs/plans/<file>.md` (Autopilot-Default: committet pro Phase, pusht auf Draft-PR gegen `dev`, merged am Ende autonom) → `/ship` (Produktions-Promotion `dev → main`).
- **Kanonische Workflow-Quelle:** `[.claude/CLAUDE.md](.claude/CLAUDE.md)` Sektion „Workflow-Skills" (Customer-Kette `/prototype → /handoff → /plan → /execute → /ship`; `/commit` ist kein Customer-Schritt mehr, bleibt Mechanik-Referenz). Diese Datei führt nur die projektspezifische Kurz-Summary — Details und Repo-Mode-Detection dort.

## Projekt-Doku


| Thema         | Datei                                                                                 |
| ------------- | ------------------------------------------------------------------------------------- |
| Anforderungen | `[docs/prd.md](docs/prd.md)`                                                          |
| Datenmodell   | `[docs/datamodel.md](docs/datamodel.md)` + `[docs/datamodel.mmd](docs/datamodel.mmd)` |

> **Snapshot, nicht Live-Wahrheit:** `docs/prd.md` / `docs/datamodel.md` / `docs/datamodel.mmd` sind vom `/prototype`-Ingest gespiegelte **Snapshots** des SharePoint-Masters (Kopf-Header `Stand:` / `Quelle:`). Die SharePoint-Bibliothek ist die laufend gepflegte Single Source of Truth; bei Änderung den Snapshot via erneutem `/prototype`-Ingest (`[O]verwrite`) auffrischen. (Eine projektspezifische Architektur-Doku wird bei Bedarf pro Projekt angelegt — das leere Template-Stub `docs/architecture.md` gibt es nicht mehr.)


