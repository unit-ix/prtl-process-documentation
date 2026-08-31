# Azure-Architektur und Entscheidungen

Dieses Dokument beschreibt den Stack und begründet ihn. Den Klickpfad Schritt für Schritt liefert
[`azure-runbook.md`](azure-runbook.md), die verbindlichen Code-Regeln stehen in
[`patterns-azure.md`](../.claude/docs/patterns-azure.md), das Umgebungsmodell in
[`environments.md`](environments.md).

---

## Architektur im Überblick

Der Browser lädt die SPA aus einer Static Web App. Die SWA leitet `/api/*` an den App Service weiter,
für den Browser bleibt das same-origin. Dort läuft die Node-API und spricht einen PostgreSQL Flexible
Server.

Die Anmeldung läuft über Entra ID. Die SPA holt ein Token für die API-Registrierung, die API prüft
Aussteller, Audience und Scope. An der Datenbank meldet sich die API mit ihrer Managed Identity an.
Der Stack enthält damit kein Passwort und kein Secret.

### Was dev und prod teilen

| Ressource | dev / prod |
| --- | --- |
| App-Service-Plan | geteilt |
| PostgreSQL-Server | geteilt |
| Entra-Registrierung | geteilt |
| Storage-Konto und CORS-Regel | geteilt |
| App Service | getrennt |
| Datenbank und DB-Rolle | getrennt |
| Static Web App | getrennt |
| Blob-Container | getrennt |

Zwei Apps auf einem B1-Plan starten unabhängig, der bestehende App-Service-Plan genügt also. Am
PostgreSQL-Server sind Firewall und Entra-Admin schon eingerichtet, es kommt nur eine Datenbank dazu.
Eine SWA proxied genau ein Backend, deshalb braucht jede Umgebung ihre eigene. Die Dev-Umgebung
kostet damit nur die zweite Static Web App. Welche Umgebung das Runbook einrichtet, entscheiden
allein die eingesetzten Namen. Umgebungen sind Deploy-Ziele und keine Branches, siehe
[`environments.md`](environments.md).

### Regionen

App Service und PostgreSQL gehören in eine Region, damit die Latenz zwischen API und DB innerhalb der
Region bleibt. Germany West Central ist für kleine Subscriptions oft gesperrt. Die Alternativen sind
unter DSGVO gleichwertig. Die SWA liegt separat in West Europe, weil Azure sie nur in wenigen
Regionen anbietet. Ausgeliefert wird ohnehin global über das Edge-Netz.

### Was nicht dazugehört

Application Insights, AI Foundry, Entra External ID und Key Vault gehören nicht zum Grundstack. Blob
Storage kommt dazu, sobald das Projekt Dateien speichert. Key Vault entfällt per Design: der App
Service erreicht die DB über seine Managed Identity, es gibt kein Secret zu verwahren.

### Rechte zum Einrichten

Du brauchst Owner auf der Resource Group. Contributor darf keine Rollenzuweisungen setzen, und ohne
Rollenzuweisung gibt es keinen passwortlosen DB-Zugang. Azure CLI und `az login` brauchst du für die
Migration: darüber holt sich `DefaultAzureCredential` ein DB-Token.

Die Static Web App läuft im Standard-Plan. Der Free-Plan kann keinen `/api/*`-Proxy auf einen App
Service verknüpfen.

---

## Scope

Der Stack läuft von Hand: jeder Schritt im Portal oder in der Shell. Erst verstehen, dann
automatisieren. Offen und in dieser Reihenfolge dran:

- Provisioning über Bicep oder Script. Das Runbook ist die Vorlage, jeder Klickpfad wird dort eine
  Zeile.
- CI/CD über GitHub Actions, dann per OIDC statt per Client-Secret. Die Migration braucht eine
  temporäre Firewall-Regel für die wechselnde Runner-IP. `pnpm db:firewall` läuft dort unverändert
  mit und gehört als Schritt in den Deploy-Job, dann überlebt Drift keine Deploy-Runde. Bis dahin
  deployen `pnpm deploy:dev` und `pnpm deploy:prod` lokal, die Gates sitzen deshalb im Script.
- MFA-Policy im Mandanten über Conditional Access.
- PITR-Restore einmal wirklich testen. HA ersetzt kein Backup. Zum Restore gehört
  `pnpm db:firewall`, denn ein wiederhergestellter Server startet ohne jede Firewall-Regel.

