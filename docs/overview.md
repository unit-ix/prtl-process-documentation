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

Alles hängt an zwei Schaltern — aber nur einer davon ist eine Projekt-Eigenschaft.

### Umgebung = wohin deployt wird

**Kein Branch.** Es gibt `main` und kurzlebige `feature/*`; welche Umgebung getroffen wird, sagt das Deploy-Kommando:

```
main ──●────●────●────●────●──▶     jeder Merge ist Dev-fähig
       │                   │
       └─Tag prototype-ok  └─Tag prod-2026-09-01  (pnpm deploy:prod)
```

| Ziel | Kommando | Rolle |
| --- | --- | --- |
| Mock-Prototyp | `pnpm deploy:cloudflare` | Der Stand, den der Kunde abstimmt. Tag `prototype-ok` markiert das OK. |
| Azure-Dev | `pnpm deploy:dev` | Testumgebung. Hier testet das Team, hier hängt auch die lokale Entwicklung dran. |
| Azure-Prod | `pnpm deploy:prod` | Produktion. Der einzige gegatete Schritt, Tag `prod-YYYY-MM-DD`. |

`feature/*` deployt nie. Warum ein Branch-Modell hier nicht trägt, und was Dev und Prod teilen: [`environments.md`](environments.md).

### Plattform = woher die Daten kommen und wo es liegt

Steht in [`.unitix/project.json`](../.unitix/project.json) — **die** Wahrheit dieser Achse:

| `platform` | Bedeutung | Host |
| --- | --- | --- |
| `mock` | Erfundene Daten aus dem Seed. Kein Backend. Default eines frischen Templates. | Cloudflare Pages |
| `azure` | Eigene Node-API + PostgreSQL + Entra ID. **Strategisch der Haupt-Weg.** | Azure Static Web Apps |
| `powerapps` | Microsoft Power Platform Code App auf Dataverse. | Power Platform |

Ein Feld, nicht zwei: die Zuordnung Plattform → Host ist 1:1 und von den Regelsätzen erzwungen.

Neue Projekte entstehen als Code Apps; Canvas Apps laufen aus (sie sind nicht KI-ready). Produktiv geht die Richtung „mehr Azure, weniger Power Platform" — Bestehendes wird selektiv migriert, nicht per Hauruck.

## Der Fork ist eine Datei

Wenn der Kunde OK sagt, wird aus dem Prototyp die echte App. Das ist **kein Neubau** — es wird ein Adapter getauscht:

```
apps/web/src/data/index.ts        ← der eine Swap-Punkt
apps/web/src/data/ports/          ← Interfaces + Query-Vertrag. Ändern sich nicht mehr AM FORK.
apps/web/src/data/adapters/
    mock/                ← Seed-Daten
    azure/               ← echtes Backend (eigene API + MSAL)
    dataverse/           ← echtes Backend (Power Platform Code App)
```

Die Regel, die das zusammenhält: **UI und Hooks sprechen nur den Port an (`@/data`), nie einen Adapter** — mechanisch erzwungen über ESLint-Boundaries. Die Domain-Typen in `apps/web/src/domain/` sind der Vertrag: eine Entität = eine künftige Tabelle. Backend-Naming lebt ausschließlich im Adapter.

Damit das trägt, muss der Port **alles** können, was ein echtes Backend später können soll — deshalb laufen Filtern, Sortieren und Paginieren schon im Mock-Prototyp serverseitig durch `list()`. Würde man sie erst am Fork nachrüsten, wäre der Fork keine Datei, sondern eine Signatur-Änderung an Port, allen Adaptern, allen Hooks und jeder Listen-UI. Was eine Entität dafür deklariert: [`patterns-prototype.md`](../.claude/docs/patterns-prototype.md) → Data-Seam.

Details: [`prototype-manifest.md`](prototype-manifest.md)

## Der Command-Flow

Kundenprojekte laufen in zwei Phasen:

