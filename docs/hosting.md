# Hosting — Prototyp, Testumgebung & Produktion (Cloudflare Pages)

> **localhost-first für die Entwicklung.** Entwickelt und **intern** reviewt wird am laufenden `pnpm dev` gegen den Mock-Adapter, nicht über einen Deploy. Die **Kunden-Abstimmung** läuft dagegen auf dem Cloudflare-Deploy des `prototype`-Branches (weiterhin Mock-Daten) — das ist der Regelfall, nicht die Ausnahme.

Es gibt **einen** automatisierten Weg: **GitHub Actions**. Der Deploy sitzt im Golden Template — niemand klickt sich durchs Cloudflare-Dashboard.

## Der Deploy-Weg

Der Deploy-Job in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) baut und lädt den fertigen `apps/web/dist/`-Build via `wrangler` als Direct Upload hoch. Er ruft dafür [`scripts/deploy.mjs`](../scripts/deploy.mjs) auf — dasselbe Script, das man auch lokal startet. **Eine Deploy-Logik**; welches Cloudflare-Projekt getroffen wird, bestimmt der Branch (`--branch=${{ github.ref_name }}`, lokal der aktuelle Checkout).

Er ist **gegatet und standardmäßig aus** und läuft nur, wenn *beides* zutrifft:

- die **Repo-Variable** `CLOUDFLARE_DEPLOY_ENABLED == 'true'` ist gesetzt (Settings → *Secrets and variables* → *Actions* → *Variables*), **und**
- die Secrets `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` existieren.

Bis dahin ist der Job dokumentiert, aber inert.

## Drei Umgebungen, `feature/*` nie

Pro Kundenprojekt gibt es **drei** Cloudflare-Pages-Projekte, je Branch eines:

| Branch | Cloudflare-Projekt | Rolle | Deployt? |
| --- | --- | --- | --- |
| `prototype` | `<slug>-prototype` | Eingefrorene Kunden-Referenz (immer Mock) | **Immer** |
| `dev` | `<slug>-dev` | Testumgebung — hier testet das Team | **backend-aware** |
| `main` | `<slug>` | Produktion | **backend-aware** |
| `feature/*` | — | Feature-Arbeit | **Nie** |

**backend-aware** heißt: `prototype` ist per Definition Mock und deployt immer auf Cloudflare. Für `dev`/`main` liest das Script `.unitix/project.json` → `backend`: bei `mock`/`supabase` deployt es auf Cloudflare, bei `dataverse` läuft die App **in Power Platform** — dann überspringt das Script den Cloudflare-Deploy sauber (exit 0, kein CI-Fehler; der Power-Platform-Deploy ist eigene Folge-Arbeit).

**Build-Minuten sind ein reales Budget.** GitHub Actions hat weniger davon als Cloudflare. `feature/*` deployt deshalb nie — erst in der CI fertig arbeiten, dann auf einen Umgebungs-Branch promoten. `dev` deployt pro Merge, aber der Job hat je Branch eine `concurrency`-Gruppe mit `cancel-in-progress`, sodass zwei schnelle Pushes nicht doppelt zählen.

## Warum nicht git-connect

Der Dashboard-Weg (*Connect to Git*, push-to-deploy) sieht bequemer aus, **skaliert für uns aber nicht**: er lässt sich pro Cloudflare-Account/Org nur mit **einem** GitHub-Account verbinden. Aus einer Agentur-Org heraus ist er damit nicht in viele Kunden-Cloudflare-Accounts deploybar — und genau das ist der Normalfall. Drei Ownership-Konstellationen müssen alle funktionieren:

1. Code + Cloudflare bei uns
2. Code bei uns, Cloudflare beim Kunden
3. Repo + Cloudflare beim Kunden

GitHub Actions läuft über Cloudflare-URL + API-Token (Env-Vars) und ist deshalb **an keinen Account gebunden** — es bedient alle drei. Eine einheitliche Lösung schlägt eine Fallunterscheidung.

## Lokaler Ad-hoc-Deploy

