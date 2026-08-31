# Hosting — der Mock-Prototyp auf Cloudflare Pages

> **Gilt bei `platform: mock`.** Der Host des Mock-Prototyps. Die Azure-Umgebungen (`platform: azure`)
> stehen in [`environments.md`](environments.md), das Azure-Setup in [`azure-runbook.md`](azure-runbook.md).
>
> **localhost-first für die Entwicklung.** Entwickelt und **intern** reviewt wird am laufenden `pnpm dev` gegen den Mock-Adapter, nicht über einen Deploy. Die **Kunden-Abstimmung** läuft dagegen auf dem Cloudflare-Deploy von `main` (weiterhin Mock-Daten) — das ist der Regelfall, nicht die Ausnahme.

Es gibt **einen** automatisierten Weg: **GitHub Actions**. Der Deploy sitzt im Golden Template — niemand klickt sich durchs Cloudflare-Dashboard.

## Der Deploy-Weg

Der Deploy-Job in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) baut und lädt den fertigen `apps/web/dist/`-Build via `wrangler` als Direct Upload hoch. Er ruft dafür [`scripts/deploy-cloudflare.mjs`](../scripts/deploy-cloudflare.mjs) auf — dasselbe Script, das man auch lokal startet. **Eine Deploy-Logik** — und genau ein Cloudflare-Projekt, `<slug>`.

**Ein Script pro Host**, benannt nach dem Host:

| Befehl | Script | Ziel |
| --- | --- | --- |
| `pnpm deploy:cloudflare` | [`scripts/deploy-cloudflare.mjs`](../scripts/deploy-cloudflare.mjs) | SPA → Cloudflare Pages (dieses Dokument) |
| `pnpm deploy:dev` / `pnpm deploy:prod` | [`scripts/deploy-azure.mjs`](../scripts/deploy-azure.mjs) | Migrationen + Node-API + SPA → Azure ([`environments.md`](environments.md)) |

Welchen Host ein Projekt hat, sagt `.unitix/project.json` → `platform` — die Scripts prüfen es selbst (siehe host-aware unten).

Er ist **gegatet und standardmäßig aus** und läuft nur, wenn *beides* zutrifft:

- die **Repo-Variable** `CLOUDFLARE_DEPLOY_ENABLED == 'true'` ist gesetzt (Settings → *Secrets and variables* → *Actions* → *Variables*), **und**
- die Secrets `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` existieren.

Bis dahin ist der Job dokumentiert, aber inert.

## Eine Umgebung

Pro Kundenprojekt gibt es **ein** Cloudflare-Pages-Projekt, `<slug>`, deployt von `main`.

Ein Mock-Prototyp braucht keine zweite Umgebung: keine Datenbank, keine Anmeldung, nichts zu trennen. Der abgestimmte Stand wird mit dem Tag `prototype-ok` markiert statt mit einem eingefrorenen Branch und einem zweiten Pages-Projekt. Umgebungs-Trennung beginnt erst am Azure-Fork, und dort als Deploy-Ziel statt als Branch — [`environments.md`](environments.md).

**host-aware** heißt: das Script liest `.unitix/project.json` → `platform`. Bei `mock` deployt es auf Cloudflare; bei `azure` (Static Web Apps) und `powerapps` (Power Platform) hostet ein anderer Dienst — dann steigt es sauber aus (exit 0, kein CI-Fehler) und der jeweilige Pfad übernimmt. So läuft derselbe CI-Job unverändert in jedem Projekt.

Am `platform`-Feld und nicht an einem zweiten Host-Feld: die drei Kombinationen sind 1:1 und von den Regelsätzen erzwungen. Eine Cloudflare-SPA vor einer Azure-API wäre cross-origin — was `patterns-azure.md` mit relativer API-Basis und „CORS nur SWA-Origin" ausschließt.

**Build-Minuten sind ein reales Budget.** Nur `main` deployt, kein PR und kein `feature/*` — erst in der CI fertig arbeiten, dann mergen. Der Job hat eine `concurrency`-Gruppe mit `cancel-in-progress`, sodass zwei schnelle Pushes nicht doppelt zählen.