---

## Entra

### Application ID URI und Scope-Name sind festgelegt

Beide Formen liegen fest. Die SPA setzt den Scope aus der Client-ID zusammen zu
`api://<client-id>/access_as_user`, die API prüft den Scope-Namen als Konstante. Änderst du URI-Form
oder Scope-Namen, ändere beide Code-Stellen mit:
[`auth.ts`](../apps/web/src/data/adapters/azure/auth.ts),
[`verify.ts`](../apps/api/src/auth/verify.ts). Dafür trägt die Konfiguration keinen redundanten
Scope-String, der still zur Client-ID driften könnte. Der Vorschlag `api://<appId>` bleibt deshalb
unverändert.

### `requestedAccessTokenVersion: 2`

Dieser Manifest-Schritt wird oft übersehen. Ohne ihn kommen v1-Token, deren `iss` nicht auf `/v2.0`
endet. Jede Prüfung schlägt dann fehl, obwohl das Token echt ist.

### Plattform-Typ SPA, niemals Web

Das Dropdown steht per Default auf _Web_. Im Portal sieht das richtig aus, das Einlösen des
Auth-Codes scheitert aber später. Umbenennen geht nicht: lösche die Plattform und lege sie neu an.

### `entra.apiAudience` ist die Client-ID der API

v2-Token tragen die reine GUID im `aud`. Gemeint ist die Client-ID der API-Registrierung, nicht die
der SPA und nicht die `api://…`-URI. Mit dem falschen Wert meldest du dich erfolgreich an und
bekommst trotzdem `401`, denn [`verify.ts`](../apps/api/src/auth/verify.ts) vergleicht exakt.

### Die drei Entra-Werte stehen nur in `project.json`

Sie sind committet, weil sie öffentliche Identifikatoren sind. In Azure bekommt die API sie als App
settings mit denselben Namen, lokal liest sie sie direkt aus der Datei. Drei Werte, drei
_Overview_-Seiten: unter _API permissions_ musst du nichts zusammensuchen.

Die SPA bekommt keine `.env`. Vite backt `VITE_*` beim Build als Literale ins Bundle, eine
committete und typisierte Konfiguration ist also die klarere Form. Der Build bleibt aus dem Repo
allein reproduzierbar. Ein leerer Block lässt die SPA sofort mit klarer Meldung scheitern, siehe
[`auth.ts`](../apps/web/src/data/adapters/azure/auth.ts).

---

## Datenbank

### Entra-only am PostgreSQL-Server

„Entra authentication only" ist der wichtigste Schalter. Der Default wäre Passwort-Auth, und dieses
Passwort müsste irgendwo liegen. Setze dabei den Entra-Admin, sonst kommt anschließend niemand mehr
auf den Server, auch du nicht.

Die Checkbox „Allow public access from any Azure service…" bleibt aus. Sie klingt intern, lässt laut
Doku aber jeden fremden Tenant und jede fremde Kunden-Subscription durch. Eine vorhandene
`0.0.0.0`-Regel meldet `pnpm db:firewall` nur, denn er löscht ausschließlich eigene Regeln.

### `db:firewall` gleicht die Outbound-IPs ab

[`scripts/sync-db-firewall.mjs`](../scripts/sync-db-firewall.mjs) liest
`possibleOutboundIpAddresses`, also alle IPs, die die App in ihrer Deployment-Unit je nutzen kann.
Das Portal-Feld _Outbound addresses_ zeigt nur die momentan benutzten, und eine solche Liste bricht
beim nächsten Scaling still. B1 → B2 → S1 → P1v3 ändert an der Firewall nichts. Scale-out über die
Instanzzahl ändert die Outbound-IPs ohnehin nie.

Der Regelname trägt die IP, etwa `api-outbound-20-79-1-2`. Der Abgleich ist damit ein reiner
Mengenvergleich und beliebig oft wiederholbar. Das Script verwaltet nur Regeln mit diesem Präfix,
die Regel für den eigenen Rechner überlebt jeden Lauf.

