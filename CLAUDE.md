# Projekt-Konfiguration

> Projektspezifische Claude-Konfiguration für DIESES Repo.
> Geteilte UNIT-IX-Standards inkl. Pflicht-Lektüre: `[.claude/CLAUDE.md](.claude/CLAUDE.md)` (wird automatisch zusätzlich geladen).

## Projektkontext

**Prototype-First Golden Template.** Das Projekt startet als lauffähiger **Mock-Prototyp** (seed-basiert, localhost, kein Backend) und wird erst nach Kunden-OK auf ein echtes Backend geforkt. Zwei Achsen:

- **Stage** = Git-Branch. **Zwei Promotion-Pfade, nicht linear:** Prototyp-Phase `/prototype → prototype` (die Engine committet Feature für Feature **direkt auf `prototype`**, Cloudflare, Kunden-Abstimmung) → `prototype` **eingefroren**. `dev` und `feature/*` gibt es erst in der **Produkt-Phase** (`dev` wird bei `/handoff` aus `prototype` geseedet): `feature → dev → main`, wobei `prototype` eingefroren bleibt und **aus dem Produkt-Pfad raus** ist (bewusst übersprungen).
- **Backend** = Datenquelle aus [`.unitix/project.json`](.unitix/project.json) (`mock` → `supabase` **oder** `dataverse`). Das ist die Single Source of Truth der `backend`-Achse; UI/Hooks sprechen nur den Port (`@/data`) an, nie einen Adapter. Der Fork ist ein Ein-Datei-Swap in `src/data/index.ts` — siehe [`docs/prototype-manifest.md`](docs/prototype-manifest.md).

**Design-Regel:** UI ausschließlich über die Design-Tokens und die shadcn-Komponenten in `src/shared/components/ui/` — **kein eigenes CSS-File, keine Inline-Farben.** Tokens leben in `src/index.css` (oklch), Varianten über die Komponenten-Props. Welche Komponente wann → [`COMPONENTS.md`](COMPONENTS.md) (Inventar, von `src/index.css` referenziert).

## Workflow-Regeln

> **Die vollständige Command-Kette + Track-Modell ist kanonisch in `[.claude/CLAUDE.md](.claude/CLAUDE.md)` „Workflow-Skills"** — Customer-Kette `/prototype → /handoff → /plan → /execute → /ship`, Tool-Track `/dev-plan → /dev-execute`, inklusive Autopilot-Default, Branch-Modell (zwei Promotion-Pfade) und dem einen Gate-Punkt `/ship` (dev→main). Diese Datei **wiederholt das bewusst nicht** (gegen Drift), sondern führt nur die projektspezifischen Zusätze:

- **localhost-first**: entwickelt und reviewt wird am laufenden `pnpm dev` im Browser (Mock-Backend), nicht über einen Deploy. Der Prototyp wird über Cloudflare Pages geteilt; die Power-Platform-Toolchain (`npx power-apps …`) ist erst am `dataverse`-Fork relevant.
- Neue Features spiegeln [`src/features/_example`](src/features/_example) — Build muss nach jedem Schritt grün bleiben.
- `pnpm verify` muss vor jedem Commit grün sein (`pnpm lint && pnpm knip && pnpm build`; `build` = `tsc --noEmit && vite build`, deckt den Typecheck also mit ab — kein separater tsc-Lauf mehr). Das Gate sitzt in `/execute` (Customer, pro Phase vor dem Merge) bzw. `/dev-execute` (Tool-Track).

## Projekt-Doku


| Thema         | Datei                                                                                 |
| ------------- | ------------------------------------------------------------------------------------- |
| Anforderungen | `[docs/prd.md](docs/prd.md)`                                                          |
| Datenmodell   | `[docs/datamodel.md](docs/datamodel.md)` + `[docs/datamodel.mmd](docs/datamodel.mmd)` |

> **Snapshot, nicht Live-Wahrheit:** `docs/prd.md` / `docs/datamodel.md` / `docs/datamodel.mmd` sind vom `/prototype`-Ingest gespiegelte **Snapshots** des SharePoint-Masters (Kopf-Header `Stand:` / `Quelle:`). Die SharePoint-Bibliothek ist die laufend gepflegte Single Source of Truth; bei Änderung den Snapshot via erneutem `/prototype`-Ingest (`[O]verwrite`) auffrischen. (Eine projektspezifische Architektur-Doku wird bei Bedarf pro Projekt angelegt — das leere Template-Stub `docs/architecture.md` gibt es nicht mehr.)


