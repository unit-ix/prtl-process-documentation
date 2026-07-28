# Vom Kundengespräch zur fertigen App

> Der rote Faden durch das Prototype-First Golden Template — für neue Teammitglieder, in ~10 Minuten.
> Diese Seite erklärt, wie die Teile zusammenhängen, und verlinkt die Regeln statt sie zu wiederholen.
> Bei Widerspruch gewinnt immer die verlinkte Quelle. Fürs Meeting gibt es [`overview.html`](overview.html) — dieselben Inhalte als Diagramme (Achsen-Matrix, Branch-Graph, Data-Seam), kein 1:1-Abbild dieser Seite.

## Worum es geht

Wir bauen **zuerst einen klickbaren Prototyp**, nicht zuerst ein Backend. Er arbeitet mit erfundenen Daten; wir entwickeln ihn auf localhost, und für die **Abstimmung mit dem Kunden** liegt er auf Cloudflare — immer noch mit Mock-Daten. Erst nach dem OK bekommt er ein echtes Backend.

Warum: Ein Konzept auf Papier diskutiert man drei Runden lang. Ein klickbarer Prototyp beantwortet dieselben Fragen in einer. Und weil er echter Code ist, ist er kein Wegwerf-Mockup — er *wird* die App.

Die zentrale Idee, die das ermöglicht: die App weiß nicht, woher ihre Daten kommen. Sie fragt einen **Port**; dahinter steckt ein austauschbarer **Adapter**. Für die Oberfläche ändert sich beim Backend-Wechsel **nichts**.

## Die Landkarte

```
Vertrieb/Workshop      Prototyp bauen       Prototyp abstimmen     Backend            Betrieb
─────────────────      ──────────────       ──────────────────     ───────            ───────
PRD + Konzepte    →    /prototype baut  →   Cloudflare-Link    →   Fork: Adapter  →   Kunden-App
(SharePoint)           Mock, localhost      (Mock-Daten,           tauschen           (Cloudflare
                                             Kunde klickt)                             oder Microsoft)
```

Es gibt **keine harte Übergabe** zwischen „Konzept" und „Entwicklung". Der Prototyp wächst im Fluss von ~70–75 % auf 100 %; wer gerade daran arbeitet, ist zweitrangig. Der Prozess ist bewusst personenungebunden.

## Die zwei Achsen

Alles hängt an genau zwei Schaltern, und sie sind **unabhängig** voneinander.

### Stage = welcher Git-Branch

Zwei Promotion-Pfade, **nicht** ein linearer Durchlauf:

```
Prototyp-Phase:  /prototype  →  prototype        (Feature-Checkpoints direkt auf prototype, dann eingefroren)
Übergabe:        /handoff:   prototype ─seed→ dev
Produkt-Phase:   feature/*  →  dev  →  main      (prototype eingefroren, aus dem Pfad raus)
```

`feature/*` und `dev` gibt es **nur in der Produkt-Phase**.

| Branch | Bedeutung |
| --- | --- |
| `feature/*` | Arbeit an einem Feature, von `dev` abgezweigt. Kein Deploy. |
| `dev` | Mutable Testbasis. `/execute` merged hierher. Deployt auf `<slug>-dev`. |
| `prototype` | **Eingefroren** — der abgestimmte Stand, den der Kunde sieht. Deployt auf `<slug>-prototype`, immer Mock. |
| `main` | Produktion. Deployt auf `<slug>` — Cloudflare oder Power Platform, je nach Backend. |

### Backend = woher die Daten kommen

Steht in [`.unitix/project.json`](../.unitix/project.json) — **die** Wahrheit dieser Achse:

| Backend | Bedeutung |
| --- | --- |
| `mock` | Erfundene Daten aus dem Seed. Kein Backend. Default eines frischen Templates. |
| `supabase` | Postgres + RLS + Auth, bleibt auf Cloudflare. **Strategisch der Haupt-Weg.** |
| `dataverse` | Microsoft Power Platform Code App. |

Neue Projekte entstehen als Code Apps; Canvas Apps laufen aus (sie sind nicht KI-ready). Produktiv geht die Richtung „mehr Supabase, weniger Power Platform" — Bestehendes wird selektiv migriert, nicht per Hauruck.

## Der Fork ist eine Datei

Wenn der Kunde OK sagt, wird aus dem Prototyp die echte App. Das ist **kein Neubau** — es wird ein Adapter getauscht:

```
src/data/index.ts        ← der eine Swap-Punkt
src/data/ports/          ← Interfaces + Query-Vertrag. Ändern sich nicht mehr AM FORK.
src/data/adapters/
    mock/                ← Seed-Daten
    supabase/            ← echtes Backend
    dataverse/           ← echtes Backend
```

Die Regel, die das zusammenhält: **UI und Hooks sprechen nur den Port an (`@/data`), nie einen Adapter** — mechanisch erzwungen über ESLint-Boundaries. Die Domain-Typen in `src/domain/` sind der Vertrag: eine Entität = eine künftige Tabelle. Backend-Naming lebt ausschließlich im Adapter.

