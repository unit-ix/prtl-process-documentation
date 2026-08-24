# Azure-Setup — vom leeren Abo zur laufenden App

> Runbook für den Fork `mock → azure`, **zum Nachklicken im Azure-Portal**. Kein Provisioning-Script,
> kein Bicep, kein CI-Deploy — bewusst erst verstehen, dann automatisieren (siehe [Scope](#scope)).
> Die **Regeln** stehen in [`.claude/docs/patterns-azure.md`](../.claude/docs/patterns-azure.md);
> hier steht die **Reihenfolge**. Bei Widerspruch gewinnt der Regelsatz.
>
> Schritte 1–7 richten **eine** Umgebung ein, [Schritt 8](#8-die-zweite-umgebung) die zweite. Warum
> Umgebungen keine Branches sind und was Dev und Prod teilen: [`environments.md`](environments.md).
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
|           |                                  | **Summe (eine Umgebung)**                      | **~37**     |
|           | + zweite Umgebung (Dev)          | zweite SWA Standard                            | **+8**      |
|           |                                  | **Summe (Dev + Prod)**                         | **~45**     |

Blob Storage, Application Insights, AI Foundry, Entra External ID und Key Vault gehören **nicht**
dazu. Kein Key Vault per Design: der App Service erreicht die DB über seine Managed Identity, es
gibt kein Secret zu verwahren.

**Zwei Umgebungen, geteilte Basis.** Dev und Prod teilen App-Service-Plan, PostgreSQL-Server und
Entra-Registrierung; getrennt sind App Service, Datenbank, DB-Rolle und Static Web App. Deshalb kostet
die Dev-Umgebung nur die zweite SWA. Dieses Runbook richtet **eine** Umgebung ein — welche, entscheidet
allein, welche Namen du einsetzt. Für die zweite gibt es [Schritt 8](#8-die-zweite-umgebung). Das Modell
dahinter: [`environments.md`](environments.md).

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

> **Vorher entscheiden: interner Mandant oder Entra External ID?** Sollen sich firmenfremde Personen
> **selbst registrieren** (Kunden, Lieferanten, Mitglieder), gehört alles ab hier in einen separaten
> **externen Mandanten** — und der muss **vor** diesem Schritt existieren. Was das heißt, was
> anzulegen ist und welche drei Werte dazukommen:
> [Optional: Entra External ID statt Entra ID](#optional-entra-external-id-statt-entra-id).
>
> Im Normalfall — nur Mitarbeitende des eigenen Mandanten — ist hier nichts zu tun, einfach
> weiterlesen. Nachträglich wechseln geht, kostet aber beide Registrierungen, den User Flow und
> jede Redirect-URI neu.

**Portal → Microsoft Entra ID → App registrations → + New registration** — zweimal, einmal je
Registrierung. Beide _Single tenant_ (`Accounts in this organizational directory only`).

Bei **External ID** ist der Klickpfad identisch, nur im **externen** Mandanten statt im
Arbeitsmandanten — der Mandantenwechsel oben rechts im Portal ist dabei die häufigste Fehlerquelle,
weil die Registrierungen in beiden Mandanten gleich aussehen.

**a) API-Registrierung** anlegen: Name `<projekt> API`, Redirect-URI **leer lassen** → _Register_.
Danach in der frisch angelegten Registrierung:

1. _Expose an API_ → **Application ID URI** → Vorschlag `api://<appId>` übernehmen — **unverändert
   lassen**, nicht auf eine eigene Domain umstellen
2. _Expose an API_ → **Add a scope**: Name **genau** `access_as_user`, _Admins and users_
3. _Manifest_ → `requestedAccessTokenVersion` auf **`2`** → Save

> **Beide Formen sind festgelegt, nicht frei wählbar.** Die SPA baut den Scope aus der Client-ID
> zusammen (`api://<client-id>/access_as_user`, siehe
> [`auth.ts`](../apps/web/src/data/adapters/azure/auth.ts)), und die API prüft den Scope-Namen als
> Konstante ([`verify.ts`](../apps/api/src/auth/verify.ts)). Wer die URI-Form oder den Scope-Namen
> ändert, muss beide Stellen im Code mitändern — dafür trägt die Konfiguration keinen redundanten
> Scope-String, der stillschweigend zur Client-ID driften könnte.

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

| Wert                                | wo im Portal zu finden                     | wohin                            |
| ----------------------------------- | ------------------------------------------ | -------------------------------- |
| Directory (tenant) ID               | _Overview_ beider Registrierungen (gleich) | `project.json → entra.tenantId`  |
| Application (client) ID der **SPA** | SPA-Registrierung → _Overview_             | `project.json → entra.clientId`  |
| Application (client) ID der **API** | **API**-Registrierung → _Overview_         | `project.json → entra.apiAudience` |

Drei Werte, drei _Overview_-Seiten — nichts muss unter _API permissions_ zusammengesucht werden. Alle
drei stehen **nur** in `project.json`; die API bekommt sie in Azure als App settings mit **denselben
Namen** ([Schritt 3](#3-app-service)), lokal liest sie sie direkt aus der Datei.

Bei **External ID** werden dieselben drei Werte befüllt, nur aus den Registrierungen des externen
Mandanten — dazu kommt eine weitere: die **Subdomain** des externen Mandanten
(`entra.subdomain` in `project.json`), siehe
[Die eine zusätzliche Angabe](#die-eine-zusätzliche-angabe).

> `entra.apiAudience` ist die **Client-ID der API-Registrierung** — nicht die der SPA, und mit
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

- **Name der Web App und Resource Group** in den `azure`-Block von
  [`.unitix/project.json`](../.unitix/project.json) eintragen (`apiAppName` / `resourceGroup`) — von
  dort nehmen `pnpm deploy:dev`/`:prod` ([Schritt 6](#6-deployen)) und
  [`pnpm db:firewall`](#firewall-der-db-auf-die-api-ips-abgleichen) ihr Ziel. Den Server-Namen der DB
  leitet `db:firewall` aus `pg.host` ab, er braucht kein eigenes Feld
- **Denselben Namen der Web App auch als `pg.user`** eintragen — Azure benennt die Managed Identity
  nach der Web App, und dieser Name ist die DB-Rolle aus [Schritt 4](#4-datenbank-füllen).
  der Deploy warnt, wenn die beiden auseinanderlaufen
- **Identity → System assigned → On** → die **Object (principal) ID** notieren (Schritt 4)
- **Configuration → General settings:** `Always On` → **On** (Default aus — sonst Kaltstart nach
  20 Min Leerlauf), `FTP state` → **Disabled** (Default `FTP + FTPS` = zweiter Deploy-Weg offen)
- **Health check:** aktivieren, Pfad `/health`
- Kein Startup Command nötig — `apps/api/package.json` hat `"start": "node dist/server.js"`, und
  `pnpm deploy` legt `dist/` flach im ZIP ab.

### Environment variables → App settings (nicht Connection strings!)

**Ein Wert, ein Name.** Jede Variable heißt hier genauso wie ihr Feld in
[`.unitix/project.json`](../.unitix/project.json) — Regel: `<block>.<key>` → `<BLOCK>_<KEY>`. Es gibt
nichts herzuleiten, nur zu kopieren.

| in `project.json` | App setting          | Wert                                              |
| ----------------- | -------------------- | ------------------------------------------------- |
| `pg.host`         | `PGHOST`             | `<psql-name>.postgres.database.azure.com`         |
| `pg.database`     | `PGDATABASE`         | `app`                                             |
| `pg.user`         | `PGUSER`             | der Name der Web App (= Rolle der Managed Identity) |
| `entra.tenantId`  | `ENTRA_TENANT_ID`    | Directory (tenant) ID                             |
| `entra.apiAudience` | `ENTRA_API_AUDIENCE` | Client-ID der **API**-Registrierung             |
| `entra.subdomain` | `ENTRA_SUBDOMAIN`    | _nur_ bei External ID, sonst weglassen            |

Dazu zwei Plattform-Schalter ohne Gegenstück in `project.json` — einmal setzen, nie wieder anfassen:

| App setting                      | Wert                                            |
| -------------------------------- | ----------------------------------------------- |
| `WEBSITE_RUN_FROM_PACKAGE`       | `1` (ZIP read-only mounten statt entpacken)     |
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | `false` (kein Oryx-Rebuild, das ZIP ist fertig) |

> **Warum kopieren und nicht generieren?** Weil `project.json` **nicht** mitdeployed wird: in Azure
> gibt es keine Datei, aus der die API lesen könnte, und das ist Absicht — die Konfiguration einer
> laufenden Instanz gehört in ihre Umgebung, nicht in ihr Artefakt. Lokal liest
> [`env.ts`](../apps/api/src/env.ts) dieselben Werte direkt aus der Datei, weshalb dort **nur** `PGUSER`
> in der `.env` steht (dein UPN statt der Managed Identity). Ein gesetztes App setting schlägt immer
> den Wert aus der Datei — dieselbe Vorrangregel auf beiden Seiten.

`PORT`, `PGPORT`, `RATE_LIMIT_MAX`, `BODY_LIMIT_BYTES` und `ALLOWED_ORIGIN` haben in
[`env.ts`](../apps/api/src/env.ts) Defaults und bleiben ungesetzt — sie stehen deshalb auch nicht in
`project.json`. Bei `ALLOWED_ORIGIN` heißt der Default „keine Cross-Origin-Requests" — richtig, solange
die SWA `/api/*` same-origin proxied. Nur wenn Web und API auf getrennten Origins laufen, gehört die
Web-Origin hier rein: genau eine, kein Wildcard.

> **Gegenprobe, ob es wirklich die App settings sind:** die API loggt beim Start
> `Datenbank-Ziel: <user>@<host>/<db>`. Steht dort etwas anderes als erwartet, ist ein App setting
> falsch oder fehlt — und nicht irgendeine mitgereiste Datei.

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

| Ereignis                                                                                         | warum                                                                                              |
| ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Web App gelöscht und in **anderer** Resource Group neu angelegt                                  | Deployment-Unit wechselt, der IP-Satz ist komplett neu                                             |
| letzte App einer RG+Region gelöscht und neu angelegt                                             | dito                                                                                               |
| Tier-Sprung **zwischen** `{Basic, Standard, Premium}` / `{PremiumV2}` / `{PremiumV3}` / `{Pmv3}` | nur dieser Sprung ändert den Satz — durch `possible…` schon gedeckt, ein Lauf danach kostet nichts |
| **PITR-Restore** der Datenbank                                                                   | der wiederhergestellte Server hat **keine** Firewall-Regeln                                        |

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

**Warum hier inline?** Diese Schritte richten eine Umgebung **ein**, und beim Einrichten steht das Ziel
besser sichtbar im Befehl als still in einer Datei. Im laufenden Betrieb braucht man das nicht mehr:
`pnpm deploy:dev` / `pnpm deploy:prod` spielt die Migrationen als Schritt 1 selbst ein und nimmt Host
und Datenbank aus dem `environments`-Block — die Reihenfolge „migrieren, dann deployen" ist dort
strukturell erzwungen.

`pnpm db:migrate` ohne Prefix zeigt immer auf **Dev**: [`env.ts`](../apps/api/src/env.ts) liest fest
`environments.dev`, und es gibt keine Variable, die das umschaltet. Inline-Werte schlagen die Defaults
und nicht umgekehrt, beides mischt sich also gefahrlos.

Sicherheitsnetz für beide Fälle: `db:migrate` gibt vor dem Lauf `→ Ziel: <user>@<host>/<db>` aus. Das
ist die Zeile, die man zweimal liest — sie steht auch da, wenn das Ziel aus der Datei kam.

`API_IDENTITY_NAME`/`API_IDENTITY_OBJECT_ID` bleiben davon unberührt und gehören **weder** in die
`.env` **noch** in `project.json`: sie gelten dem einen `db:grant`-Lauf, beschreiben die Identity der
Ziel-Web-App statt deiner Arbeitsumgebung, und [`env.ts`](../apps/api/src/env.ts) kennt sie nicht — die
laufende API liest sie nie.

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
> **`db:migrate` direkt aufgerufen ist ungeschützt.** Der Befehl spielt jede Migration ein, die gerade
> in deinem Arbeitsverzeichnis liegt — auch die aus einem Feature-Branch. Steckt darin ein
> `DROP COLUMN`, sind die Daten weg. Ohne Prefix trifft es Dev, mit `PGHOST`/`PGDATABASE`-Prefix
> trifft es, was du hinschreibst: **die `→ Ziel:`-Zeile zweimal lesen.**
>
> Gegen Produktion deshalb **nie direkt**, sondern über `pnpm deploy:prod`. Das prüft vorher Branch und
> Sync-Stand, lässt `pnpm verify` laufen und **bricht bei destruktivem DDL ab** (`DROP COLUMN`,
> `DROP TABLE`, `TRUNCATE`, `ALTER COLUMN … TYPE` in den Migrationen seit dem letzten `prod-*`-Tag) —
> überstimmbar nur mit `--allow-destructive`. Details: [`environments.md`](environments.md#die-prod-gates).

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

Gebaut wird lokal, hochgeladen über die CLI — **ein Befehl pro Umgebung**. Die Ziel-Ressourcen stehen
im `environments`-Block von [`.unitix/project.json`](../.unitix/project.json) (Ressourcennamen sind
keine Secrets — dasselbe Argument wie beim `entra`-Block):

```json
"environments": {
  "dev":  { "url": "https://<swa-dev>.azurestaticapps.net",
            "azure": { "resourceGroup": "<rg>", "apiAppName": "<name>-dev" },
            "pg": { "host": "<psql>.postgres.database.azure.com", "database": "app_dev", "user": "<name>-dev" } },
  "prod": { "url": "https://<swa>.azurestaticapps.net",
            "azure": { "resourceGroup": "<rg>", "apiAppName": "<name>" },
            "pg": { "host": "<psql>.postgres.database.azure.com", "database": "app", "user": "<name>" } }
}
```

```bash
pnpm deploy:dev              # Migrationen → API → SPA, ohne Rückfrage
pnpm deploy:prod             # dasselbe, mit Gates davor und Tag danach
pnpm deploy:dev --only=web   # nur die SPA (ein API-Neustart kostet Sekunden Downtime)
```

**Ein Script für alle drei Schritte, in fester Reihenfolge** — weil die Reihenfolge sicherheitsrelevant
ist: Migrationen laufen **vor** dem Deploy, neuer Code auf altem Schema stirbt beim ersten Query. Und
weil die Prod-Gates so genau einmal existieren statt in zwei Scripten oder in einem dritten, das man
umgehen kann. Was `pnpm deploy:prod` prüft, steht in [`environments.md`](environments.md#die-prod-gates).

Die beiden Deployment-Token gehören in die **Root-`.env`** (gitignored, Vorlage:
[`.env.example`](../.env.example)) — `deploy-azure.mjs` lädt sie über Nodes `--env-file-if-exists`:

```dotenv
SWA_DEPLOYMENT_TOKEN_DEV=<token der dev-SWA aus Schritt 5>
SWA_DEPLOYMENT_TOKEN_PROD=<token der prod-SWA>
PGUSER=<dein-upn>          # für pnpm dev:full und jede Migration, siehe „Lokal entwickeln"
```

Der Name trägt die Umgebung, und ein unsuffixierter `SWA_DEPLOYMENT_TOKEN` wird bewusst **nicht**
akzeptiert: bei zwei Umgebungen ist „welche SWA war das eigentlich" die falsche Frage, um sie beim
Prod-Deploy zu stellen.

Das ist die **einzige** `.env` im Repo, und sie liegt bewusst im Root und nicht in einem Package:
`pnpm deploy` kopiert das Package-Verzeichnis, eine `apps/api/.env` würde also im Deploy-ZIP landen und
in Azure still Werte liefern, die dort aus den App settings kommen sollen.
[`scripts/check-env-secrets.mjs`](../scripts/check-env-secrets.mjs) blockt sie deshalb im `verify`-Gate,
und der Deploy bricht ab, falls doch eine im Staging-Verzeichnis auftaucht.

Das Bundle erreicht die Datei nie: Vite lädt `.env` relativ zu `apps/web/`, und selbst dort landen nur
`VITE_`-Variablen im Client-Code.

Einmalig gegen eine andere Ressourcengruppe geht ohne Config-Änderung:
`pnpm deploy:dev --resource-group=<rg> --app-name=<name>`.

Was [`scripts/deploy-azure.mjs`](../scripts/deploy-azure.mjs) dabei tut — die Schritte, die vorher
hier von Hand standen:

```bash
# --only=db
PGHOST=<host> PGDATABASE=<db> pnpm --filter @app/api db:migrate

# --only=api
pnpm --filter @app/api build
pnpm --config.node-linker=hoisted --filter @app/api --prod --legacy deploy .artifacts/api
rm -f .artifacts/api/.env .artifacts/api/.env.example   # gehören nicht ins Artefakt
cd .artifacts/api && zip -r ../api.zip . && cd -
az webapp deploy --resource-group <rg> --name <name-der-web-app> \
  --src-path .artifacts/api.zip --type zip

# --only=web
pnpm --filter @app/web build
SWA_CLI_DEPLOYMENT_TOKEN=$SWA_DEPLOYMENT_TOKEN_<ENV> \
  pnpm dlx @azure/static-web-apps-cli deploy apps/web/dist --env production
```

> Das `--env production` der SWA-CLI benennt die Umgebung **innerhalb** einer Static Web App
> (production statt Preview) und hat nichts mit unserem `--env=dev|prod` zu tun — unsere Umgebungen
> sind zwei getrennte Static Web Apps, je mit eigenem Token.

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
> 68 auf 15 MB, weil die aufgelösten Symlinks jedes Paket doppelt enthielten. der Deploy prüft das
> Staging-Verzeichnis vor dem Zippen auf verbliebene Symlinks und bricht ab, statt ein kaputtes ZIP
> hochzuladen.
>
> Für SWA gibt es keinen Portal-Upload und kein Kudu; die CLI ist der einzige Weg außerhalb einer
> Pipeline.
>
> Anders als [`scripts/deploy-cloudflare.mjs`](../scripts/deploy-cloudflare.mjs) (CI-getrieben, Build ist ein
> eigener Job-Step) **baut das Script selbst** — ein altes `dist/` würde still veralteten Code deployen.
> Beim Prod-Deploy hat `pnpm verify` schon gebaut; dann wird der Build nicht wiederholt.
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

## 8. Die zweite Umgebung

Nach Schritt 7 läuft **eine** Umgebung. Die zweite ist kein zweites Runbook, sondern sechs Ergänzungen —
alles andere wird geteilt. Konvention: Prod ohne Suffix, Dev mit `-dev`.

| # | Was | Wie |
| --- | --- | --- |
| 1 | **App Service** | Neue Web App `<name>-dev` **im selben App-Service-Plan** (Portal: _Create Web App_ → bestehenden Plan wählen). Zwei Apps auf einem B1-Plan starten unabhängig; `Always On` und Node 24 wie in [Schritt 3](#3-app-service). |
| 2 | **App settings** | Dieselbe Tabelle wie in [Schritt 3](#environment-variables--app-settings-nicht-connection-strings), nur `PGDATABASE=app_dev` und `PGUSER=<name>-dev`. `ENTRA_*` sind **identisch** — die Registrierung ist geteilt. |
| 3 | **Datenbank** | `CREATE DATABASE app_dev;` auf dem bestehenden Server. Kein zweiter Server: die Firewall und der Entra-Admin sind schon eingerichtet. |
| 4 | **Rolle + Rechte** | `db:migrate` und `db:grant` gegen `app_dev` mit der Identity der neuen App — die Befehle aus [Schritt 4](#4-datenbank-füllen), mit `PGDATABASE=app_dev` und `API_IDENTITY_*` der neuen Web App. |
| 5 | **Static Web App** | Zweite SWA (Standard), Backend-Link auf `<name>-dev` wie in [Schritt 5](#5-static-web-app). Eine SWA proxied genau **ein** Backend, deshalb braucht jede Umgebung ihre eigene. |
| 6 | **Redirect-URI** | Die Origin der neuen SWA in die **bestehende** SPA-Registrierung eintragen — exakt die Origin, `https://`, kein Pfad, kein Slash am Ende. |

Danach `environments` in [`.unitix/project.json`](../.unitix/project.json) um den zweiten Block ergänzen
(Schema in [Schritt 6](#6-deployen)) und die Firewall abgleichen:

```bash
pnpm db:firewall             # setzt die Outbound-IPs BEIDER App Services
```

`db:firewall` hat bewusst kein `--env`: die Firewall gehört dem Server, und der wird geteilt. Pro
Umgebung abgeglichen würde ein Dev-Lauf die Regeln von Prod löschen und die Produktions-API binnen
Minuten von der Datenbank trennen. Existiert eine der beiden Apps noch nicht, meldet das Script das und
verlangt `--allow-partial`, statt still die Regeln der fehlenden Umgebung zu entfernen.

**Warum eine geteilte Entra-Registrierung?** Vite backt den `entra`-Block ins Bundle, und `redirectUri`
ist `window.location.origin`. Mit einer Registrierung ist derselbe Build für beide Umgebungen gültig —
`pnpm build` einmal, nach Dev und nach Prod deployen. Getrennte Registrierungen würden zwei nicht
austauschbare Artefakte erzwingen und die Verwechslungsgefahr genau dort einbauen, wo sie am teuersten
ist.

**Was geteilt bleibt und was das kostet:** PITR läuft pro **Server**. Ein Dev-Restore erzeugt einen
Klon-Server mit beiden Datenbanken, aus dem man die gewünschte dumpt. Braucht ein Projekt unabhängiges
Restore, ist das ein zweiter PostgreSQL-Server — eine Änderung im `environments`-Block, kein Code-Umbau.

## Optional: Entra External ID statt Entra ID

Nur relevant, wenn sich **firmenfremde Personen selbst registrieren** sollen — Kunden, Lieferanten,
Mitglieder. Der Normalfall (Mitarbeitende des eigenen Mandanten) braucht diesen Abschnitt nicht.

External ID ist ein **separater Mandant** neben dem Arbeitsmandanten. Der Grund ist nicht der Preis
(50.000 monatlich aktive Nutzer sind in beiden Modellen kostenlos), sondern: Self-Service-Sign-up mit
lokalen Konten gibt es **nur dort**, und externe Personen werden so nie Objekte im eigenen
M365-Verzeichnis — keine Adresslisten-Einträge, keine Teams-Zugriffe, kein Offboarding-Problem.

Der Ablauf im Code ist **derselbe** wie bei Entra ID — nur die Microsoft-Adressen unterscheiden sich.
Deshalb ändert sich keine Zeile Code, nur drei Konfigurationswerte.

**Dieser Abschnitt ersetzt [Schritt 1](#1-entra-zwei-app-registrierungen)**, er ergänzt ihn nicht.
Die Schritte 2–7 bleiben unverändert.

### Was anzulegen ist

**a) Externen Mandanten anlegen.** _Portal → Microsoft Entra ID → Create a tenant_ → Typ
**External**. Subdomain und Directory (tenant) ID notieren.

> Braucht die Rolle **Tenant Creator** im Arbeitsmandanten. Sie erzeugt ausschließlich neue,
> separate Verzeichnisse und gibt **keine Rechte im bestehenden Mandanten**.

> **Den Mandanten mit einer Subscription verknüpfen** — ein eigener, leicht übersehener Schritt.
> Ohne ihn läuft External ID nur **30 Tage** als Testversion und hört danach auf zu funktionieren.

**b) Zwei App-Registrierungen** im **externen** Mandanten anlegen — Klickpfad identisch zu
[Schritt 1a/1b](#1-entra-zwei-app-registrierungen): API-Registrierung mit _Expose an API_ →
`access_as_user` und `requestedAccessTokenVersion` auf **`2`**, SPA-Registrierung mit Plattform
**_Single-page application (SPA)_**.

> Achte darauf, im **externen** Mandanten zu sein, nicht im Arbeitsmandanten. Der Mandantenwechsel
> oben rechts im Portal ist die häufigste Fehlerquelle — die Registrierungen sehen identisch aus.

**c) User Flow anlegen.** _External Identities → User flows → + New user flow_ → _Sign up and sign
in_, Identitätsanbieter **Email with password**. Danach im Flow unter _Applications_ → **Add
application** die **SPA**-Registrierung zuordnen.

> **Der einzige Schritt, den workforce Entra nicht kennt** — und der einzige, der lautlos scheitert.
> Ohne die Zuordnung ist die App-Registrierung allein wirkungslos: der Login bricht ab, obwohl alle
> Werte stimmen.

**d) Redirect-URIs** in der SPA-Registrierung: `http://localhost:5173` und die SWA-Domain aus
[Schritt 5](#5-static-web-app). Exakt, inklusive Port, ohne Slash am Ende.

**e)** _Optional:_ MFA über Conditional Access.

> ⚠️ **Authenticator/TOTP gibt es in externen Mandanten nicht.** Verfügbar sind nur E-Mail-OTP, SMS
> (kostenpflichtig, ~0,03 $ pro Versuch) und **Passkey/FIDO2**. Wer TOTP bereits zugesagt hat, muss
> das zurücknehmen — Passkey ist der bessere Ersatz.

### Die eine zusätzliche Angabe

Statt der Werte-Tabelle aus Schritt 1 — `entra.tenantId`, `entra.clientId` und `entra.apiAudience`
werden **genauso** befüllt, nur aus den Registrierungen des externen Mandanten. Zusätzlich kommt dieser
eine Wert dazu, wie in Schritt a notiert:

| Wert      | wohin                                                       |
| --------- | ----------------------------------------------------------- |
| Subdomain | `project.json → entra.subdomain`, z. B. `contoso`           |

Wie alle anderen folgt er dem Namens-Vertrag: in Azure heißt er `ENTRA_SUBDOMAIN`
([Schritt 3](#environment-variables--app-settings-nicht-connection-strings)).

Authority der SPA, erwarteter Aussteller (`iss`) und Schlüssel-Liste (`jwks_uri`) werden daraus
automatisch gebildet — [`auth.ts`](../apps/web/src/data/adapters/azure/auth.ts) und
[`verify.ts`](../apps/api/src/auth/verify.ts):

| Wert                  | Host      | Format                                                              |
| --------------------- | --------- | -------------------------------------------------------------------- |
| Authority der SPA     | Tenant-ID | `https://<tenant-id>.ciamlogin.com/<tenant-id>`                     |
| Erwarteter Aussteller | Tenant-ID | `https://<tenant-id>.ciamlogin.com/<tenant-id>/v2.0`                |
| Schlüssel-Liste       | Subdomain | `https://<subdomain>.ciamlogin.com/<tenant-id>/discovery/v2.0/keys` |

> **Der Host-Unterschied ist kein Tippfehler**, sondern Microsofts tatsächliches Verhalten:
> Aussteller trägt die Tenant-ID als Host, Schlüssel-Liste die Subdomain. Verwechselt man sie beim
> Nachbauen von Hand, meldet man sich erfolgreich an und bekommt trotzdem auf jeden Request `401`.
> Die Authority der SPA nutzt ebenfalls die Tenant-ID statt der Subdomain als Host — siehe die
> Warnung unten.

Bleiben `entra.subdomain` und `ENTRA_SUBDOMAIN` leer, verhält sich alles wie mit workforce Entra ID
— der Wert ist optional, es gibt keinen Schalter und keinen zweiten Modus.

> [!WARNING]
> Ohne Gegenmaßnahme scheitert `ensureSignedIn()` mit `endpoints_resolution_error`: MSAL prüft den
> vom Mandanten gemeldeten Aussteller gegen die konfigurierte Authority und stolpert über den
> Host-Unterschied von oben ([msal-browser #8592](https://github.com/AzureAD/microsoft-authentication-library-for-js/issues/8592),
> betrifft das hier eingesetzte v5). [`auth.ts`](../apps/web/src/data/adapters/azure/auth.ts)
> verwendet deshalb von vornherein die **Tenant-ID auch als Host** —
> `https://<tenant-id>.ciamlogin.com/<tenant-id>` —, fest verdrahtet, nicht konfigurierbar. Die
> Subdomain wird dafür nicht gebraucht, nur für die Schlüssel-Liste der API.

Die CSP in [`staticwebapp.config.json`](../apps/web/public/staticwebapp.config.json) erlaubt
`https://*.ciamlogin.com` bereits — daran ist nichts zu tun.

### Weitere Mandanten anbinden (Federation)

Für zwei Fälle: **Kundenfirmen, die ihren eigenen Entra-Mandanten mitbringen**, und **SSO für die
eigenen Mitarbeitenden**. Technisch dasselbe, beliebig oft wiederholbar, kostenlos.

Wichtig: **kein zweiter Mandant in der Konfiguration, keine Codeänderung.** Die App zeigt weiter nur
auf den externen Mandanten; die Arbeits-Mandanten werden _in_ ihm als Identitätsanbieter hinterlegt
und sind damit nur vorgelagert. Die App bekommt in allen Fällen ein Token des externen Mandanten —
`entra.subdomain` und `ENTRA_SUBDOMAIN` bleiben unverändert.

Auf der Anmeldeseite steht dann E-Mail + Passwort für Selbst-Registrierer, daneben je ein Knopf
_Sign in with &lt;Firma&gt;_. Pro anzubindendem Mandanten einmal:

1. **Im Arbeitsmandanten** eine App-Registrierung für den externen Mandanten: _Supported account
   types_ = _Accounts in this organizational directory only_, Plattform **Web** mit den Redirect-URIs
   `https://<subdomain>.ciamlogin.com/<tenant-id>/federation/oauth2` und
   `https://<subdomain>.ciamlogin.com/<subdomain>.onmicrosoft.com/federation/oauth2`. Dazu ein
   **Client Secret** (Wert notieren, nicht die Secret-ID), unter _API permissions_ die
   Graph-_Delegated_-Rechte `email`, `openid`, `profile`, `User.Read` **mit Admin Consent**, und
   unter _Token configuration_ den **`email`-Claim**.

    > Ohne den `email`-Claim scheitert jede Anmeldung mit _„No email address was obtained from the
    > external OIDC identity provider."_ — und die App braucht die Adresse ohnehin, um den Nutzer
    > fachlich zuzuordnen.

2. **Im externen Mandanten** _External Identities → All identity providers → Custom → New OpenID
   Connect provider_:

    | Feld                | Wert                                                                                    |
    | ------------------- | --------------------------------------------------------------------------------------- |
    | Well-known endpoint | `https://login.microsoftonline.com/organizations/v2.0/.well-known/openid-configuration` |
    | OpenID Issuer URI   | `https://login.microsoftonline.com/<arbeits-tenant-id>/v2.0`                            |
    | Client ID / Secret  | aus Schritt 1                                                                           |
    | Scope               | `openid profile`                                                                        |
    | Response type       | `code`                                                                                  |

3. **Den Provider dem User Flow hinzufügen** — nicht nur dem Mandanten.

    > Häufigster Fehler: Provider angelegt, aber nicht am Flow → der Knopf erscheint nie auf der
    > Anmeldeseite. Fehlercode `40015` heißt dagegen das Gegenteil: der Provider wurde erreicht, aber
    > Issuer oder Endpunkte passen nicht exakt zu seinem Discovery-Dokument.

> **Das Client Secret läuft ab** und muss rotiert werden — der einzige Ablauftermin in diesem Setup.
> Es lebt im Portal, nicht im Repo; die Regel „keine Secrets im Repo" bleibt unberührt.

> **External ID vertraut einem im Arbeitsmandanten durchgeführten MFA nicht.** Mitarbeitende können
> ein zweites Mal zur MFA aufgefordert werden, obwohl sie im Heimat-Mandanten bereits eine gemacht
> haben. Ansonsten greifen dessen Conditional-Access- und MFA-Regeln vollständig.

Quelle für diesen Unterabschnitt:
[Microsoft Learn — Add Microsoft Entra ID for customer sign-in](https://learn.microsoft.com/en-us/entra/external-id/customers/how-to-entra-id-federation-customers).

## Lokal entwickeln

Zwei Modi, **keine lokale Datenbank** in beiden:

```bash
pnpm dev          # platform: mock — kein Login, kein Backend, Seed-Adapter. Normalfall für UI-Arbeit.

pnpm db:migrate   # platform: azure — Schema auf der Dev-Datenbank
pnpm dev:full     # API :3000 + SPA :5173 — braucht PGUSER in der Root-.env
```

**Eine Zeile Konfiguration, mehr nicht.** [`env.ts`](../apps/api/src/env.ts) liest `PG*` und `ENTRA_*`
direkt aus [`.unitix/project.json`](../.unitix/project.json) — außer `PGUSER`: in Azure ist das die
Managed Identity, lokal dein UPN. Deshalb steht genau dieser Wert in der Root-`.env` (Vorlage:
[`.env.example`](../.env.example)) und überschreibt den Default aus der Datei:

```dotenv
PGUSER=<dein-upn>
```

`pnpm dev` startet gar keine API und braucht auch das nicht. Fehlt `PGUSER` bei `dev:full` oder
`db:*`, zeigt die Ziel-Zeile beim Start (`→ Ziel: …`) den Namen der Web App statt deiner Adresse —
daran ist es sofort zu erkennen.

Eine `apps/api/.env` gibt es **nicht** und darf es nicht geben: `pnpm verify` bricht ab, wenn eine
auftaucht (Begründung in [Schritt 6](#6-deployen)).

Der azure-Modus läuft passwortlos gegen die **Dev-Datenbank in Azure** (`az login` statt Passwort,
Firewall-Regel für deine IP). Vorteil gegenüber lokalem Postgres: es testet dieselbe
Authentifizierung wie Produktion — es gibt gar keinen zweiten Anmeldeweg im Code. Vite proxied
`/api` lokal, dieselbe Origin-Situation wie in Azure, deshalb steckt keine API-Basis-URL im Bundle.

**Dev ist hier nicht der Default, sondern die einzige Option:** [`env.ts`](../apps/api/src/env.ts) liest
fest `environments.dev`, eine Umschalt-Variable existiert nicht. Wer wirklich einmal gegen Prod lesen
muss, setzt `PGDATABASE`/`PGUSER` inline — dann steht das Ziel sichtbar im Befehl.

**Schema ändern:** `pnpm db:generate` (SQL offline aus `schema.ts`) → `pnpm db:migrate`. Die Files
unter `apps/api/drizzle/` gehören ins Repo.

## Scope

Der Stack läuft von Hand. Bewusst **noch nicht** automatisiert:

- **Provisioning** (Bicep/Script) — diese Datei ist die Vorlage: jeder Klickpfad wird dort eine Zeile
- **CI/CD** über GitHub Actions — dann per **OIDC (federated credential)**, nie per Client-Secret;
  die Migration braucht eine temporäre Firewall-Regel für die wechselnde Runner-IP. `pnpm db:firewall`
  ([Schritt 3](#firewall-der-db-auf-die-api-ips-abgleichen)) läuft dort unverändert mit und ist der
  Ort, an dem der Abgleich am Ende hingehört: ein Schritt im Deploy-Job, und Drift kann keine
  Deploy-Runde überleben. Solange das aussteht, deployt `pnpm deploy:dev` / `pnpm deploy:prod` lokal —
  die Gates sitzen deshalb im Script und nicht in der Pipeline
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