Der erste Lauf dauert. Je Deployment-Unit sind es typischerweise 30–40 Adressen, im Template 38 bei
20 aktuell benutzten. Jede Regel ist eine eigene ARM-Operation auf demselben Server, und parallel
quittiert Azure das mit einem Conflict. Das Script arbeitet deshalb seriell. Jeder weitere Lauf ist
ein Vergleich ohne Änderung. Fehlen die IPs, sieht der Fehler im Log wie ein Timeout aus.

`db:firewall` hat kein `--env`, denn den Server teilen sich beide Umgebungen. Pro Umgebung
abgeglichen würde ein Dev-Lauf die Regeln von Prod löschen und die Produktions-API binnen Minuten
von der Datenbank trennen. Fehlt eine der beiden Apps noch, meldet das Script das und verlangt
`--allow-partial`.

### Kein Premium V4

Pv4 hat keinen stabilen Satz von Outbound-IPs. ARM liefert für `outboundIpAddresses` und
`possibleOutboundIpAddresses` leere Strings. Dann trägt keine IP-Liste mehr, es braucht
VNet-Integration plus NAT Gateway. `pnpm db:firewall` bricht in diesem Fall mit genau dieser
Begründung ab, statt eine leere Firewall zu hinterlassen.

### Schema und Rechte sind SQL

Diese beiden Schritte gibt es im Portal nicht. Ein Passwort brauchen sie nicht:
`DefaultAzureCredential` zieht das Token aus der `az login`-Sitzung. Beide Befehle laufen deshalb vom
eigenen Rechner, dessen IP auch die Firewall-Regel trägt.

`db:migrate` spielt ein, was als SQL unter `apps/api/drizzle/` liegt. Erzeugt wird das offline aus
`schema.ts`. Ersetzt du die Demo-Domäne durch das echte Modell, generiere `0000` neu, statt eine
Änderungs-Migration auf das Demo-Schema zu stapeln.

Es sind zwei Befehle, weil sie sich grundverschieden verhalten:

| Befehl | wann | wiederholbar |
| --- | --- | --- |
| `pnpm db:migrate` | bei jeder Schema-Änderung | so weit wie die Migrationen selbst |
| `pnpm db:grant` | einmal pro Umgebung | ja, vollständig idempotent |

Erst migrieren, dann granten. `GRANT … ON ALL TABLES` erwischt nur, was zum Zeitpunkt des Laufs
existiert, dafür unabhängig vom Erzeuger. Sonst hinge das Ergebnis daran, dass dieselbe Person auch
jede künftige Migration ausführt. `db:grant` ist damit das Reparatur-Werkzeug nach einer fremden
Migration, und es fasst keine Daten an. Die Identity bekommt Lesen und Schreiben auf genau dieser
einen Datenbank. Server-Administrator wird sie nie.

`db:grant` verbindet sich zusätzlich kurz auf die Wartungs-Datenbank `postgres`. Nur dort liegen die
`pgaadauth_*`-Funktionen, mit denen die Entra-Rolle entsteht. In `app` fehlen sie, und
`CREATE EXTENSION pgaadauth` ist dort über die Extension-Allow-List gesperrt. Rollen gelten
serverweit, `postgres` ist also der einzige Ort mit diesem Aufruf. `PGDATABASE` bleibt die
Ziel-Datenbank, denn die Rechte danach gelten pro Datenbank.

### `db:migrate` direkt aufgerufen ist ungeschützt

> [!WARNING]
> `db:migrate` spielt jede Migration ein, die gerade im Arbeitsverzeichnis liegt, auch die aus einem
> Feature-Branch. Steckt darin ein `DROP COLUMN`, sind die Daten weg.