Damit das trägt, muss der Port **alles** können, was ein echtes Backend später können soll — deshalb laufen Filtern, Sortieren und Paginieren schon im Mock-Prototyp serverseitig durch `list()`. Würde man sie erst am Fork nachrüsten, wäre der Fork keine Datei, sondern eine Signatur-Änderung an Port, allen Adaptern, allen Hooks und jeder Listen-UI. Was eine Entität dafür deklariert: [`prototype-patterns.md`](../.claude/docs/prototype-patterns.md) → Data-Seam.

Details: [`prototype-manifest.md`](prototype-manifest.md)

## Der Command-Flow

Kundenprojekte laufen in zwei Phasen:

```
Prototyp-Phase:  /prototype <projektordner>   → baut den Mock-Prototyp autonom → prototype-Branch
                                              → Cloudflare → Kunde OK → prototype eingefroren
Übergabe:        /handoff                     → seedet dev aus dem eingefrorenen prototype
Produkt-Phase:   /plan <slug>                 → Interview + Plan-File + feature/-Branch (von dev)
                 /execute <plan>              → committet pro Phase, PR gegen dev, merged autonom
                 /ship                        → Promotion dev → main (der eine gegatete Schritt)
```

Am Tooling selbst (`code-apps-template` / `code-apps-context`) gibt es keine Command-Kette: dort wird direkt auf `main` gearbeitet.

Kanonische Beschreibung: [`.claude/CLAUDE.md`](../.claude/CLAUDE.md).

## Die Regeln — und wo sie stehen

**Vor jedem Task liest die KI zwei Dateien immer** und **genau eine** backend-abhängig:

| Immer | bei `mock` | bei `supabase` | bei `dataverse` |
| --- | --- | --- | --- |
| [`naming-conventions.md`](../.claude/docs/naming-conventions.md) | [`prototype-patterns.md`](../.claude/docs/prototype-patterns.md) | [`supabase-patterns.md`](../.claude/docs/supabase-patterns.md) | [`code-app-patterns.md`](../.claude/docs/code-app-patterns.md) |
| [`lean-coding.md`](../.claude/docs/lean-coding.md) | Mock ok, `fetch` ok | **RLS Pflicht** | CSP, Dataverse-only |

Der teure Fehler ist der **falsche Regelsatz**: Supabase-Code in eine CSP-gesperrte Code App bauen, oder einen gesunden Prototyp rot flaggen. Deshalb hängt der Regelsatz am expliziten `backend`-Feld, nie am Branch.

**DB-Naming ist systemabhängig** — kein Versehen, sondern Beschluss:

| | Supabase / SQL | Dataverse / Canvas |
| --- | --- | --- |
| Tabelle | `service_tickets` (snake_case, plural, **kein** Präfix) | `unitix_tblServiceTicket` |
| Spalte | `customer_name` (**kein** Datentyp-Präfix) | `strCustomerName` |

Grund: SQL kennt keine Case-Sensitivity, und der Datentyp steht im Schema — ein Präfix dupliziert ihn nur. Bei Canvas Apps ist er sichtbar sinnvoll, weil der Typ im Code fehlt.

**Was ESLint hart erzwingt** ([`eslint.config.js`](../eslint.config.js)): kein `fetch` außerhalb von Adaptern · kein `localStorage`/`sessionStorage` · kein `BrowserRouter`, kein Next.js/SSR · max. 300 Zeilen pro Datei · Layer-Grenzen (Feature → Port → Adapter → Domain) · Rules of Hooks.

**Design:** ausschließlich Design-Tokens + die shadcn-Komponenten in `src/shared/components/ui/`. **Kein eigenes CSS-File, keine Inline-Farben.** Tokens (oklch) leben in [`src/index.css`](../src/index.css), das Inventar in [`COMPONENTS.md`](../COMPONENTS.md).

## Teilen und Deployen

- **Wir entwickeln auf localhost** (`pnpm dev`) und machen dort den internen Review — nicht über einen Deploy.
- **Der Kunde stimmt auf Cloudflare ab**, auf dem Deploy des `prototype`-Branches — immer noch Mock-Daten.
- **Der Link entsteht über GitHub Actions**, ausgelöst durch eine Promotion auf `prototype`. Nicht jeder Commit deployt — Build-Minuten sind ein echtes Budget.

Details, Secrets und die drei Umgebungen: [`hosting.md`](hosting.md).

## Wann ist der Prototyp fertig?

Wenn er das PRD abdeckt, die fünf Pflicht-Zustände zeigt (Laden, Leer, Fehler, 404, Confirm-vor-Löschen) und der Kunde OK sagt. Die vollständige Checkliste: [`prototype-patterns.md` → Definition of Done](../.claude/docs/prototype-patterns.md#definition-of-done).
