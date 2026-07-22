# Vom Kundengespräch zur fertigen App

> Das Handbuch zum Prototype-First Golden Template — der rote Faden in ~10 Minuten.
> **Dieses Dokument dupliziert keine Regeln.** Es zeigt, wie die Teile zusammenhängen, und verlinkt
> die kanonischen Quellen. Bei Widerspruch gewinnt immer die verlinkte Quelle, nie diese Seite.
> Visuelle Fassung für Meetings: [`overview.html`](overview.html) (gleicher Inhalt).

---

## Worum es geht

Wir bauen **zuerst einen klickbaren Prototyp**, nicht zuerst ein Backend. Er arbeitet mit erfundenen
Daten (kein Backend) — **wir entwickeln ihn auf localhost** (`pnpm dev`), und für die **Abstimmung mit
dem Kunden liegt er auf Cloudflare** (immer noch Mock-Daten, standardmäßig auf unserem UNIT-IX-Tenant,
beim Kunden nur wenn schon entschieden). **Erst nach dem OK** bekommt er ein echtes Backend — der Umzug
geht von der Cloudflare-Fassung aus.

Warum: Ein Konzept auf Papier diskutiert man drei Runden lang. Ein klickbarer Prototyp beantwortet
dieselben Fragen in einer. Und weil er echter Code ist, ist er kein Wegwerf-Mockup — er *wird* die App.

Die zentrale Idee, die das ermöglicht: die App weiß nicht, woher ihre Daten kommen. Sie fragt einen
**Port**; dahinter steckt ein austauschbarer **Adapter**. Am Anfang liefert der Mock-Adapter erfundene
Daten, später ein echtes Backend. Für die Oberfläche ändert sich dabei **nichts**.

---

## Die Landkarte

```
Vertrieb/Workshop      Prototyp bauen       Prototyp abstimmen     Backend            Betrieb
─────────────────      ──────────────       ──────────────────     ───────            ───────
PRD + Konzepte    →    /prototype baut  →   Cloudflare-Link    →   Fork: Adapter  →   Kunden-App
(SharePoint)           Mock, localhost      (Mock, UNIT-IX-        tauschen           (Cloudflare
                       (unsere Dev)          Tenant)               ↓                   oder Microsoft)
                                             ↓                     Datenmodell
                                             Kunde klickt,         wird technisch
                                             gibt Feedback
```

Es gibt **keine harte Übergabe** zwischen „Konzept" und „Entwicklung". Der Prototyp wächst im Fluss
von ~70–75 % auf 100 % — wer gerade daran arbeitet, ist zweitrangig. Der Prozess ist bewusst
**personenungebunden** beschrieben.

---

## Die zwei Achsen

Alles im Template hängt an genau zwei Schaltern. Sie sind **unabhängig** voneinander.

### Stage = welcher Git-Branch

Zwei Promotion-Pfade, **nicht** ein linearer Durchlauf:

```
Prototyp-Phase:  feature/*  →  dev  →  prototype     (Cloudflare, Kunden-Abstimmung, dann eingefroren)
Produkt-Phase:   feature/*  →  dev  →  main          (prototype eingefroren, aus dem Pfad raus)
```

| Branch | Bedeutung |
| --- | --- |
| `feature/*` | Arbeit an einem Feature (von `dev` abgezweigt). Kein Deploy. |
| `dev` | Mutable Testbasis. `/execute` merged hierher. Kein Deploy. |
| `prototype` | **Eingefroren** — der abgestimmte Stand, den der Kunde sieht. In der Produkt-Phase **aus dem Pfad raus** (bewusst übersprungen). **Nur hier wird deployt** (Stand heute — ein `main`-Deploy-Trigger ist Folge-Arbeit). |
| `main` | Produktion. Je nach Ziel mit Cloudflare **oder** Microsoft verbunden. |

### Target = woher die Daten kommen

Steht in [`.unitix/project.json`](../.unitix/project.json) — **die** Wahrheit dieser Achse:

| Target | Bedeutung |
| --- | --- |
| `mock` | Erfundene Daten aus dem Seed. Kein Backend. Der Default eines frischen Templates. |
| `supabase` | Postgres + RLS + Auth. Bleibt auf Cloudflare. **Strategisch der Haupt-Weg.** |
| `dataverse` | Microsoft Power Platform Code App. |

