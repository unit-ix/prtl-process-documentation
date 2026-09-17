# Projekt-Konfiguration

> Projektspezifische Ergänzung. Geteilte UNIT-IX-Standards inkl. Pflicht-Lektüre und Workflow: [`.claude/CLAUDE.md`](.claude/CLAUDE.md) (wird automatisch mitgeladen).

## Projektkontext

**Prototype-First Golden Template.** Das Projekt startet als lauffähiger Mock-Prototyp (seed-basiert, localhost, kein Backend) und bekommt erst nach Kunden-OK ein echtes Backend. Zwei unabhängige Achsen:

- **Plattform** = `platform`-Feld in [`.unitix/project.json`](.unitix/project.json) (`mock` → `azure` oder `powerapps`). Single Source of Truth für Datenadapter, Regelsatz und Host — ein Feld, weil die Zuordnung Plattform → Host 1:1 ist. UI und Hooks sprechen nur den Port (`@/data`) an, nie einen Adapter; der Fork ist ein Ein-Datei-Swap in `apps/web/src/data/index.ts`, siehe [`docs/prototype-manifest.md`](docs/prototype-manifest.md).
- **Umgebung** = Deploy-Ziel, **kein Branch**. Es gibt `main` und kurzlebige `feature/*`; `dev`/`prod` sind Blöcke in `project.json` → `environments`, gewählt per `pnpm deploy:dev` / `pnpm deploy:prod`. Modell, Ressourcen-Konvention und Gates: [`.claude/docs/patterns-azure.md`](.claude/docs/patterns-azure.md) → Umgebungen.

**Repo-Layout:** pnpm-Workspace mit zwei Packages — `apps/web/` (SPA) und `apps/api/` (Node-API: im Mock-Prototyp ungenutzt, am `azure`-Fork Fastify + Drizzle gegen PostgreSQL). Die Root ist reiner Orchestrator und **kein** Package: `pnpm dev` / `pnpm verify` / `pnpm deploy:cloudflare` laufen dort, `vite.config.ts` / `tsconfig.json` / `components.json` liegen in `apps/web/`. Das Layout gilt plattform-unabhängig, damit der Fork ein Adapter-Swap bleibt und kein Repo-Umbau wird.

**Abstände — vom Kunden angemerkt, gilt für jede neue Oberfläche:**

- **Tabellen atmen.** Zellen `px-5 py-4`, Kopfzeilen `h-12 px-5`. Inhalt klebt nie am Kartenrand. Die Werte stehen einmal in [`table.tsx`](apps/web/src/shared/components/ui/table.tsx) — dort ändern, nicht pro Tabelle.
- **Formularfelder füllen ihre Spalte.** `SelectTrigger` ist per Default `w-full`; eine feste Breite gibt es nur dort, wo sie gewollt ist (Filterleiste, Einstellungen), und zwar per `className`. Ein halb so breites Auswahlfeld neben einem vollbreiten Eingabefeld sieht nach Versehen aus — weil es eines ist.
- **Sheets und Dialoge:** Kopf, Körper und Fuß auf derselben Kante (`p-6`), Feldabstand `space-y-5`.

**Design-Regel:** UI ausschließlich über die Design-Tokens und die shadcn-Komponenten in `apps/web/src/shared/components/ui/` — **kein eigenes CSS-File, keine Inline-Farben.** Tokens (oklch) leben in `apps/web/src/index.css`, Varianten laufen über Komponenten-Props. Welche Komponente wann: [`COMPONENTS.md`](COMPONENTS.md).

## Projektspezifische Regeln

- **localhost-first:** entwickelt und reviewt wird am laufenden `pnpm dev` im Browser gegen den Mock-Adapter, nicht über einen Deploy. Geteilt wird der Prototyp über Cloudflare Pages ([`docs/hosting.md`](docs/hosting.md)); die Power-Platform-Toolchain ist erst am `powerapps`-Fork relevant.
- Neue Features spiegeln [`apps/web/src/features/_example`](apps/web/src/features/_example) — der Build muss nach jedem Schritt grün bleiben.
- `pnpm verify` muss vor jedem Commit grün sein — **ein Befehl, sechs Stufen, Budget unter 60 Sekunden** (aktuell ~9 s). Alle Stufen laufen durch, auch nach einem Rot: sonst verdeckt der erste Fehler die anderen. Das Gate sitzt pro Phase in `/execute`.

### Prüfsystematik ([`docs/pruefsystematik.md`](docs/pruefsystematik.md))

**Die Maschine prüft, was der Mensch nicht sehen kann — alles andere prüft der Mensch am Bildschirm.** Vier Regeln, die daraus folgen:

- **Getestet wird, was unsichtbar falsch sein kann:** die Permission-Prädikate (§2.3), `completeness()` (§5.4), die Identifier-Bildung und das Prägen der Dokumentnummer (§5.1), der abgeleitete Unterweisungsstatus (§7.2). Reine Funktionen, keine Datenbank, keine Fixtures — Tests liegen als `*.test.ts` neben dem Code und laufen in Millisekunden.
- **Nicht getestet wird, was auffällt:** Layout, Beschriftung, Bedienweg, Gestaltung. Dafür ist der Browser da, nicht ein Skript mit zwanzig Zeilen für ein Urteil, das es trotzdem falsch abbildet.
- **Jede selbstgebaute Prüfung bekommt einen Selbsttest mit beiden Seiten** — Fälle, die anschlagen *müssen*, und Fälle, die schweigen *müssen*. Eine Regel, die blind grün ist, sieht aus wie eine, die nichts findet ([`scripts/checks.test.mjs`](scripts/checks.test.mjs)). Das gilt auch für den Runner selbst: der rote Pfad wird beim Bauen einmal ausgelöst, nicht angenommen.
- **Nie gegen die Uhr testen.** Was vom Datum abhängt (Frist = heute + 14 Tage, 60-Tage-Ablauf­erinnerung, „Überfällig"), bekommt das Datum als **Parameter** — `today` wird hereingereicht, nie innen aus `new Date()` gelesen. Ein Rot, das nur heute rot ist, entwertet jedes Rot.

Browser- und Netz-Prüfungen gehören in die CI, nicht in die Schleife. In der CI stehen dieselben Stufen als **einzelne Steps** (Ablesbarkeit im Balken); eine Abhängigkeits-Prüfung käme ans Ende, nie an den Anfang.

## Projekt-Doku

| Thema | Datei |
| --- | --- |
| Roter Faden / Onboarding | [`docs/overview.md`](docs/overview.md) |
| Anforderungen | [`docs/prd.md`](docs/prd.md) |
| Datenmodell | [`docs/datamodel.md`](docs/datamodel.md) + [`docs/datamodel.mmd`](docs/datamodel.mmd) |
| Hosting Mock-Prototyp (Cloudflare) | [`docs/hosting.md`](docs/hosting.md) |
| Azure-Setup, Klick-für-Klick (Fork `mock → azure`) | [`docs/azure-runbook.md`](docs/azure-runbook.md) |
| Mailversand über Power Automate (Übergang bis Graph) | [`docs/mail-flow.md`](docs/mail-flow.md) |
| Prototyp-Artefakte | [`docs/prototype-manifest.md`](docs/prototype-manifest.md) |

`docs/prd.md`, `docs/datamodel.md` und `docs/datamodel.mmd` sind vom `/prototype`-Ingest gespiegelte **Snapshots** des SharePoint-Masters (Kopf-Header `Stand:`/`Quelle:`), nicht die Live-Wahrheit — bei Änderung via erneutem Ingest (`[O]verwrite`) auffrischen.