Ohne Prefix trifft der Befehl Dev. Mit `PGHOST`/`PGDATABASE`-Prefix trifft er, was du hinschreibst.
Gegen Produktion läuft er nur über `pnpm deploy:prod`. Das prüft vorher Branch und Sync-Stand, lässt
`pnpm verify` laufen und bricht bei destruktivem DDL ab. Gemeint sind `DROP COLUMN`, `DROP TABLE`,
`TRUNCATE` und `ALTER COLUMN … TYPE` in den Migrationen seit dem letzten `prod-*`-Tag. Überstimmen
kannst du das nur mit `--allow-destructive`, Details in
[`environments.md`](environments.md#die-prod-gates).

Als Sicherheitsnetz gibt `db:migrate` vor dem Lauf `→ Ziel: <user>@<host>/<db>` aus. Diese Zeile
liest du zweimal. Sie steht auch da, wenn das Ziel aus der Datei kam.

### Beim Einrichten stehen die Ziele inline im Befehl

Das Ziel steht dabei besser sichtbar im Befehl als still in einer Datei. Im laufenden Betrieb
entfällt das: `pnpm deploy:dev` und `pnpm deploy:prod` spielen die Migrationen als Schritt 1
selbst ein und nehmen Host und Datenbank aus dem `environments`-Block. Die Reihenfolge „migrieren,
dann deployen" ist dort strukturell erzwungen.

`pnpm db:migrate` ohne Prefix zeigt immer auf Dev. [`env.ts`](../apps/api/src/env.ts) liest fest
`environments.dev`, eine Umschalt-Variable gibt es nicht. Inline-Werte schlagen die Defaults, beides
mischt sich also gefahrlos.

### `API_IDENTITY_*` gehören in keine Datei

`API_IDENTITY_NAME` und `API_IDENTITY_OBJECT_ID` gelten dem einen `db:grant`-Lauf. Sie beschreiben
die Identity der Ziel-Web-App statt der eigenen Arbeitsumgebung, und die laufende API liest sie nie.
Sie gehören deshalb weder in die `.env` noch in `project.json`, und
[`env.ts`](../apps/api/src/env.ts) kennt sie nicht.

---

## App Service

### `Always On` und `FTP state`

`Always On` steht per Default auf _Off_, dann gibt es nach 20 Minuten Leerlauf einen Kaltstart.
`FTP state` steht per Default auf `FTP + FTPS` und lässt damit einen zweiten Deploy-Weg offen.

### Kein Startup Command

`apps/api/package.json` hat `"start": "node dist/server.js"`, und `pnpm deploy` legt `dist/` flach im
ZIP ab.

### Ein Wert, ein Name

Jede Variable heißt genauso wie ihr Feld in [`.unitix/project.json`](../.unitix/project.json), Regel
`<block>.<key>` → `<BLOCK>_<KEY>`. Es gibt nichts herzuleiten, nur zu kopieren. Die Werte gehören
unter _App settings_, die _Connection strings_ bleiben leer.

### Kopieren statt generieren

`project.json` wird nicht mitdeployed. In Azure gibt es keine Datei, aus der die API lesen könnte.
Die Konfiguration einer laufenden Instanz gehört in ihre Umgebung und nicht in ihr Artefakt. Lokal
liest [`env.ts`](../apps/api/src/env.ts) dieselben Werte direkt aus der Datei, deshalb steht dort nur
`PGUSER` in der `.env`, also der eigene UPN statt der Managed Identity. Auf beiden Seiten schlägt ein
gesetztes App setting den Wert aus der Datei.

Die Start-Zeile `Datenbank-Ziel: <user>@<host>/<db>` ist die Gegenprobe. Steht dort etwas
Unerwartetes, fehlt ein App setting oder ist falsch.

### Die zwei Plattform-Schalter

`WEBSITE_RUN_FROM_PACKAGE=1` mountet das ZIP read-only, statt es zu entpacken.
`SCM_DO_BUILD_DURING_DEPLOYMENT=false` verhindert einen Oryx-Rebuild, denn das ZIP ist fertig.

### Was ungesetzt bleibt

`PORT`, `PGPORT`, `RATE_LIMIT_MAX`, `BODY_LIMIT_BYTES` und `ALLOWED_ORIGIN` haben in
[`env.ts`](../apps/api/src/env.ts) Defaults und bleiben ungesetzt. Sie stehen deshalb auch nicht in
`project.json`. Bei `ALLOWED_ORIGIN` heißt der Default „keine Cross-Origin-Requests". Das passt,
solange die SWA `/api/*` same-origin proxied. Laufen Web und API auf getrennten Origins, trage die
Web-Origin ein: genau eine, kein Wildcard.

### Der Name der Web App ist die DB-Rolle

Azure benennt die Managed Identity nach der Web App, und dieser Name ist die DB-Rolle. Er steht in
`project.json` deshalb zweimal, als `azure.apiAppName` und als `pg.user`. Der Deploy warnt, wenn die
beiden auseinanderlaufen.

Aus dem `azure`-Block nehmen `pnpm deploy:dev`, `pnpm deploy:prod` und `pnpm db:firewall` ihr Ziel.
Den Server-Namen der DB leitet `db:firewall` aus `pg.host` ab, ein eigenes Feld braucht er nicht.

---

## Static Web App

### Deployment source „Other"

Sonst legt das Portal ungefragt einen GitHub-Workflow im Repo an.

### Fehlt der Backend-Link, kommt ein echtes 404

Ohne Link hat die SWA kein Ziel für `/api/*`. Die Konfiguration nimmt `/api/*` aus der
`navigationFallback` heraus, deshalb kommt ein echtes 404 statt der index.html, siehe
[`staticwebapp.config.json`](../apps/web/public/staticwebapp.config.json). Der Backend-Link und die
Redirect-URI werden am häufigsten übersehen. Sie fallen erst beim Öffnen der fertigen App auf, dafür
mit je einem eindeutigen Symptom.

### Redirect-URI ist exakt die Origin

`https://`, kein Pfad, kein Slash am Ende. Die SPA sendet `window.location.origin`, siehe
[`auth.ts`](../apps/web/src/data/adapters/azure/auth.ts). `http://localhost:5173` bleibt daneben
stehen, beide Einträge gelten parallel und ersparen das Umschalten. Ein Rebuild entfällt, denn Entra
prüft gegen seine eigene Liste und nicht gegen das Bundle.

### SWA-Environment-variables bleiben leer

Sie speisen nur SWAs eigenen Oryx-Build, den wir nie auslösen. Die SPA-Konfiguration steht in
`.unitix/project.json` und ist beim Build schon im Bundle. Eine Änderung dort wirkt erst nach Rebuild
und Redeploy. Das ist die Grenze einer statischen SPA.

---

## Deploy

### Ein Script für alle drei Schritte

Die Reihenfolge ist sicherheitsrelevant: Migrationen laufen vor dem Deploy, denn neuer Code auf altem
Schema stirbt beim ersten Query. Außerdem existieren die Prod-Gates so genau einmal statt in zwei
Scripten oder in einem dritten, das man umgehen kann. Die Ressourcennamen im `environments`-Block
sind wie die des `entra`-Blocks keine Secrets. `--only=web` vermeidet den API-Neustart, der Sekunden
Downtime kostet.

### Was `deploy-azure.mjs` tut

[`scripts/deploy-azure.mjs`](../scripts/deploy-azure.mjs) führt die Schritte aus, die vorher von Hand
im Runbook standen:

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

Das `--env production` der SWA-CLI benennt die Umgebung innerhalb einer Static Web App, also
production statt Preview. Mit unserem `--env=dev|prod` hat es nichts zu tun. Unsere Umgebungen sind
zwei getrennte Static Web Apps, je mit eigenem Token.

`pnpm deploy` ist hier das eingebaute pnpm-Kommando und nicht `deploy:cloudflare`. Es zieht das
Workspace-Package flach aus den Symlinks. `--prod` lässt die devDependencies `typescript`, `tsx`,
`drizzle-kit` und `@types/*` aus dem ZIP: kleinerer Upload, schnelleres Mounten unter
`WEBSITE_RUN_FROM_PACKAGE=1`, kein Build-Werkzeug im Produktions-Runtime. `--legacy` ist die alte
`deploy`-Semantik. Ohne das Flag verlangt pnpm 10 `inject-workspace-packages=true`.

Für SWA gibt es keinen Portal-Upload und kein Kudu, außerhalb einer Pipeline ist die CLI der einzige
Weg. Die Deployment-Token lädt `deploy-azure.mjs` über Nodes `--env-file-if-exists` aus der
Root-`.env`.

### Die Token-Namen tragen die Umgebung

Ein unsuffixierter `SWA_DEPLOYMENT_TOKEN` wird nicht akzeptiert. Der Name nennt die Umgebung, damit
beim Prod-Deploy feststeht, welche SWA gemeint ist.

### Nur eine `.env`, und die liegt im Root

`pnpm deploy` kopiert das Package-Verzeichnis. Eine `apps/api/.env` würde also im Deploy-ZIP landen
und in Azure still Werte liefern, die aus den App settings kommen sollen. Sie ist deshalb im
`verify`-Gate geblockt, und der Deploy bricht ab, falls doch eine im Staging-Verzeichnis auftaucht,
siehe [`scripts/check-env-secrets.mjs`](../scripts/check-env-secrets.mjs).

Das Bundle erreicht die Datei nie: Vite lädt `.env` relativ zu `apps/web/`, und selbst dort landen
nur `VITE_`-Variablen im Client-Code.

### `--config.node-linker=hoisted`

Dieses Flag entscheidet über lauffähig oder kaputt. pnpms Standard-Layout legt in `node_modules/`
nur Symlinks nach `node_modules/.pnpm/<paket>/` ab, und dort liegen auch die
Geschwister-Dependencies. `zip` löst Symlinks per Default auf und kopiert den Inhalt an die
Symlink-Stelle. Das Paket verliert damit seine Geschwister. Die API startet dann lokal einwandfrei
und stirbt in Azure beim Start mit `ERR_MODULE_NOT_FOUND`.

`hoisted` erzeugt ein flaches `node_modules` aus echten Verzeichnissen. Nebeneffekt: das ZIP fällt
von 68 auf 15 MB, weil die aufgelösten Symlinks jedes Paket doppelt enthielten. Der Deploy prüft das
Staging-Verzeichnis vor dem Zippen auf verbliebene Symlinks und bricht ab, statt ein kaputtes ZIP
hochzuladen.

### Das Script baut selbst

Ein altes `dist/` würde still veralteten Code deployen.
[`scripts/deploy-cloudflare.mjs`](../scripts/deploy-cloudflare.mjs) baut dagegen nicht, dort ist der
Build ein eigener CI-Job-Step. Beim Prod-Deploy hat `pnpm verify` schon gebaut, dann wiederholt das
Script den Build nicht.

### Neustart und Smoke-Test

B1 hat keine Deployment-Slots, jedes Deployment ist deshalb ein Neustart von wenigen Sekunden. Der
wichtigste Punkt im Smoke-Test: `https://<web-app>.azurewebsites.net/api/contacts` ohne Token muss
`401` liefern. Die API ist damit auch direkt aufgerufen geschützt und nicht nur hinter dem
SWA-Proxy.

---

## Zweite Umgebung

### Eine geteilte Entra-Registrierung

Vite backt den `entra`-Block ins Bundle, und `redirectUri` ist `window.location.origin`. Mit einer
Registrierung ist derselbe Build für beide Umgebungen gültig: `pnpm build` einmal, nach Dev und nach
Prod deployen. Getrennte Registrierungen würden zwei nicht austauschbare Artefakte erzwingen und die
Verwechslungsgefahr genau dort einbauen, wo sie am teuersten ist. Die `ENTRA_*`-App-settings beider
Umgebungen sind deshalb identisch.

### Geteilter Server und PITR

PITR läuft pro Server. Ein Dev-Restore erzeugt einen Klon-Server mit beiden Datenbanken, aus dem du
die gewünschte dumpst. Braucht ein Projekt unabhängiges Restore, kommt ein zweiter PostgreSQL-Server
dazu. Das ist eine Änderung im `environments`-Block und kein Code-Umbau.

---

## Blob Storage

Das fachliche Konzept steht in [`blob-storage.md`](blob-storage.md): SAS-Ablauf, Invarianten,
Datenmodell und Restrisiken. Hier stehen die Setup-Entscheidungen.

### LRS statt GRS

Der Default ist _Geo-redundant storage_ und kostet das Doppelte.

### `Enable storage account key access` aus

Abgewählt existiert kein Account-Key mehr. Service- und Account-SAS werden mit `403` abgelehnt, nur
der User-Delegation-SAS funktioniert weiter, denn er hängt an Entra. Dasselbe Argument gilt bei
„Entra authentication only" am PostgreSQL-Server. Bei neuen Konten ist die Eigenschaft ungesetzt und
verhält sich wie „an", nimm den Haken also aktiv weg.

### Öffentlicher Netzwerkzugang statt Private Endpoint

Der Browser lädt direkt zum Blob, ein Private Endpoint würde das verhindern.

### CORS am Blob-Endpunkt

Der direkte Upload zum Blob-Endpunkt ist cross-origin. Ohne Regel scheitert er mit einem CORS-Fehler
in der Konsole und ohne jeden Server-Log. Die Origin-Liste ist dieselbe wie die der Redirect-URIs und
aus demselben Grund ohne `*`.

### Die beiden Rollen-Ebenen sind nicht vertauschbar

`Storage Blob Delegator` wirkt auf Konto-, RG- oder Subscription-Ebene, auf einem Container bleibt
die Rolle wirkungslos. Die Datenrolle bleibt trotzdem auf dem Container. Der Container ist damit die
Grenze: die Rechte eines SAS sind die Schnittmenge aus SAS-Rechten und RBAC der signierenden
Identität, geprüft bei jedem Request.

Owner auf der Resource Group gibt keinen Datenzugriff, denn Steuerungs- und Datenebene sind getrennt.
Ohne Datenrolle zeigt der Storage-Browser im Portal `AuthorizationPermissionMismatch`. Der übliche
Ausweg wäre der Account-Key, und der ist abgeschaltet. Umgekehrt zeigt die Datenrolle allein nur die
Daten. Für den Storage browser brauchst du zusätzlich die ARM-Rolle _Reader_.

### Einstieg immer über Access Control (IAM)

Einen Reiter _Members_ zum Vorab-Anklicken gibt es nicht. Er entsteht erst mit ausgewählter Rolle,
und ausgewählt heißt markierte Zeile. Tippst du nur den Namen ins Suchfeld, bleibt _Next_ grau und
der Assistent sieht aus, als hätte er nur einen Schritt. Über App Service → Identity → Azure role
assignments gibt es weder einen Members-Schritt noch einen Container als Scope, denn dort ist die
Identity implizit.

### `--assignee-object-id` statt `--assignee`

`--assignee` löst über Entra auf und scheitert ohne Directory-Leserecht.

### Die eigenen Rollen sind das Gegenstück zur Firewall-Regel

Dieselben zwei Rollen an das eigene Konto sind für `pnpm dev:full` das, was die Firewall-Regel für
die eigene IP am PostgreSQL-Server ist. Die Datenrolle bleibt dabei auf `files-dev`.

### Der Blob-Host muss in die CSP

Sonst blockiert der Browser den Upload-`PUT`.

---

## External ID

### Ein separater Mandant

External ID ist ein separater Mandant neben dem Arbeitsmandanten. Self-Service-Sign-up mit lokalen
Konten gibt es nur dort. Externe Personen werden so nie Objekte im eigenen M365-Verzeichnis: keine
Adresslisten-Einträge, keine Teams-Zugriffe, kein Offboarding-Problem. Der Preis ist kein Argument,
denn 50.000 monatlich aktive Nutzer sind in beiden Modellen kostenlos.

### Derselbe Code, drei Konfigurationswerte

Der Ablauf im Code ist derselbe wie bei Entra ID, nur die Microsoft-Adressen unterscheiden sich. Es
ändert sich deshalb keine Zeile Code, nur drei Konfigurationswerte plus die Subdomain. Auch die
Subdomain folgt dem Namens-Vertrag und heißt in Azure `ENTRA_SUBDOMAIN`. Der Wert ist optional, einen
Schalter oder zweiten Modus gibt es nicht. Bleibt er leer, verhält sich alles wie mit workforce Entra
ID.

### Die Rolle Tenant Creator

Sie erzeugt ausschließlich neue, separate Verzeichnisse und gibt keine Rechte im bestehenden
Mandanten.

### Der User Flow ist der einzige Schritt, den workforce Entra nicht kennt

Er ist auch der einzige, der lautlos scheitert. Ordne die SPA-Registrierung dem Flow zu, sonst bleibt
die Registrierung wirkungslos und der Login bricht ab, obwohl alle Werte stimmen.

### Kein TOTP in externen Mandanten

Authenticator und TOTP gibt es dort nicht. Verfügbar sind E-Mail-OTP, SMS gegen Aufpreis und
Passkey/FIDO2. Hast du TOTP bereits zugesagt, nimm das zurück. Passkey ist der bessere Ersatz.

### Der Host-Unterschied bei `ciamlogin.com`

Der Aussteller trägt die Tenant-ID als Host, die Schlüssel-Liste die Subdomain. Das ist Microsofts
tatsächliches Verhalten und kein Tippfehler. Verwechselst du beide beim Nachbauen von Hand, meldest
du dich erfolgreich an und bekommst trotzdem auf jeden Request `401`.

Ohne Gegenmaßnahme scheitert `ensureSignedIn()` mit `endpoints_resolution_error`. MSAL prüft den vom
Mandanten gemeldeten Aussteller gegen die konfigurierte Authority und stolpert über diesen
Host-Unterschied. Das betrifft das hier eingesetzte v5, siehe
[msal-browser #8592](https://github.com/AzureAD/microsoft-authentication-library-for-js/issues/8592).
Die SPA verwendet deshalb von vornherein die Tenant-ID auch als Host,
`https://<tenant-id>.ciamlogin.com/<tenant-id>`, fest verdrahtet und nicht konfigurierbar, siehe
[`auth.ts`](../apps/web/src/data/adapters/azure/auth.ts). Die Subdomain wird dafür nicht gebraucht,
nur für die Schlüssel-Liste der API.

### Federation braucht keinen zweiten Mandanten in der Konfiguration

Und keine Codeänderung. Die App zeigt weiter nur auf den externen Mandanten. Die Arbeits-Mandanten
werden in ihm als Identitätsanbieter hinterlegt und sind damit nur vorgelagert. Die App bekommt in
allen Fällen ein Token des externen Mandanten, `entra.subdomain` und `ENTRA_SUBDOMAIN` bleiben
unverändert. Federation ist beliebig oft wiederholbar und kostenlos. Die zwei Fälle sind
Kundenfirmen mit eigenem Entra-Mandanten und SSO für die eigenen Mitarbeitenden.

### Der `email`-Claim ist Pflicht

Ohne ihn scheitert jede Anmeldung mit „No email address was obtained from the external OIDC identity
provider." Die App braucht die Adresse ohnehin, um den Nutzer fachlich zuzuordnen.

### Das Client Secret ist der einzige Ablauftermin

Es läuft ab und muss rotiert werden. Es lebt im Portal statt im Repo, die Regel „keine Secrets im
Repo" bleibt unberührt.

### External ID vertraut fremdem MFA nicht

Mitarbeitende können ein zweites Mal zur MFA aufgefordert werden, obwohl sie im Heimat-Mandanten
bereits eine gemacht haben. Ansonsten greifen dessen Conditional-Access- und MFA-Regeln vollständig.

---

## Lokal

### Keine lokale Datenbank

Der azure-Modus läuft passwortlos gegen die Dev-Datenbank in Azure. Das testet dieselbe
Authentifizierung wie Produktion, im Code gibt es gar keinen zweiten Anmeldeweg. Vite proxied `/api`
lokal, die Origin-Situation ist dieselbe wie in Azure. Im Bundle steckt deshalb keine API-Basis-URL.

### Eine Zeile Konfiguration

[`env.ts`](../apps/api/src/env.ts) liest `PG*` und `ENTRA_*` direkt aus
[`.unitix/project.json`](../.unitix/project.json). Ausnahme ist `PGUSER`: in Azure ist das die
Managed Identity, lokal der eigene UPN. Genau dieser Wert steht deshalb in der Root-`.env` und
überschreibt den Default aus der Datei.

### Dev ist die einzige Option

[`env.ts`](../apps/api/src/env.ts) liest fest `environments.dev`, eine Umschalt-Variable existiert
nicht. Musst du wirklich einmal gegen Prod lesen, setze `PGDATABASE` und `PGUSER` inline. Dann steht
das Ziel sichtbar im Befehl.

---

## Restrisiko

Der DB-Endpunkt ist öffentlich auflösbar, und die Outbound-IPs des App Service gehören der Scale Unit
statt exklusiv dieser App. Die Absicherung trägt die Entra-only-Authentifizierung, die IP-Liste
allein trägt sie nicht. Ein Private Endpoint ist nachrüstbar.

Daraus folgt die Einordnung von `pnpm db:firewall`: eine veraltete IP-Liste ist ein
Verfügbarkeitsproblem. Die API kommt nicht mehr an die DB, unbefugt kommt trotzdem niemand herein.
Die Gegenmaßnahme sitzt deshalb in einem Befehl und später in der Pipeline. Der andere Weg wäre ein
VNet, denn statische Outbound-IPs gibt es für App Service ausschließlich über VNet-Integration plus
NAT Gateway. Der Service Tag `AppService` hilft dabei nicht, er enthält nur die Inbound-IPs.
Postgres-Firewall-Regeln nehmen ohnehin nur IPv4-Ranges und keine Tags.
