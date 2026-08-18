# Azure-Setup — vom leeren Abo zur laufenden App

> Runbook für den Fork `mock → azure`, **zum Nachklicken im Azure-Portal**. Kein Provisioning-Script,
> kein Bicep, kein CI-Deploy — bewusst erst verstehen, dann automatisieren (siehe [Scope](#scope)).
> Die **Regeln** stehen in [`.claude/docs/patterns-azure.md`](../.claude/docs/patterns-azure.md);
> hier steht die **Reihenfolge**. Bei Widerspruch gewinnt der Regelsatz.
>
> **Was die Anmeldung tut und warum**, ohne Vorwissen erklärt: [`docs/auth.md`](auth.md) — inklusive
> Fehlertabelle für `AADSTS`-Meldungen. Wer hier in Schritt 1 hängen bleibt, findet dort die Antwort.

## Was gebaut wird

| Rolle     | Dienst                           | SKU                                            | ca. €/Monat |
| --------- | -------------------------------- | ---------------------------------------------- | ----------- |
| Frontend  | Azure Static Web Apps            | **Standard** (Free kann keinen `/api/*`-Proxy) | 8           |
| Backend   | App Service Linux, Node 24 (LTS) | B1, `Always On`                                | 12          |
| Datenbank | PostgreSQL Flexible Server       | B1ms + 32 GB                                   | 17          |
| Login     | Entra ID (interner Mandant)      | —                                              | 0           |
|           |                                  | **Summe**                                      | **~37**     |

Blob Storage, Application Insights, AI Foundry, Entra External ID und Key Vault gehören **nicht**
dazu. Kein Key Vault per Design: der App Service erreicht die DB über seine Managed Identity, es
gibt kein Secret zu verwahren.

**Regionen:** App Service + PostgreSQL in **eine** EU-Region (Germany West Central bevorzugt, ist
aber für kleine Subscriptions oft gesperrt — dann Spain Central / West Europe / North Europe /
Sweden Central, unter DSGVO gleichwertig). Die **SWA liegt separat in West Europe**, weil SWA nur
in wenigen Regionen angeboten wird; unkritisch, ausgeliefert wird global über das Edge-Netz.

## Voraussetzungen

- leere **Resource Group** in der Ziel-Subscription, **Owner** darauf (Contributor genügt nicht —
  ohne Rollenzuweisungen kein passwortloser DB-Zugang)
- Recht, im Mandanten Apps zu registrieren (_Application Developer_ reicht)
- registrierte Provider: `Microsoft.Web`, `Microsoft.DBforPostgreSQL`
- **Azure CLI + `az login`** — nicht zum Anlegen, sondern damit die Migration in Schritt 4 ein
  DB-Token bekommt (`DefaultAzureCredential`)

---

## 1. Entra: zwei App-Registrierungen

**Portal → Microsoft Entra ID → App registrations → + New registration** — zweimal, einmal je
Registrierung. Beide _Single tenant_ (`Accounts in this organizational directory only`).

**a) API-Registrierung** anlegen: Name `<projekt> API`, Redirect-URI **leer lassen** → _Register_.
Danach in der frisch angelegten Registrierung:

1. _Expose an API_ → **Application ID URI** → Vorschlag `api://<appId>` übernehmen
2. _Expose an API_ → **Add a scope**: Name `access_as_user`, _Admins and users_
3. _Manifest_ → `requestedAccessTokenVersion` auf **`2`** → Save

> **Schritt 3 wird übersehen.** Ohne ihn kommen v1-Token, deren `iss` nicht auf `/v2.0` endet —
> jede Prüfung schlägt fehl, obwohl das Token echt ist.

**b) SPA-Registrierung** anlegen: zurück auf _App registrations_ → **+ New registration**, Name
`<projekt> SPA`, Redirect-URI-Plattform **_Single-page application (SPA)_**, Wert
`http://localhost:5173` → _Register_.

> **Plattform-Typ _Single-page application_, niemals _Web_.** Das Dropdown steht per Default auf
> _Web_; sieht im Portal richtig aus, aber das Einlösen des Auth-Codes scheitert später mit
> `AADSTS9002326`. Umbenennen geht nicht — Plattform löschen und neu anlegen.