Lokal deployt das Script ebenfalls nur von `main`: der Cloudflare-Link ist der Stand, den der Kunde sieht, und ein Zwischenstand von einem Feature-Branch würde ihn still überschreiben. Wenn das wirklich gewollt ist: `pnpm deploy:cloudflare --force`.

## Warum nicht git-connect

Der Dashboard-Weg (*Connect to Git*, push-to-deploy) sieht bequemer aus, **skaliert für uns aber nicht**: er lässt sich pro Cloudflare-Account/Org nur mit **einem** GitHub-Account verbinden. Aus einer Agentur-Org heraus ist er damit nicht in viele Kunden-Cloudflare-Accounts deploybar — und genau das ist der Normalfall. Drei Ownership-Konstellationen müssen alle funktionieren:

1. Code + Cloudflare bei uns
2. Code bei uns, Cloudflare beim Kunden
3. Repo + Cloudflare beim Kunden

GitHub Actions läuft über Cloudflare-URL + API-Token (Env-Vars) und ist deshalb **an keinen Account gebunden** — es bedient alle drei. Eine einheitliche Lösung schlägt eine Fallunterscheidung.

## Lokaler Ad-hoc-Deploy

```bash
pnpm build                          # erzeugt apps/web/dist/
pnpm deploy:cloudflare              # = node scripts/deploy-cloudflare.mjs
pnpm deploy:cloudflare --force      # auch von einem anderen Branch als main
```

- Ruft `pnpm dlx wrangler pages deploy apps/web/dist --project-name=<projekt>` auf (Direct Upload).
- Das Script heißt `deploy:cloudflare` und nicht `deploy`, weil **`pnpm deploy` ein eingebautes
  Kommando ist** (es zieht ein Workspace-Package für den Versand flach) und Vorrang vor einem
  gleichnamigen Script hat. Ein Script namens `deploy` wäre nur über `pnpm run deploy` erreichbar —
  der Azure-Pfad braucht das Builtin: `deploy-azure.mjs` ruft es intern auf (siehe
  [`environments.md`](environments.md)).
- **Nur von `main`** — sonst Abbruch mit Hinweis auf `--force`. Der Link ist der Stand, den der Kunde sieht.
- **Legt das Pages-Projekt vorher explizit an** und toleriert ein bereits existierendes — `wrangler` würde ein fehlendes Projekt beim Deploy nur *interaktiv* anlegen, sonst failt der allererste CI-Lauf.
- **Slug** (`--project-name`): Priorität `Argument` > `.unitix/project.json` (`name`) > `package.json` (`name`), normalisiert auf einen gültigen Cloudflare-Slug (`a-z0-9-`, max. 58, kein führender/abschließender Bindestrich). `.unitix/project.json` ist die vorgesehene Quelle, damit CI und lokal **denselben** Slug treffen.
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
- **Azure-Stack:** ca. **45 €/Monat** für Dev **und** Prod zusammen — SWA Standard 2 × ~8 €, App Service B1 ~12 € (ein Plan, zwei Apps), PostgreSQL B1ms ~17 € (ein Server, zwei Datenbanken). Details: [`environments.md`](environments.md).
- Direct Upload verbraucht **keine** Cloudflare-Build-Minuten — gebaut wird in der GitHub-CI, hochgeladen wird nur `apps/web/dist/`. Das relevante Budget ist deshalb das von GitHub Actions.

## Was gehört wohin

| Zweck | Wo |
| --- | --- |
| Entwicklung + interner Review | `pnpm dev` (localhost), nie über einen Deploy |
| Kunden-Abstimmung des Prototyps | Cloudflare-Deploy von `main` (`<slug>`), Tag `prototype-ok` |
| Team-Test nach dem Azure-Fork | `pnpm deploy:dev` — Azure-Dev-Umgebung ([`environments.md`](environments.md)) |
| Produktion | `pnpm deploy:prod` — der eine gegatete Schritt |
| Link zwischendurch | `pnpm deploy:cloudflare` lokal, gleiche Logik |

Die Power-Platform-Toolchain (`npx power-apps …`) ist erst am `powerapps`-Fork relevant — für den Mock-Prototyp nie.