```bash
pnpm build               # erzeugt apps/web/dist/
pnpm deploy              # = node scripts/deploy.mjs — Umgebung = aktueller Git-Branch
pnpm deploy -- --env=dev # oder explizit (prototype|dev|main)
```

- Ruft `pnpm dlx wrangler pages deploy apps/web/dist --project-name=<projekt>` auf (Direct Upload).
- Die **Umgebung** (`--env=` / `--branch=` / aktueller Branch) bestimmt Ziel-Projekt und production-branch. `feature/*` deployt nicht.
- **Legt das Pages-Projekt vorher explizit an** und toleriert ein bereits existierendes — `wrangler` würde ein fehlendes Projekt beim Deploy nur *interaktiv* anlegen, sonst failt der allererste CI-Lauf.
- **Basis-Slug** (`--project-name`): Priorität `Argument` > `.unitix/project.json` (`name`) > `package.json` (`name`), normalisiert auf einen gültigen Cloudflare-Slug (`a-z0-9-`, max. 58, kein führender/abschließender Bindestrich). Das Umgebungs-Suffix hängt das Script an. `.unitix/project.json` ist die vorgesehene Quelle, damit CI und lokal **denselben** Slug treffen.
- **Fail loud:** fehlt bei einem tatsächlichen Deploy `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` oder `apps/web/dist/`, bricht das Script mit klarer Meldung ab.

## Benötigte Secrets

| Variable | Quelle | Scope |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | Cloudflare-Dashboard → *My Profile* → *API Tokens* | **Account > Cloudflare Pages > Edit** (minimal) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare-Dashboard, rechte Sidebar | — |

`wrangler` liest beide Namen **nativ** — deshalb genau diese Schreibweise, kein Durchreichen nötig. Lokal als Umgebungsvariablen setzen (nicht committen), in CI als **Repository Secrets**.

## Voraussetzung: das Template ist eine SPA

Der Deploy lädt ein **statisches `apps/web/dist/`** hoch. Das Golden Template **ist** per Design eine SPA — der HashRouter ist ein irreversibler Constraint (Pflicht für den späteren Dataverse-iframe, funktioniert auf Cloudflare, macht `_redirects` überflüssig) und mechanisch über ESLint erzwungen.

**SSR-Projekte laufen nicht über diesen Pfad.** Bestehende Prototypen auf TanStack Router/SSR sind Wegwerf-Referenz für Konzepte, kein Migrationsziel — sie sind keine Golden-Template-Projekte. Das ist eine bewusste Grenze: der Deploy wird nicht für einen Nicht-Template-Fall verbogen.

## Pricing

- **Cloudflare Pages:** für unseren Bedarf **kostenlos** — unbegrenzte statische Requests/Bandwidth, kein Bandbreiten-Bill-Shock. Das Free-Tier erlaubt **kommerzielle Nutzung** (Vercel verbietet sie).
- **Supabase:** ca. **25 USD/Monat** (Pro-Tier), sobald ein echtes Backend dranhängt.
- Direct Upload verbraucht **keine** Cloudflare-Build-Minuten — gebaut wird in der GitHub-CI, hochgeladen wird nur `apps/web/dist/`. Das relevante Budget ist deshalb das von GitHub Actions.

## Was gehört wohin

| Zweck | Wo |
| --- | --- |
| Entwicklung + interner Review | `pnpm dev` (localhost), nie über einen Deploy |
| Kunden-Abstimmung | Cloudflare-Deploy von `prototype` (`<slug>-prototype`) |
| Team-Test der Produkt-Phase | Cloudflare-Deploy von `dev` (`<slug>-dev`); bei `dataverse` stattdessen Power Platform |
| Produktion | Deploy von `main` (`<slug>`) — backend-aware |
| Link zwischendurch | `pnpm deploy` lokal, gleiche Logik |

Die Power-Platform-Toolchain (`npx power-apps …`) ist erst am `dataverse`-Fork relevant — für den Mock-Prototyp nie.