Danach in der **SPA**-Registrierung: _API permissions → Add a permission → My APIs_ →
API-Registrierung → _Delegated_ → `access_as_user` → **Add permissions**. Optional in der **API**-Registrierung unter
_Expose an API → Add a client application_ die SPA-Client-ID eintragen (erspart den Consent-Dialog).

**Werte notieren** (aus den _Overview_-Seiten). Die SPA-Werte gehören in den `entra`-Block von
[`.unitix/project.json`](../.unitix/project.json) (committet — es sind öffentliche
Identifikatoren, kein Secret), die beiden API-Werte werden Umgebungsvariablen der Node-API:

| Wert                                   | wo im Portal zu finden                                         | wohin                                                                                                                      |
| -------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Directory (tenant) ID                  | _Overview_ beider Registrierungen (gleich)                     | `project.json → entra.tenantId` · App setting `ENTRA_TENANT_ID` ([Schritt 3](#3-app-service)) · _optional_ `apps/api/.env` |
| Application (client) ID der **SPA**    | SPA-Registrierung → _Overview_                                 | `project.json → entra.clientId`                                                                                            |
| `api://<appId-der-API>/access_as_user` | SPA → _API permissions_, Spalte _Admin consent required_-Zeile | `project.json → entra.apiScope`                                                                                            |
| Application (client) ID der **API**    | **API**-Registrierung → _Overview_                             | App setting `ENTRA_API_AUDIENCE` ([Schritt 3](#3-app-service)) · _optional_ `apps/api/.env`                                |

_optional_ = nur nötig, wenn du die API **lokal** laufen lässt ([Lokal entwickeln](#lokal-entwickeln));
`pnpm dev` und [Schritt 4](#4-datenbank-füllen) kommen ohne `.env` aus. Beide Orte existieren, weil
eine `.env` nie deployed wird.

> `ENTRA_API_AUDIENCE` ist die **Client-ID der API-Registrierung** — nicht die der SPA, und mit
> `requestedAccessTokenVersion: 2` auch nicht die `api://…`-URI: v2-Token tragen die reine GUID im
> `aud`. [`verify.ts`](../apps/api/src/auth/verify.ts) vergleicht exakt. Nimmt man den falschen
> Wert, meldet man sich erfolgreich an und bekommt trotzdem `401`.

> Die SPA hat bewusst **keine `.env`**: Vite bäckt `VITE_*` beim Build ohnehin als Literale ins
> Bundle, also ist eine committete, typisierte Konfiguration die ehrlichere Form — und der Build
> bleibt aus dem Repo allein reproduzierbar. Ein leerer Block lässt
> [`auth.ts`](../apps/web/src/data/adapters/azure/auth.ts) sofort mit klarer Meldung scheitern.

## 2. PostgreSQL Flexible Server

**Portal → Azure Database for PostgreSQL flexible server → Create**

| Reiter     | Feld                                          | Wert                                    |
| ---------- | --------------------------------------------- | --------------------------------------- |
| Basics     | Region                                        | deine EU-Region                         |
| Basics     | PostgreSQL version                            | höchste angebotene, **mindestens 17**   |
| Basics     | Workload type                                 | _Development_                           |
| Basics     | Compute + storage                             | Burstable, **Standard_B1ms**, 32 GiB    |
| Basics     | Authentication method                         | **Microsoft Entra authentication only** |
| Basics     | Microsoft Entra admin                         | dich selbst setzen                      |
| Networking | Connectivity                                  | _Public access (selected networks)_     |
| Networking | „Allow public access from any Azure service…" | **NICHT anhaken**                       |
| Networking | Firewall rules                                | **+ Add current client IP address**     |

> **„Entra authentication only"** ist der wichtigste Schalter: Default wäre Passwort-Auth, und das
> Passwort müsste irgendwo liegen. Ohne gesetzten Entra-Admin kommt anschließend niemand auf den
> Server, auch du nicht. Die Azure-Services-Checkbox klingt intern, lässt aber jeden fremden
> Tenant durch.

Nach ~5–10 Min: **Settings → Databases → + Add** → Name `app`.

## 3. App Service

**Portal → App Services → Create → Web App** — Publish _Code_, Runtime **Node 24 LTS**, OS
**Linux**, deine EU-Region, Pricing **Basic B1**. Deployment: Continuous deployment **Disable**.
Monitoring: Application Insights **No**.

Danach in der Web App:

- **Name der Web App, Resource Group und Server-Name der DB** in den `azure`-Block von
  [`.unitix/project.json`](../.unitix/project.json) eintragen (`apiAppName` / `resourceGroup` /
  `dbServerName`) — von dort nehmen `pnpm deploy:api` ([Schritt 6](#6-deployen)) und
  [`pnpm db:firewall`](#firewall-der-db-auf-die-api-ips-abgleichen) ihr Ziel
- **Identity → System assigned → On** → die **Object (principal) ID** notieren (Schritt 4)
- **Configuration → General settings:** `Always On` → **On** (Default aus — sonst Kaltstart nach
  20 Min Leerlauf), `FTP state` → **Disabled** (Default `FTP + FTPS` = zweiter Deploy-Weg offen)
- **Health check:** aktivieren, Pfad `/health`
- Kein Startup Command nötig — `apps/api/package.json` hat `"start": "node dist/server.js"`, und
  `pnpm deploy` legt `dist/` flach im ZIP ab.

**Environment variables → App settings (nicht Connection strings!):**

| Name                             | Wert                                                                          |
| -------------------------------- | ----------------------------------------------------------------------------- |
| `WEBSITE_RUN_FROM_PACKAGE`       | `1` (ZIP read-only mounten statt entpacken)                                   |
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | `false` (kein Oryx-Rebuild, das ZIP ist fertig)                               |
| `PGHOST`                         | `<psql-name>.postgres.database.azure.com`                                     |
| `PGDATABASE`                     | `app`                                                                         |
| `PGUSER`                         | **der Name der Web App** (= Rollenname der Managed Identity, kein Tippfehler) |
| `ENTRA_TENANT_ID`                | Directory (tenant) ID                                                         |
| `ENTRA_API_AUDIENCE`             | Client-ID der **API**-Registrierung                                           |

`PORT`, `PGPORT`, `RATE_LIMIT_MAX`, `BODY_LIMIT_BYTES` und `ALLOWED_ORIGIN` haben in
[`env.ts`](../apps/api/src/env.ts) Defaults und bleiben ungesetzt. Bei `ALLOWED_ORIGIN` heißt der
Default „keine Cross-Origin-Requests" — richtig, solange die SWA `/api/*` same-origin proxied. Nur
wenn Web und API auf getrennten Origins laufen, gehört die Web-Origin hier rein: genau eine, kein
Wildcard.

### Firewall der DB auf die API-IPs abgleichen

Die API erreicht die DB nur, wenn deren Firewall die Outbound-IPs des App Service kennt; fehlen sie,
sieht der Fehler im Log wie ein Timeout aus. Abgeglichen wird das mit einem idempotenten Befehl:

```bash
pnpm db:firewall --dry-run   # zeigt nur, was sich ändern würde
pnpm db:firewall             # legt an, korrigiert, entfernt Veraltetes
```

> **Warum nicht von Hand.** [`scripts/sync-db-firewall.mjs`](../scripts/sync-db-firewall.mjs) liest
> `possibleOutboundIpAddresses` — **alle** IPs, die die App in ihrer Deployment-Unit je nutzen kann,
> **tierübergreifend** — und nicht die momentan benutzten aus dem Portal-Feld _Outbound addresses_.
> Das ist der Unterschied zwischen einer Liste, die beim nächsten Scaling still bricht, und einer, die
> hält: **B1 → B2 → S1 → P1v3 ändert an der Firewall dann nichts.** Scale-_out_ (Instanzzahl) ändert
> die Outbound-IPs ohnehin nie.
>
> Der Regelname trägt die IP (`api-outbound-20-79-1-2`), deshalb ist der Abgleich ein reiner
> Mengenvergleich und beliebig oft wiederholbar. Verwaltet werden **nur** Regeln mit diesem Präfix —
> die Regel für deinen eigenen Rechner aus [Schritt 2](#2-postgresql-flexible-server) überlebt jeden
> Lauf. Neue Regeln greifen laut Azure-Doku erst nach **bis zu 5 Minuten**.
>
> **Der erste Lauf dauert.** `possible…` sind je Deployment-Unit typischerweise **30–40 Adressen**
> (im Template: 38, davon 20 aktuell in Benutzung), und jede Regel ist eine eigene ARM-Operation auf
> demselben Server — parallel quittiert Azure das mit einem Conflict, das Script arbeitet deshalb
> seriell. Rechne beim Erstlauf mit einigen Minuten. Jeder weitere Lauf ist ein Vergleich ohne
> Änderung und in Sekunden durch.

Wiederholen statt nachpflegen: nach jedem dieser Ereignisse einmal laufen lassen.

| Ereignis                                                                                    | warum                                                                              |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Web App gelöscht und in **anderer** Resource Group neu angelegt                              | Deployment-Unit wechselt, der IP-Satz ist komplett neu                             |
| letzte App einer RG+Region gelöscht und neu angelegt                                        | dito                                                                               |
| Tier-Sprung **zwischen** `{Basic, Standard, Premium}` / `{PremiumV2}` / `{PremiumV3}` / `{Pmv3}` | nur dieser Sprung ändert den Satz — durch `possible…` schon gedeckt, ein Lauf danach kostet nichts |
| **PITR-Restore** der Datenbank                                                              | der wiederhergestellte Server hat **keine** Firewall-Regeln                        |

> [!WARNING]
> **Kein Premium V4.** Pv4 hat absichtlich **keinen** stabilen Satz von Outbound-IPs — ARM liefert für
> `outboundIpAddresses` und `possibleOutboundIpAddresses` leere Strings. Dann trägt keine IP-Liste
> mehr, es braucht VNet-Integration + NAT Gateway. `pnpm db:firewall` bricht in diesem Fall mit genau
> dieser Begründung ab, statt eine leere Firewall zu hinterlassen.
>
> Die Checkbox „Allow public access from any Azure service" bleibt trotzdem **aus** — sie lässt laut
> Doku fremde Kunden-Subscriptions durch. Eine vorhandene `0.0.0.0`-Regel meldet der Befehl, fasst sie
> aber nicht an: er löscht nur eigene Regeln.

## 4. Datenbank füllen

Die einzigen Schritte, die es im Portal nicht gibt — Schema und Rechte sind SQL. Kein Passwort:
`DefaultAzureCredential` zieht das Token aus deiner `az login`-Sitzung.

`db:migrate` spielt ein, was als SQL unter `apps/api/drizzle/` liegt; erzeugt wird das offline aus
`schema.ts`. Hast du `schema.ts` auf das Projekt-Datenmodell umgeschrieben, gehört `db:generate`
also davor. Das Template liefert `0000_…` für das Demo-Domain `companies`/`contacts` — ersetzt du es
durch das echte Modell, lösche `apps/api/drizzle/` und generiere `0000` neu, statt eine
Änderungs-Migration auf das Demo-Schema zu stapeln. Das geht nur jetzt, vor dem ersten `db:migrate`
gegen eine Umgebung.

**Wo:** Terminal **auf deinem Rechner**, im **Repo-Root** — nicht im Portal, nicht in der Cloud
Shell. Von dort, weil beide Befehle deine `az login`-Sitzung als DB-Passwort-Ersatz benutzen und die
Firewall-Regel aus Schritt 2 auf deine IP zeigt. `PGUSER` ist dein UPN — dieselbe Adresse, die du
dort als _Microsoft Entra admin_ gesetzt hast.

Der `PGHOST=… pnpm …`-Prefix ist zsh/bash-Syntax und setzt die Variablen nur für diesen einen
Aufruf. In PowerShell gibt es das nicht — dort vorher je Zeile `$env:PGHOST='…'` setzen und danach
`pnpm db:migrate` allein aufrufen.

**Warum nicht aus `apps/api/.env`?** Die zeigt auf den **DEV**-Server; hier richtest du womöglich
PROD ein. Inline geschrieben steht das Ziel sichtbar im Befehl, statt still aus einer Datei zu
kommen — dieselbe Vorsicht, die die Warnung unten meint.

Richtest du **DEV** ein und deine `.env` zeigt schon dorthin, kannst du die `PG*`-Prefixe weglassen —
`pnpm db:migrate` allein genügt. Beides mischt sich gefahrlos: eine vorhandene `.env` wird von
Inline-Werten überschrieben, nicht umgekehrt (`--env-file-if-exists` lässt bereits gesetzte
Variablen stehen). Merksatz: **`.env` für DEV, Inline für jede andere Umgebung.**

`API_IDENTITY_NAME`/`API_IDENTITY_OBJECT_ID` bleiben davon unberührt und gehören **nicht** in die
`.env`: sie gelten dem einen `db:grant`-Lauf, beschreiben die Identity der Ziel-Web-App statt deiner
Arbeitsumgebung, und [`env.ts`](../apps/api/src/env.ts) kennt sie nicht — die laufende API liest sie
nie.

```bash
# 0. nur nach Änderungen an schema.ts — offline, ohne DB. Ergebnis gehört in den Commit.
pnpm db:generate

# 1. Schema anlegen — als Entra-Admin, von deinem Rechner
PGHOST=<psql-name>.postgres.database.azure.com \
PGDATABASE=app \
PGUSER='<deine-e-mail-im-mandanten>' \
pnpm db:migrate

# 2. Rolle + Rechte für die Managed Identity
PGHOST=<psql-name>.postgres.database.azure.com \
PGDATABASE=app \
PGUSER='<deine-e-mail-im-mandanten>' \
API_IDENTITY_NAME='<name-der-web-app>' \
API_IDENTITY_OBJECT_ID='<object-principal-id-aus-schritt-3>' \
pnpm db:grant
```

> `db:grant` verbindet sich zusätzlich zur Ziel-Datenbank kurz auf die Wartungs-Datenbank
> `postgres` — nur dort liegen die `pgaadauth_*`-Funktionen, mit denen die Entra-Rolle entsteht. In
> `app` fehlen sie, und `CREATE EXTENSION pgaadauth` ist dort gesperrt (Extension-Allow-List). Weil
> Rollen serverweit gelten, ist das kein Umweg, sondern der einzige Ort, an dem der Aufruf existiert;
> `PGDATABASE` bleibt trotzdem die Ziel-Datenbank, denn die Rechte danach sind pro Datenbank.

Bewusst zwei Befehle, denn sie verhalten sich grundverschieden:

|                   | wann                          | wiederholbar                                             |
| ----------------- | ----------------------------- | -------------------------------------------------------- |
| `pnpm db:migrate` | bei **jeder** Schema-Änderung | nur so weit, wie die Migrationen es sind — siehe Warnung |
| `pnpm db:grant`   | **einmal pro Umgebung**       | ja, vollständig idempotent, fasst keine Daten an         |

> [!WARNING]
> **`db:migrate` ist kein Setup-Schritt, sondern ein Dauerläufer.** Der Befehl spielt jede
> Migration ein, die gerade in deinem Arbeitsverzeichnis liegt — auch die aus einem Feature-Branch,
> auch gegen Produktion. Steckt darin ein `DROP COLUMN`, sind die Daten weg. Vor jedem Lauf gegen
> eine Umgebung mit echten Daten: **Branch prüfen und `PGHOST` zweimal lesen.**

**Reihenfolge zählt: erst migrieren, dann granten.** `GRANT … ON ALL TABLES` erwischt nur, was zum
Zeitpunkt des Laufs existiert — dafür aber unabhängig davon, wer es erzeugt hat. Umgekehrt hinge
das Ergebnis daran, dass ausgerechnet dieselbe Person auch jede künftige Migration ausführt.

`db:grant` ist damit auch das Reparatur-Werkzeug: wirft die API irgendwann `permission denied for
table …`, weil jemand anders migriert hat, genügt ein erneuter Lauf.

> Die Identity wird bewusst **nicht** Server-Administrator, sondern bekommt Lesen/Schreiben auf
> genau dieser einen Datenbank.

## 5. Static Web App

**Portal → Static Web Apps → Create** — Plan **Standard**, Region _West Europe_, Deployment source
**Other** (sonst legt das Portal ungefragt einen GitHub-Workflow im Repo an).

Danach **drei Schritte im Portal, keiner davon optional.** Die ersten beiden werden am häufigsten
übersehen — sie fallen erst beim Öffnen der fertigen App auf, dafür mit je einem eindeutigen Symptom.

**a) `/api/*`-Proxy verknüpfen.** SWA → **APIs** → Kachel _Production_ → **Link** → Backend resource
type _App Service_ → Subscription und die Web App aus [Schritt 3](#3-app-service) → **Link**.
Danach steht die Web App als verlinktes Backend in der Kachel.

> **Fehlt der Link, beantwortet die SWA jeden API-Aufruf mit `404`**: die Tabellen der App bleiben
> leer, in der Browser-Konsole steht `GET /api/contacts 404 (Not Found)`. Die SWA hat dann kein Ziel
> für `/api/*`, und [`staticwebapp.config.json`](../apps/web/public/staticwebapp.config.json) nimmt
> `/api/*` bewusst aus der `navigationFallback` heraus — deshalb ein echtes 404 statt der index.html.
> Prüfen (leere Ausgabe `[]` = nicht verknüpft):
>
> ```bash
> az staticwebapp backends show -n <swa-name> -g <rg>
> ```

**b) SWA-URL als zweite Redirect-URI nachtragen.** URL aus SWA → _Overview_ kopieren (Form
`https://<name>.<n>.azurestaticapps.net`) → Entra → _App registrations_ → **SPA**-Registrierung →
_Authentication_ → Plattform _Single-page application_ → **Add URI** → einfügen → **Save**.

> Der Wert muss **exakt die Origin** sein: `https://`, kein Pfad, **kein Slash am Ende** — die SPA
> sendet `window.location.origin` ([`auth.ts`](../apps/web/src/data/adapters/azure/auth.ts)).
> `http://localhost:5173` bleibt daneben stehen; beide Einträge gelten parallel, deshalb braucht es
> keine Umschaltung zwischen lokal und deployed. Fehlt der Eintrag, endet der Login auf der
> Entra-Seite mit `AADSTS50011`. Ein Rebuild ist nicht nötig — Entra prüft gegen seine eigene Liste,
> nicht gegen das Bundle.

**c) Deployment-Token holen:** **Overview → Manage deployment token** → Token kopieren, für
[Schritt 6](#6-deployen).

> **Environment variables bleiben leer.** Sie speisen nur SWAs eigenen Oryx-Build, den wir nie
> auslösen — die SPA-Konfiguration steht in `.unitix/project.json` und ist beim Build schon im
> Bundle. Eine Änderung dort wirkt erst nach Rebuild + Redeploy; das ist die Grenze einer
> statischen SPA und lässt sich nicht wegkonfigurieren.

## 6. Deployen

Gebaut wird lokal, hochgeladen über die CLI — **ein Befehl pro Deployable**. Die Ziel-Ressourcen der
API stehen einmalig im `azure`-Block von [`.unitix/project.json`](../.unitix/project.json)
(Ressourcennamen sind keine Secrets — dasselbe Argument wie beim `entra`-Block):

```json
"azure": { "resourceGroup": "<rg>", "apiAppName": "<name-der-web-app>", "dbServerName": "<psql-name>" }
```

```bash
pnpm deploy:api    # baut, zieht das Package ohne devDependencies heraus, zippt, az webapp deploy

export SWA_DEPLOYMENT_TOKEN='<token-aus-schritt-5>'   # nicht wörtlich in den Befehl → Shell-History
pnpm deploy:swa    # baut apps/web und lädt dist/ in die production-Umgebung der SWA
```

Statt des `export` darf der Token auch dauerhaft in eine **Root-`.env`** (gitignored, Vorlage:
[`.env.example`](../.env.example)) — `pnpm deploy:swa` lädt sie über Nodes `--env-file-if-exists`:

```dotenv
SWA_DEPLOYMENT_TOKEN=<token-aus-schritt-5>
```

Das ist unbedenklich, weil die Root-`.env` nichts mit dem Bundle zu tun hat: Vite lädt `.env`
relativ zu `apps/web/`, und selbst dort landen nur `VITE_`-Variablen im Client-Code — genau das,
was [`scripts/check-env-secrets.mjs`](../scripts/check-env-secrets.mjs) blockt. Serverseitige
Variablen der API gehören weiterhin nach `apps/api/.env`, nicht hierhin.

Bewusst zwei Befehle statt einem Sammel-Deploy: die beiden haben unterschiedliche Voraussetzungen
(`az login` vs. Deployment-Token) und werden selten gleichzeitig ausgerollt — ein gemeinsamer Befehl
scheitert dann zur Hälfte. Einmalig gegen eine andere Ressourcengruppe geht ohne Config-Änderung:
`pnpm deploy:api --resource-group=<rg> --app-name=<name>`.

Was [`scripts/deploy-api.mjs`](../scripts/deploy-api.mjs) und
[`scripts/deploy-swa.mjs`](../scripts/deploy-swa.mjs) dabei tun — die vier bzw. zwei Schritte, die
vorher hier von Hand standen:

```bash
# pnpm deploy:api
pnpm --filter @app/api build
pnpm --config.node-linker=hoisted --filter @app/api --prod --legacy deploy .artifacts/api
cd .artifacts/api && zip -r ../api.zip . && cd -
az webapp deploy --resource-group <rg> --name <name-der-web-app> \
  --src-path .artifacts/api.zip --type zip

# pnpm deploy:swa
pnpm --filter @app/web build
pnpm dlx @azure/static-web-apps-cli deploy apps/web/dist --env production
```

> **`pnpm deploy`** ist hier das **eingebaute** pnpm-Kommando (nicht `deploy:cloudflare`) — es zieht
> das Workspace-Package flach aus den Symlinks. **`--prod`** lässt dabei die devDependencies
> (`typescript`, `tsx`, `drizzle-kit`, `@types/*`) aus dem ZIP: kleinerer Upload, schnelleres Mounten
> unter `WEBSITE_RUN_FROM_PACKAGE=1`, kein Build-Werkzeug im Produktions-Runtime. **`--legacy`** ist
> die alte `deploy`-Semantik; ohne das Flag verlangt pnpm 10 `inject-workspace-packages=true`.

> [!WARNING]
> **`--config.node-linker=hoisted` ist der Unterschied zwischen lauffähig und kaputt.** pnpms
> Standard-Layout legt in `node_modules/` nur **Symlinks** nach `node_modules/.pnpm/<paket>/` ab — und
> dort liegen auch die Geschwister-Dependencies des Pakets. `zip` löst Symlinks per Default auf und
> kopiert den Inhalt an die Symlink-Stelle, womit das Paket seine Geschwister verliert. Die API startet
> dann lokal einwandfrei und stirbt in Azure beim Start:
>
> ```
> ERR_MODULE_NOT_FOUND: Cannot find package '@azure/logger' imported from
>   /home/site/wwwroot/node_modules/@azure/identity/dist/esm/util/logging.js
> ```
>
> `hoisted` erzeugt ein flaches `node_modules` aus echten Verzeichnissen. Nebeneffekt: das ZIP fällt von
> 68 auf 15 MB, weil die aufgelösten Symlinks jedes Paket doppelt enthielten. `pnpm deploy:api` prüft das
> Staging-Verzeichnis vor dem Zippen auf verbliebene Symlinks und bricht ab, statt ein kaputtes ZIP
> hochzuladen.
>
> Das `--env production` im SWA-Befehl ist etwas völlig anderes: es benennt die Ziel-**Umgebung** der
> Static Web App (production statt Preview-Environment). Für SWA gibt es keinen Portal-Upload und
> kein Kudu; die CLI ist der einzige Weg außerhalb einer Pipeline.
>
> Anders als [`scripts/deploy-cloudflare.mjs`](../scripts/deploy-cloudflare.mjs) (CI-getrieben, Build ist ein
> eigener Job-Step) **bauen beide Scripts selbst** — ein altes `dist/` würde still veralteten Code
> deployen.
>
> **B1 hat keine Deployment-Slots** — jedes Deployment ist ein Neustart von wenigen Sekunden.

## 7. Smoke-Test

- SWA-URL öffnen → Entra-Login → leere Kontaktliste (Empty-State)
- „Demo-Kontakt anlegen" → Eintrag erscheint, Suche/Sortierung/Löschen funktionieren
- `https://<web-app>.azurewebsites.net/health` → `{"status":"ok"}`
- `https://<web-app>.azurewebsites.net/api/contacts` **ohne** Token → `401` — der wichtigste Punkt:
  die API ist auch direkt aufgerufen geschützt, nicht nur hinter dem SWA-Proxy
- `https://<swa-url>/api/contacts` **ohne** Token → ebenfalls `401`. Ein `404` heisst hier nicht
  „Route fehlt", sondern der Backend-Link aus [Schritt 5a](#5-static-web-app) ist nicht gesetzt.

---

## Lokal entwickeln

Zwei Modi, **keine lokale Datenbank** in beiden:

```bash
pnpm dev          # backend: mock — kein Login, kein Backend, Seed-Adapter. Normalfall für UI-Arbeit.

pnpm db:migrate   # backend: azure — Schema auf dem DEV-Server aus Schritt 2
pnpm dev:full     # API :3000 + SPA :5173 — braucht apps/api/.env
```

**Nur der zweite Modus braucht `apps/api/.env`** (aus `.env.example` kopieren): sobald der
Node-Prozess startet, verlangt [`env.ts`](../apps/api/src/env.ts) die `PG*`- und `ENTRA_*`-Werte und
bricht sonst mit Klartext ab. `pnpm dev` startet gar keine API, `db:migrate`/`db:grant` brauchen nur
die `PG*`-Werte — beides läuft ohne `.env`.

Der azure-Modus läuft passwortlos gegen den Azure-DEV-Server (`az login` statt Passwort,
Firewall-Regel für deine IP). Vorteil gegenüber lokalem Postgres: es testet dieselbe
Authentifizierung wie Produktion — es gibt gar keinen zweiten Anmeldeweg im Code. Vite proxied
`/api` lokal, dieselbe Origin-Situation wie in Azure, deshalb steckt keine API-Basis-URL im Bundle.

**Schema ändern:** `pnpm db:generate` (SQL offline aus `schema.ts`) → `pnpm db:migrate`. Die Files
unter `apps/api/drizzle/` gehören ins Repo.

## Scope

Der Stack läuft von Hand. Bewusst **noch nicht** automatisiert:

- **Provisioning** (Bicep/Script) — diese Datei ist die Vorlage: jeder Klickpfad wird dort eine Zeile
- **CI/CD** über GitHub Actions — dann per **OIDC (federated credential)**, nie per Client-Secret;
  die Migration braucht eine temporäre Firewall-Regel für die wechselnde Runner-IP. `pnpm db:firewall`
  ([Schritt 3](#firewall-der-db-auf-die-api-ips-abgleichen)) läuft dort unverändert mit und ist der
  Ort, an dem der Abgleich am Ende hingehört: ein Schritt im Deploy-Job, und Drift kann keine
  Deploy-Runde überleben
- **MFA-Policy** im Mandanten (Conditional Access)
- **PITR-Restore einmal wirklich testen** — HA ist kein Backup. Zum Runbook gehört
  [`pnpm db:firewall`](#firewall-der-db-auf-die-api-ips-abgleichen): ein wiederhergestellter Server
  startet ohne jede Firewall-Regel

**Ehrlich bleiben muss:** der DB-Endpunkt ist öffentlich auflösbar, und die Outbound-IPs des App
Service gehören der Scale Unit, nicht exklusiv dieser App. Die Absicherung trägt die
**Entra-only-Authentifizierung**, nicht die IP-Liste. Ein Private Endpoint ist nachrüstbar (~8 €/Monat).

Daraus folgt die Einordnung von `pnpm db:firewall`: eine veraltete IP-Liste ist ein
**Verfügbarkeits**-, kein Sicherheitsproblem — die API kommt nicht mehr an die DB, unbefugt kommt
niemand herein. Deshalb sitzt die Gegenmaßnahme in einem Befehl und später in der Pipeline, und nicht
in einem VNet: statische Outbound-IPs gibt es für App Service ausschließlich über VNet-Integration
plus NAT Gateway (~35 €/Monat), und der Service Tag `AppService` hilft nicht — er enthält nur die
**Inbound**-IPs, Outbound ist ausdrücklich ausgeschlossen, und Postgres-Firewall-Regeln nehmen
ohnehin nur IPv4-Ranges, keine Tags.