```
/prototype <projektordner>   → baut den Mock-Prototyp autonom, committet auf main
                             → pnpm deploy:cloudflare → Kunde OK → Tag prototype-ok
/plan <slug>                 → Interview + Plan-File + feature/-Branch (von main)
/execute <plan>              → committet pro Phase, PR gegen main, merged autonom
pnpm deploy:dev              → Azure-Dev, hier testet das Team
pnpm deploy:prod             → Produktion. Der eine gegatete Schritt — ein Script, kein Command.
```

Am Tooling selbst (`code-apps-template` / `code-apps-context`) gibt es keine Command-Kette: dort wird direkt auf `main` gearbeitet.

Kanonische Beschreibung: [`.claude/CLAUDE.md`](../.claude/CLAUDE.md).

## Die Regeln — und wo sie stehen

**Vor jedem Task liest die KI zwei Dateien immer** und **genau eine** plattform-abhängig:

| Immer | bei `mock` | bei `azure` | bei `powerapps` |
| --- | --- | --- | --- |
| [`naming-conventions.md`](../.claude/docs/naming-conventions.md) | [`patterns-prototype.md`](../.claude/docs/patterns-prototype.md) | [`patterns-azure.md`](../.claude/docs/patterns-azure.md) | [`patterns-code-app.md`](../.claude/docs/patterns-code-app.md) |
| [`lean-coding.md`](../.claude/docs/lean-coding.md) | Mock ok, `fetch` ok | **Entra-JWT Pflicht**, Managed Identity | CSP, Dataverse-only |

Der teure Fehler ist der **falsche Regelsatz**: eine `fetch`-basierte Azure-Architektur in eine CSP-gesperrte Code App bauen, oder einen gesunden Prototyp rot flaggen. Deshalb hängt der Regelsatz am expliziten `platform`-Feld, nie am Branch.

**DB-Naming ist systemabhängig** — kein Versehen, sondern Beschluss:

| | Azure / PostgreSQL | Dataverse / Canvas |
| --- | --- | --- |
| Tabelle | `service_tickets` (snake_case, plural, **kein** Präfix) | `unitix_tblServiceTicket` |
| Spalte | `customer_name` (**kein** Datentyp-Präfix) | `strCustomerName` |

Grund: SQL kennt keine Case-Sensitivity, und der Datentyp steht im Schema — ein Präfix dupliziert ihn nur. Bei Canvas Apps ist er sichtbar sinnvoll, weil der Typ im Code fehlt.

**Was ESLint hart erzwingt** ([`eslint.config.js`](../eslint.config.js)): kein `fetch` außerhalb von Adaptern · kein `localStorage`/`sessionStorage` · kein `BrowserRouter`, kein Next.js/SSR · max. 300 Zeilen pro Datei · Layer-Grenzen (Feature → Port → Adapter → Domain) · Rules of Hooks.

**Design:** ausschließlich Design-Tokens + die shadcn-Komponenten in `apps/web/src/shared/components/ui/`. **Kein eigenes CSS-File, keine Inline-Farben.** Tokens (oklch) leben in [`apps/web/src/index.css`](../apps/web/src/index.css), das Inventar in [`COMPONENTS.md`](../COMPONENTS.md).

## Teilen und Deployen

- **Wir entwickeln auf localhost** (`pnpm dev`) und machen dort den internen Review — nicht über einen Deploy.
- **Der Kunde stimmt auf Cloudflare ab** — immer noch Mock-Daten.
- **Der Link entsteht über GitHub Actions** auf `main`. Kein PR und kein `feature/*` deployt — Build-Minuten sind ein echtes Budget.
- **Nach dem Azure-Fork** übernimmt `pnpm deploy:dev` / `pnpm deploy:prod`.

Cloudflare-Details und Secrets: [`hosting.md`](hosting.md). Die Azure-Umgebungen: [`environments.md`](environments.md).

## Wann ist der Prototyp fertig?

Wenn er das PRD abdeckt, die fünf Pflicht-Zustände zeigt (Laden, Leer, Fehler, 404, Confirm-vor-Löschen) und der Kunde OK sagt. Die vollständige Checkliste: [`patterns-prototype.md` → Definition of Done](../.claude/docs/patterns-prototype.md#definition-of-done).
