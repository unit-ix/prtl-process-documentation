# Hosting — Prototyp teilen (Cloudflare Pages)

> **localhost-first bleibt der Default.** Entwickelt und reviewt wird am laufenden `pnpm dev` im Browser
> gegen den Mock-Adapter. Ein öffentlicher Link ist nur nötig, um den Prototyp mit dem Kunden zu teilen.
> Bis ein Cloudflare-Zugang existiert, ist das Morgen-Ergebnis der lokale Prototyp + der PDF-Report;
> der Link wird eingesteckt, sobald der Token da ist.

Es gibt **einen** automatisierten Weg: **GitHub Actions**. Der Deploy sitzt im Golden Template — Consultant
und Vertrieb klicken sich nie durchs Cloudflare-Dashboard.

## Der Deploy-Weg: GitHub Actions

Der Deploy-Job in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) baut und lädt den fertigen
`dist/`-Build via `wrangler` als Direct Upload hoch. Er ruft dafür [`scripts/deploy-prototype.mjs`](../scripts/deploy-prototype.mjs)
auf — dasselbe Script, das man auch lokal startet. **Eine Deploy-Logik, ein Slug, eine URL.**

Er ist **gegatet + standardmäßig aus** und läuft nur, wenn *beides* zutrifft:

- die **Repo-Variable** `CLOUDFLARE_DEPLOY_ENABLED == 'true'` ist gesetzt
  (Settings → *Secrets and variables* → *Actions* → *Variables*), **und**
- die Secrets `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` existieren.

Bis dahin ist der Job dokumentiert, aber **inert**.

**Nur `prototype` deployt.** `feature/*` und `dev` lösen nie einen Deploy aus, `main` auch nicht. `prototype`
ist der eingefrorene, gegatete Promotion-Branch — dorthin wird gebündelt promotet, nicht pro Commit gepusht.
Grund: GitHub Actions hat weniger Build-Minuten als Cloudflare, und die sind ein reales Budget (Beispiel aus
dem Team: ein Projekt mit 28 Deployments an einem Tag; zwei liegende Projekte hatten bereits 1/10 der Minuten
verbraucht). Erst in der CI fertig arbeiten, dann promoten. Der Job hat zusätzlich eine `concurrency`-Gruppe
mit `cancel-in-progress`, damit zwei schnelle Promotions nicht doppelt zählen.

### Warum nicht git-connect / Cloudflare Worker Builds

Der Dashboard-Weg (*Connect to Git*, push-to-deploy) sieht bequemer aus, **skaliert für uns aber nicht**: er
lässt sich **pro Cloudflare-Account/Org nur mit einem GitHub-Account verbinden**. Aus einer Agentur-Org heraus
ist er damit nicht in viele Kunden-Cloudflare-Accounts deploybar — und genau das ist der Normalfall. Es gibt
drei Ownership-Konstellationen, die alle funktionieren müssen:

1. Code + Cloudflare bei uns
2. Code bei uns, Cloudflare beim Kunden
3. Repo + Cloudflare beim Kunden

GitHub Actions läuft über Cloudflare-URL + API-Token (Env-Vars) und ist deshalb **an keinen Account gebunden** —
es bedient alle drei. Eine einheitliche Lösung schlägt eine Fallunterscheidung.

*(Entschieden im Hosting-Stack-Review 2026-07-17. Ersetzt den früheren Stand „git-connect ist der Dauerbetrieb,
Direct Upload der Interims-Pfad".)*

## Lokaler Ad-hoc-Deploy

Derselbe Weg, von Hand — für den schnellen Link zwischendurch:

```bash
pnpm build            # erzeugt dist/
pnpm deploy:prototype # = node scripts/deploy-prototype.mjs
```

- Ruft `pnpm dlx wrangler pages deploy dist --project-name=<slug>` auf (Direct Upload).
- **Legt das Pages-Projekt vorher explizit an** und toleriert ein bereits existierendes. (`wrangler` würde ein
  fehlendes Projekt beim Deploy nur *interaktiv* anlegen — in CI failt sonst der allererste Lauf.)
- **Projektname** (`--project-name`): Priorität `Argument` > `.unitix/project.json` (`name`) > `package.json`
  (`name`), auf einen gültigen Cloudflare-Slug normalisiert (`a-z0-9-`, max. 58, kein führender/abschließender
  Bindestrich). `.unitix/project.json` ist die vorgesehene Quelle — damit CI und lokal **denselben** Slug treffen.
- **Fail loud:** fehlt `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` oder `dist/`, bricht das Script mit
  klarer Meldung ab.

## Benötigte Secrets

| Variable | Quelle | Scope |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | Cloudflare-Dashboard → *My Profile* → *API Tokens* | **Account > Cloudflare Pages > Edit** (minimal) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare-Dashboard, rechte Sidebar | — |

Beide Namen liest `wrangler` **nativ** — deshalb genau diese Schreibweise, kein Durchreichen nötig.

Wer provisioniert: **Olli**. Lokal als Umgebungsvariablen setzen (nicht committen), in CI als **Repository
Secrets**. Das ist der einzige verbliebene Blocker für den ersten echten Deploy.

## Voraussetzung: das Template ist eine SPA

Der Deploy lädt ein **statisches `dist/`** hoch. Das Golden Template **ist** per Design eine SPA — der
HashRouter-Pin ist ein irreversibler Constraint (Pflicht für den späteren Dataverse-iframe, funktioniert auf
Cloudflare, macht `_redirects` überflüssig).

**SSR-Projekte laufen nicht über diesen Pfad.** Bestehende Prototypen auf TanStack Router/SSR (z. B. reikan)
sind ausdrücklich **Wegwerf-Referenz für Konzepte, kein Migrationsziel** — sie sind keine Golden-Template-Projekte.
Das ist eine bewusste Grenze, kein Bug: der Deploy wird nicht für einen Nicht-Template-Fall verbogen.

## Pricing

- **Cloudflare Pages:** für unseren Bedarf **kostenlos** — unbegrenzte statische Requests/Bandwidth, kein
  Bandbreiten-Bill-Shock. Das Free-Tier erlaubt **kommerzielle Nutzung** (Vercel verbietet sie).
- **Supabase:** ca. **25 USD/Monat** (Pro-Tier), sobald ein echtes Backend dranhängt.
- Direct Upload verbraucht **keine** Cloudflare-Build-Minuten — gebaut wird in der GitHub-CI, hochgeladen wird
  nur `dist/`. Das relevante Minuten-Budget ist deshalb das von **GitHub Actions** (siehe oben).

## Was gehört wohin

- **Entwicklung/Review:** `pnpm dev` (localhost), nie über einen Deploy.
- **Kunden-Link:** GitHub Actions, ausgelöst durch eine Promotion auf `prototype`.
- **Link zwischendurch:** `pnpm deploy:prototype` lokal — gleiche Logik, gleicher Slug, gleiche URL.
- **Power-Platform-Toolchain** (`npx power-apps …`) ist erst am `dataverse`-Fork relevant — für den
  Mock-Prototyp nie.