> **Richtung (Stand 2026-07-17):** Neue Projekte entstehen als Code Apps, Canvas Apps laufen aus
> (~95 %, keine harte Deadline — sie sind nicht KI-ready). Produktiv geht es Richtung „mehr Supabase,
> weniger Power Platform". Bestehendes wird **selektiv** migriert, nicht per Hauruck. Azure ist bewusst
> **kein** Bestandteil des Templates — es ist das Compliance-Argument („gleiche Leistung, ca. 100–150 EUR/Monat")
> und belegt, dass wir nicht an einen Hersteller gekettet sind.

---

## Der Fork ist eine Datei

Wenn der Kunde OK sagt, wird aus dem Prototyp die echte App. Das ist **kein Neubau** — es wird ein
Adapter getauscht:

```
src/data/index.ts        ← der eine Swap-Punkt
src/data/ports/          ← Interfaces. Ändern sich nie.
src/data/adapters/
    mock/                ← Seed-Daten
    supabase/            ← echtes Backend
    dataverse/           ← echtes Backend
```

Die Regel, die das zusammenhält: **UI und Hooks sprechen nur den Port an (`@/data`), nie einen Adapter.**
Das ist mechanisch erzwungen (ESLint-Boundaries) — nicht nur eine Bitte.

Die Domain-Typen in `src/domain/` sind der Vertrag: eine Entität = eine künftige Tabelle. Stimmen sie,
fällt das Backend-Schema später mechanisch heraus. Backend-Naming lebt **nur** im Adapter.

Details: [`prototype-manifest.md`](prototype-manifest.md)

---

## Der Command-Flow

Es gibt **zwei Spuren**. Welche gilt, hängt am Repo, nicht am Gefühl.

### Kundenprojekt — zwei Phasen

```
Prototyp-Phase (Consultant):
/prototype <projektordner>   → baut den Mock-Prototyp autonom → prototype-Branch
                               → Cloudflare → Kunde OK → prototype eingefroren

Übergabe:
/handoff                     → seedet dev aus dem eingefrorenen prototype (einmalig)

Produkt-Phase (Developer):
/plan <slug>                 → Interview + Plan-File + feature/-Branch (von dev)
/execute <plan>              → Autopilot-Default: committet nach jeder Phase, pusht
                               auf Draft-PR gegen dev, merged am Ende autonom → dev
                               (Autopilot: false → Per-Phasen-Stopp)
# Tests laufen auf dev
/ship                        → Produktions-Promotion dev → main (gegatet)
```

`/commit` ist **kein** Customer-Schritt mehr — `/execute` committet selbst.

### Werkzeug-Repo (`code-apps-template` / `code-apps-context`)

```
/dev-plan <slug>     → lean, kein Interview, kein Branch
/dev-execute <plan>  → arbeitet ab + committet + pusht direkt auf main. Kein PR.
```

Kanonische Beschreibung: [`.claude/CLAUDE.md`](../.claude/CLAUDE.md) → „Workflow-Skills".

---

## Die Regeln — und wo sie stehen

**Vor jedem Task liest die KI zwei Dateien immer** und **genau eine** target-abhängig:

| Immer | Zusätzlich bei `mock` | bei `supabase` | bei `dataverse` |
| --- | --- | --- | --- |
| [`naming-conventions.md`](../.claude/docs/naming-conventions.md) | [`prototype-patterns.md`](../.claude/docs/prototype-patterns.md) | [`supabase-patterns.md`](../.claude/docs/supabase-patterns.md) | [`code-app-patterns.md`](../.claude/docs/code-app-patterns.md) |
| [`lean-coding.md`](../.claude/docs/lean-coding.md) | Mock ok, `fetch` ok | **RLS Pflicht** | CSP, Dataverse-only |

Der teure Fehler ist der **falsche Regelsatz**: Supabase-Code in eine CSP-gesperrte Code App bauen, oder
einen gesunden Prototyp rot flaggen. Deshalb hängt der Regelsatz am expliziten `target`-Feld — nie am Branch.

**DB-Naming ist systemabhängig** (kein Versehen, sondern Beschluss):

| | Supabase / SQL | Dataverse / Canvas |
| --- | --- | --- |
| Tabelle | `service_tickets` (snake_case, plural, **kein** Präfix) | `unitix_tblServiceTicket` |
| Spalte | `customer_name` (**kein** Datentyp-Präfix) | `strCustomerName` |

Begründung: SQL kennt keine Case-Sensitivity, und der Datentyp steht im Schema — ein Präfix dupliziert
ihn nur. Bei Canvas Apps ist er sichtbar sinnvoll, weil der Typ im Code fehlt.

**Was ESLint hart erzwingt** (`pnpm lint`, siehe [`eslint.config.js`](../eslint.config.js)):
kein `fetch` außerhalb von Adaptern · kein `localStorage`/`sessionStorage` · max. **300 Zeilen** pro Datei ·
Layer-Grenzen (Feature → Port → Adapter → Domain) · Rules of Hooks.

**Design:** ausschließlich Design-Tokens + die shadcn-Komponenten in `src/shared/components/ui/`.
**Kein eigenes CSS-File, keine Inline-Farben.** Tokens (oklch) leben in [`src/index.css`](../src/index.css).

---

## Teilen und Deployen

- **Wir entwickeln auf localhost** (`pnpm dev`) und machen dort unseren internen Review — nicht über einen Deploy.
- **Der Kunde stimmt auf Cloudflare ab.** Der abgestimmte Stand liegt auf dem `prototype`-Branch, deployt
  auf Cloudflare (Default UNIT-IX-Tenant, Kunden-Tenant wenn schon entschieden) — immer noch Mock-Daten.
- **Der Kunden-Link** entsteht über **GitHub Actions**, ausgelöst durch eine Promotion auf `prototype`.
  Nicht jeder Commit deployt — Build-Minuten sind ein echtes Budget.

> Der Deploy braucht Ollis Cloudflare-Token (siehe „Noch offen"). **Bis der da ist**, ist das Kunden-Artefakt
> interimsweise der lokale `pnpm dev` + der PDF-Report; der Cloudflare-Link wird eingesteckt, sobald der Token steht.

Details, Secrets und warum es *nicht* der Dashboard-Weg (git-connect) ist: [`hosting.md`](hosting.md).

---

## Wann ist der Prototyp fertig?

Kurzfassung: wenn er das PRD abdeckt, die fünf Pflicht-Zustände zeigt (Laden, Leer, Fehler, Erfolg,
Keine-Rechte) und der Kunde OK sagt. Ab dann darf das Backend dran.

Die belastbaren Fertig-Kriterien und das Go-Gate vor dem großen `/prototype`-Lauf sind **noch in Arbeit**
(Team-Aufgabe, Stand 2026-07-17). Die DoD-Checkliste im Detail: [`prototype-patterns.md`](../.claude/docs/prototype-patterns.md).

---

## Noch offen

| Thema | Stand |
| --- | --- |
| Cloudflare-Token + Account-ID | bei Olli — einziger Blocker für den echten Cloudflare-Link. Bis dahin interim: localhost + PDF |
| Fertig-Kriterien + Go-Gate vor dem `/prototype`-Lauf | Team |
| Rollenname „Technical Consultant" + Verantwortungsbereich | Team |
| SharePoint-Live-Read (Pointer statt `docs/`-Snapshot; SharePoint-Master als Single Source of Truth) | geplant, eigene Runde |
| Automatischer Datenmodell-Sync | zurückgestellt |

---

## Diese Seite pflegen

`overview.md` ist die **Quelle** — hier wird editiert. `overview.html` ist die visuelle Fassung fürs
Meeting und wird **von Hand** nachgezogen (dieses Repo hat bewusst keinen HTML-Generator; der
SharePoint-Skill baut Kunden-Decks und ist hier nicht zuständig).

Wenn sich am Template etwas ändert — Commands, Architektur, Regelsätze, Branching, Hosting —, gehört
die betroffene Stelle hier nachgezogen. **Kanonische Quellen gewinnen immer** gegen diese Seite:
[`.claude/CLAUDE.md`](../.claude/CLAUDE.md) · [`.claude/commands/*`](../.claude/commands/) ·
[`.claude/docs/prototype-first-architecture.md`](../.claude/docs/prototype-first-architecture.md) ·
[`eslint.config.js`](../eslint.config.js) · [`src/index.css`](../src/index.css) · [`hosting.md`](hosting.md).

Und die Regel, die dieses Dokument kurz hält: **nicht duplizieren, verlinken.** Eine Info, die hier und
in der kanonischen Quelle steht, ist eine Info, die irgendwann auseinanderläuft.
