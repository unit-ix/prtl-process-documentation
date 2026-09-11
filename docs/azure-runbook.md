# Azure-Runbook — vom leeren Abo zur laufenden App

Diese Anleitung führt Klick für Klick durch den Fork `mock → azure`. Die Schritte 1–7 richten eine
Umgebung ein, Schritt 8 die zweite. Drei optionale Blöcke stehen am Ende und greifen in die
Schritte 1–7 nicht ein: Blob Storage, Entra External ID und E-Mail-Versand.

Die verbindlichen Regeln und die Begründungen stehen in
[`patterns-azure.md`](../.claude/docs/patterns-azure.md). Bei Widerspruch gewinnt der Regelsatz.

## Voraussetzungen

- leere Resource Group in der Ziel-Subscription, dazu die Rolle **Owner** darauf
- Recht, im Mandanten Apps zu registrieren, dafür genügt **Application Developer**
- registrierte Provider `Microsoft.Web` und `Microsoft.DBforPostgreSQL`
- Azure CLI installiert, `az login` ausgeführt

## Namenskonvention

Alle Platzhalter folgen Azure CAF: `<Präfix>-<projekt>` in Prod, `<Präfix>-<projekt>-dev` in Dev.
Das Umgebungsmodell steht in [`patterns-azure.md`](../.claude/docs/patterns-azure.md#umgebungen--dev-und-prod).

| Ressource                                  | Präfix   | Beispiel Prod   |
| ------------------------------------------ | -------- | --------------- |
| Resource Group (`<rg>`)                    | `rg-`    | `rg-projekt`    |
| App Service Plan                           | `asp-`   | `asp-projekt`   |
| App Service (`<name>`)                     | `app-`   | `app-projekt`   |
| Static Web App                             | `stapp-` | `stapp-projekt` |
| PostgreSQL Flexible Server (`<psql-name>`) | `psql-`  | `psql-projekt`  |

Den Storage Account benennst du ohne Trennzeichen: `st<projekt>`. Erlaubt sind Kleinbuchstaben und
Ziffern, 3–24 Zeichen.

## Werte-Sammeltabelle

Trage jeden Wert ein, sobald er entsteht. `project.json` meint
[`.unitix/project.json`](../.unitix/project.json), App setting die Web App aus
[Schritt 3b](#3b-app-settings), `.env` die eine Datei im Repo-Root.

| Wert                                       | entsteht in                                                             | wohin                                 | Key-Name                                                         |
| ------------------------------------------ | ----------------------------------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------- |
| Resource Group `<rg>`                      | [Voraussetzungen](#voraussetzungen)                                     | `project.json`                        | `azure.resourceGroup`                                            |
| Dein UPN im Mandanten                      | [Voraussetzungen](#voraussetzungen)                                     | `.env`                                | `PGUSER`                                                         |
| Directory (tenant) ID                      | [Schritt 1](#1-entra-zwei-app-registrierungen)                          | `project.json` + App setting          | `entra.tenantId` / `ENTRA_TENANT_ID`                             |
| Client-ID der SPA                          | [Schritt 1](#1-entra-zwei-app-registrierungen)                          | `project.json`                        | `entra.clientId`                                                 |
| Client-ID der API                          | [Schritt 1](#1-entra-zwei-app-registrierungen)                          | `project.json` + App setting          | `entra.apiAudience` / `ENTRA_API_AUDIENCE`                       |
| Server-Name `<psql-name>`                  | [Schritt 2](#2-postgresql-flexible-server)                              | `project.json` + App setting          | `pg.host` / `PGHOST`, als FQDN                                   |
| Name der Web App `<name>`                  | [Schritt 3](#3-app-service)                                             | `project.json` + App setting + `.env` | `azure.apiAppName` und `pg.user` / `PGUSER`, `API_IDENTITY_NAME` |
| Object (principal) ID der Managed Identity | [Schritt 3](#3-app-service)                                             | `.env`                                | `API_IDENTITY_OBJECT_ID`                                         |
| SWA-Origin                                 | [Schritt 5](#5-static-web-app)                                          | `project.json`                        | `url`                                                            |
| SWA-Deployment-Token                       | [Schritt 5](#5-static-web-app)                                          | `.env`                                | `SWA_DEPLOYMENT_TOKEN_DEV` / `_PROD`                             |
| Storage-Konto `st<projekt>`                | [Blob Storage](#optional-blob-storage)                                  | `project.json` + App setting          | `storage.account` / `STORAGE_ACCOUNT`                            |
| Container-Name `files` / `files-dev`       | [Blob Storage](#optional-blob-storage)                                  | `project.json` + App setting          | `storage.container` / `STORAGE_CONTAINER`                        |
| Subdomain des externen Mandanten           | [External ID](#optional-entra-external-id)                              | `project.json` + App setting          | `entra.subdomain` / `ENTRA_SUBDOMAIN`                            |
| Absenderadresse des Sammelpostfachs        | [E-Mail-Versand](#optional-e-mail-versand-microsoft-graph-sendmail)                                                    | `project.json` + App setting          | `mail.senderUpn` / `MAIL_SENDER_UPN`                             |

---

## 1. Entra: zwei App-Registrierungen

Ziel: eine API- und eine SPA-Registrierung. Daraus entstehen die drei `entra`-Werte.

Sollen sich firmenfremde Personen selbst registrieren, arbeite stattdessen den Block
[Entra External ID](#optional-entra-external-id) ab. Er ersetzt diesen Schritt.

### a) API-Registrierung

Portal → **Microsoft Entra ID → App registrations → + New registration**. Name `<projekt> API`,
Kontotyp **Accounts in this organizational directory only**, Redirect-URI leer lassen → **Register**.
Danach in dieser Registrierung:

1. **Expose an API → Application ID URI**: den Vorschlag `api://<appId>` unverändert übernehmen
2. **Expose an API → Add a scope**: Name genau `access_as_user`, Zugriff **Admins and users**
3. **Manifest**: `requestedAccessTokenVersion` auf `2` setzen → **Save**

### b) SPA-Registrierung

Zurück auf **App registrations → + New registration**. Name `<projekt> SPA`, Single tenant,
Plattform **Single-page application (SPA)**, Wert `http://localhost:5173` → **Register**. Danach in
dieser Registrierung:

1. **API permissions → Add a permission → My APIs** → die API-Registrierung → **Delegated** →
   `access_as_user` → **Add permissions**
2. optional: in der API-Registrierung unter **Expose an API → Add a client application** die
   SPA-Client-ID eintragen

### c) Werte eintragen

Directory (tenant) ID, Client-ID der SPA und Client-ID der API stehen jeweils unter **Overview**. Die
Tenant-ID ist in beiden Registrierungen gleich. Trage alle drei in den `entra`-Block von
[`.unitix/project.json`](../.unitix/project.json) ein und committe.

Fertig, wenn:

- das Manifest der API-Registrierung `"requestedAccessTokenVersion": 2` zeigt
- die SPA-Registrierung die Plattform **Single-page application** mit `http://localhost:5173` führt
- `access_as_user` unter **API permissions** steht
- `entra.tenantId`, `entra.clientId` und `entra.apiAudience` gefüllt sind

## 2. PostgreSQL Flexible Server

Ziel: ein Server mit Entra-Authentifizierung und eine leere Datenbank `app`.

Portal → **Azure Database for PostgreSQL flexible server → Create**.

| Reiter     | Feld                                        | Wert                                    |
| ---------- | ------------------------------------------- | --------------------------------------- |
| Basics     | Region                                      | EU-Region, siehe [Regionen](#regionen)  |
| Basics     | PostgreSQL version                          | höchste angebotene, mindestens 17       |
| Basics     | Workload type                               | **Development**                         |
| Basics     | Compute + storage                           | Burstable, **Standard_B1ms**, 32 GiB    |
| Basics     | Authentication method                       | **Microsoft Entra authentication only** |
| Basics     | Microsoft Entra admin                       | dich selbst                             |
| Networking | Connectivity                                | **Public access (selected networks)**   |
| Networking | Allow public access from any Azure service… | leer lassen                             |
| Networking | Firewall rules                              | **+ Add current client IP address**     |

Die Bereitstellung dauert 5–10 Minuten. Danach **Settings → Databases → + Add** → Name `app`.

Fertig, wenn:

- der Server **Available** ist
- unter **Databases** die Datenbank `app` steht
- unter **Networking** genau eine Firewall-Regel mit deiner Client-IP liegt
- unter **Authentication** deine Adresse als Entra-Admin steht

## 3. App Service

Ziel: eine Linux-Web-App mit Managed Identity, `Always On` und Health check.

Portal → **App Services → Create → Web App**. Publish **Code**, Runtime **Node 24 LTS**, OS **Linux**,
deine EU-Region, Pricing **Basic B1**, Continuous deployment **Disable**, Application Insights **No**.
Danach in der Web App:

- **Identity → System assigned → On**, dann die Object (principal) ID notieren
- **Configuration → General settings**: `Always On` auf **On**, `FTP state` auf **Disabled**
- **Health check** aktivieren, Pfad `/health`
- Startup Command leer lassen

Trage in [`.unitix/project.json`](../.unitix/project.json) ein:

- Name der Web App als `azure.apiAppName`
- Resource Group als `azure.resourceGroup`
- denselben Namen der Web App zusätzlich als `pg.user`

Fertig, wenn:

- **Identity → System assigned** auf **On** steht und eine Object ID zeigt
- `Always On` auf **On** und `FTP state` auf **Disabled** stehen
- die drei Felder in `project.json` gefüllt sind

### 3b. App settings

Ziel: jede Variable, die die API in Azure braucht. Sie gehören unter **App settings**.

Web App → **Environment variables → App settings**. Jede Variable heißt wie ihr Feld in
`project.json` nach der Regel `<block>.<key>` → `<BLOCK>_<KEY>`.

| in `project.json`   | App setting          | Wert                                      |
| ------------------- | -------------------- | ----------------------------------------- |
| `pg.host`           | `PGHOST`             | `<psql-name>.postgres.database.azure.com` |
| `pg.database`       | `PGDATABASE`         | `app`                                     |
| `pg.user`           | `PGUSER`             | Name der Web App                          |
| `entra.tenantId`    | `ENTRA_TENANT_ID`    | Directory (tenant) ID                     |
| `entra.apiAudience` | `ENTRA_API_AUDIENCE` | Client-ID der API-Registrierung           |

Dazu kommen zwei Plattform-Schalter ohne Gegenstück in `project.json`. Setze sie einmal.

| App setting                      | Wert    |
| -------------------------------- | ------- |
| `WEBSITE_RUN_FROM_PACKAGE`       | `1`     |
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | `false` |

Diese Variablen bleiben ungesetzt: `PORT`, `PGPORT`, `RATE_LIMIT_MAX`, `BODY_LIMIT_BYTES` und
`ALLOWED_ORIGIN`. Laufen Web und API auf getrennten Origins, setze `ALLOWED_ORIGIN` auf die
Web-Origin. Trage genau eine Origin ein und kein Wildcard.

Mit [Blob Storage](#optional-blob-storage) kommen `STORAGE_ACCOUNT` und `STORAGE_CONTAINER` dazu, mit
[External ID](#optional-entra-external-id) `ENTRA_SUBDOMAIN`, mit
[E-Mail-Versand](#optional-e-mail-versand-microsoft-graph-sendmail) `MAIL_SENDER_UPN` und `APP_URL`.

Fertig, wenn die API beim Start `Datenbank-Ziel: <user>@<host>/<db>` mit den erwarteten Werten loggt.

### 3c. Firewall der DB auf die API-IPs abgleichen

Ziel: die Outbound-IPs des App Service als Firewall-Regeln am PostgreSQL-Server.

Im Repo-Root:

```bash
pnpm db:firewall --dry-run   # zeigt nur, was sich ändern würde
pnpm db:firewall             # legt an, korrigiert, entfernt Veraltetes
```

Der Erstlauf dauert einige Minuten, jeder weitere Sekunden. Neue Regeln greifen nach bis zu
5 Minuten.

Lass das Script nach jedem dieser Ereignisse erneut laufen:

- Web App in einer anderen Resource Group neu angelegt
- letzte App einer Resource Group und Region neu angelegt
- Tier-Sprung zwischen `{Basic, Standard, Premium}`, `{PremiumV2}`, `{PremiumV3}` und `{Pmv3}`
- PITR-Restore der Datenbank, denn der wiederhergestellte Server hat keine Firewall-Regeln

Bleib bei Basic, Standard, PremiumV2 oder PremiumV3. Premium V4 hat keinen stabilen Satz von
Outbound-IPs, deshalb bricht `pnpm db:firewall` dort ab. Der Ausweg wäre VNet-Integration plus NAT
Gateway.

Fertig, wenn `pnpm db:firewall --dry-run` keine Änderung mehr meldet und Regeln mit dem Präfix
`api-outbound-` unter **Networking** stehen. Die Regel für deine eigene IP bleibt daneben.

## 4. Datenbank füllen

Ziel: Schema in der Datenbank, dazu Lese- und Schreibrechte für die Managed Identity.

Arbeite im Terminal auf deinem Rechner, im Repo-Root. `PGUSER` ist dein UPN, also die Adresse aus
Schritt 2.

Hast du `schema.ts` umgeschrieben, laufe `pnpm db:generate` davor. Ersetzt du die Demo-Domain
`companies`/`contacts`, lösche `apps/api/drizzle/` und generiere `0000` neu. Das geht nur jetzt, vor
dem ersten `db:migrate` gegen eine Umgebung.

```bash
# 0. nur nach Änderungen an schema.ts — offline, ohne DB. Ergebnis gehört in den Commit.
pnpm db:generate

# 1. Schema anlegen — als Entra-Admin, von deinem Rechner
PGHOST=<psql-name>.postgres.database.azure.com \
PGDATABASE=app \
PGUSER='<deine-e-mail-im-mandanten>' \
pnpm db:migrate

# 2. Rolle + Rechte für die Managed Identity — API_IDENTITY_* kommen aus der .env
PGHOST=<psql-name>.postgres.database.azure.com \
PGDATABASE=app \
PGUSER='<deine-e-mail-im-mandanten>' \
pnpm db:grant
```

Der Prefix `PGHOST=… pnpm …` gilt nur für diesen einen Aufruf. Setze in PowerShell je Zeile
`$env:PGHOST='…'` und rufe `pnpm db:migrate` danach allein auf. Ohne Prefix zeigen beide Befehle auf
Dev.

Migriere zuerst, grante danach. `db:migrate` läuft bei jeder Schema-Änderung, `db:grant` einmal pro
Umgebung und idempotent. Wirft die API später `permission denied for table …`, genügt ein erneuter
`db:grant`-Lauf.

> [!WARNING]
> `db:migrate` direkt aufgerufen läuft ohne Gates. Lies die `→ Ziel:`-Zeile zweimal. Gegen Produktion
> migrierst du ausschließlich über `pnpm deploy:prod`.

Fertig, wenn beide Befehle vor dem Lauf `→ Ziel: <user>@<host>/<db>` mit dem erwarteten Ziel ausgeben
und ohne Fehler durchlaufen.

## 5. Static Web App

Ziel: die SPA-Auslieferung plus `/api/*`-Proxy auf den App Service.

Portal → **Static Web Apps → Create**. Plan **Standard**, Region **West Europe**, Deployment source
**Other**. Danach folgen drei Pflichtschritte im Portal.

### a) `/api/*`-Proxy verknüpfen

SWA → **APIs** → Kachel **Production** → **Link** → Backend resource type **App Service** →
Subscription und die Web App aus Schritt 3 → **Link**.

### b) SWA-URL als zweite Redirect-URI nachtragen

Kopiere die URL aus SWA → **Overview** in der Form `https://<name>.<n>.azurestaticapps.net`. Dann
Entra → **App registrations** → SPA-Registrierung → **Authentication** → Plattform **Single-page
application** → **Add URI** → einfügen → **Save**. Trage exakt die Origin ein, ohne Pfad und ohne
Slash am Ende. `http://localhost:5173` bleibt daneben stehen.

### c) Deployment-Token holen

**Overview → Manage deployment token** → Token kopieren.

Die **Environment variables** der SWA bleiben leer.

Die URL gehört zusätzlich in `environments.<env>.url` in
[`.unitix/project.json`](../.unitix/project.json).

## 6. Deployen

Ziel: Migrationen, API und SPA in der Ziel-Umgebung mit einem Befehl.

Fülle vorher den `environments`-Block in [`.unitix/project.json`](../.unitix/project.json):

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

Fülle dazu die Root-`.env`. Sie ist gitignored, die Vorlage ist [`.env.example`](../.env.example):

```dotenv
SWA_DEPLOYMENT_TOKEN_DEV=<token der dev-SWA aus Schritt 5>
SWA_DEPLOYMENT_TOKEN_PROD=<token der prod-SWA>
PGUSER=<dein-upn>          # für pnpm dev:full und jede Migration
```

Die Root-`.env` ist die einzige `.env` im Repo. `pnpm verify` bricht ab, sobald `apps/api/.env`
auftaucht.

```bash
pnpm deploy:dev              # Migrationen → API → SPA, ohne Rückfrage
pnpm deploy:prod             # dasselbe, mit Gates davor und Tag danach
pnpm deploy:dev --only=web   # nur die SPA
```

Einmalig gegen eine andere Ressourcengruppe, ohne Config-Änderung:

```bash
pnpm deploy:dev --resource-group=<rg> --app-name=<name>
```

Die Gates von `pnpm deploy:prod` stehen in [`patterns-azure.md`](../.claude/docs/patterns-azure.md#die-prod-gates).

Fertig, wenn das Script ohne Fehler durchläuft und die Ziel-URL ausgibt.

## 7. Smoke-Test

- SWA-URL öffnen → Entra-Login → leere Kontaktliste im Empty-State
- „Demo-Kontakt anlegen" → Eintrag erscheint, Suche, Sortierung und Löschen funktionieren
- `https://<web-app>.azurewebsites.net/health` → `{"status":"ok"}`
- `https://<web-app>.azurewebsites.net/api/contacts` ohne Token → `401`
- `https://<swa-url>/api/contacts` ohne Token → `401`

Fertig, wenn alle fünf Punkte zutreffen. Ein `404` beim letzten Punkt heißt, dass der Backend-Link
aus [Schritt 5a](#a-api-proxy-verknüpfen) fehlt.

---

## 8. Die zweite Umgebung

Ziel: die zweite Umgebung auf geteilter Basis. Es kommen sechs Ergänzungen hinzu, mit Blob Storage
sieben. Alles andere teilen die Umgebungen. Konvention: Prod ohne Suffix, Dev mit `-dev`.

1. **App Service.** Neue Web App `<name>-dev` im selben App-Service-Plan. Wähle in Portal →
   **Create Web App** den vorhandenen Plan. Alle weiteren Felder wie in [Schritt 3](#3-app-service).
2. **App settings.** Tabelle aus [Schritt 3b](#3b-app-settings), mit `PGDATABASE=app_dev` und
   `PGUSER=<name>-dev`. Die `ENTRA_*`-Werte sind in beiden Umgebungen identisch.
3. **Datenbank.** `CREATE DATABASE app_dev;` auf dem bestehenden Server.
4. **Rolle + Rechte.** `db:migrate` und `db:grant` gegen `app_dev`, siehe
   [Schritt 4](#4-datenbank-füllen). Trage vorher `API_IDENTITY_NAME` und `API_IDENTITY_OBJECT_ID`
   der neuen Web App in die `.env` ein — die Keys sind unsuffixiert und tragen immer die Identity
   der Umgebung, gegen die du gerade grantest.
5. **Static Web App.** Zweite SWA im Plan Standard, Backend-Link auf `<name>-dev`.
6. **Redirect-URI.** Origin der neuen SWA in die bestehende SPA-Registrierung, ohne Pfad und ohne
   Slash am Ende.
7. **Blob Storage.** Nur mit [Blob Storage](#optional-blob-storage): Container `files-dev` im selben
   Konto, zwei Rollenzuweisungen auf die neue Identity, neue Origin in die CORS-Regel. Konto und
   CORS-Regel sind geteilt.

Ergänze danach `environments` in [`.unitix/project.json`](../.unitix/project.json) um den zweiten
Block. Das Schema steht in [Schritt 6](#6-deployen). Dann die Firewall abgleichen:

```bash
pnpm db:firewall             # setzt die Outbound-IPs beider App Services
```

`db:firewall` hat kein `--env`. Existiert eine der beiden Apps noch nicht, verlangt das Script
`--allow-partial`.

Fertig, wenn der [Smoke-Test](#7-smoke-test) auch gegen die zweite SWA-URL durchläuft.

---

## Optional: Blob Storage

Dieser Block gilt nur, wenn das Projekt Dateien speichert. Er greift in die Schritte 1–7 nicht ein.
Das Konzept dahinter steht in [`patterns-azure.md`](../.claude/docs/patterns-azure.md#blob-storage--optional).

Ziel: ein Storage Account ohne Account-Key, ein privater Container, CORS für den Browser-Upload und
zwei Rollenzuweisungen.

### a) Storage Account anlegen

Portal → **Storage accounts → Create**. Name `st<projekt>`, Region wie App Service und Datenbank.
Drei Felder weichen vom Default ab:

| Reiter   | Feld                                | Wert                                                         |
| -------- | ----------------------------------- | ------------------------------------------------------------ |
| Basics   | Redundancy                          | **Locally-redundant storage (LRS)**                          |
| Security | Enable storage account key access   | abwählen                                                     |
| Security | Permitted scope for copy operations | **From storage accounts in the same Microsoft Entra tenant** |

Alle anderen Reiter bleiben unverändert: Standard-Performance, öffentlicher Netzwerkzugang, kein
hierarchischer Namespace, Soft Delete 7 Tage, Versioning und Change feed aus.

### b) Container

**Data storage → Containers → + Container**. Name `files`, in der Dev-Umgebung `files-dev`. Public
access bleibt **Private**.

### c) CORS

**Settings → Resource sharing (CORS) → Blob service**, eine Zeile:

| Allowed origins                           | Allowed methods    | Allowed headers               | Exposed headers | Max age |
| ----------------------------------------- | ------------------ | ----------------------------- | --------------- | ------- |
| `http://localhost:5173` + jede SWA-Origin | `PUT`,`GET`,`HEAD` | `content-type,x-ms-blob-type` | `etag`          | `3600`  |

Die Origin-Liste ist dieselbe wie bei den Redirect-URIs. Trage jede SWA-Origin einzeln ein, ohne
Wildcard.

### d) App settings und `project.json`

Trage Konto- und Container-Namen in den `storage`-Block der Umgebung in
[`.unitix/project.json`](../.unitix/project.json) ein, dazu als App settings der Web App:

| in `project.json`   | App setting         | Wert                     |
| ------------------- | ------------------- | ------------------------ |
| `storage.account`   | `STORAGE_ACCOUNT`   | `st<projekt>`            |
| `storage.container` | `STORAGE_CONTAINER` | `files` bzw. `files-dev` |

### e) Zwei Rollenzuweisungen je Umgebung

Die beiden Rollen liegen auf verschiedenen Ebenen:

| Wo                                                                                   | Rolle                             |
| ------------------------------------------------------------------------------------ | --------------------------------- |
| Storage account → **Data storage → Containers** → `files` → **Access Control (IAM)** | **Storage Blob Data Contributor** |
| Storage account → **Access Control (IAM)** auf Kontoebene                            | **Storage Blob Delegator**        |

Du brauchst `Microsoft.Authorization/roleAssignments/write`, also **RBAC Administrator** oder
**User Access Administrator**. Beide Male führt derselbe Assistent:

1. **+ Add → Add role assignment**
2. Reiter **Role** → suchen → die Zeile der Rolle anklicken → **Next**
3. Reiter **Members** → **Managed identity** → **+ Select members** → im Panel erst **System-assigned
   managed identity**, dann als Instanz **App Service** → die Web App aus Schritt 3 → **Select** →
   **Next**
4. Bei **Storage Blob Data Contributor** folgt ein Reiter **Conditions**. Lass ihn leer und klicke
   **Next**. Mit Entra ID P2 setze zusätzlich **Assignment type** auf **Active** und **Permanent**.
5. **Review + assign**. Die Zuweisung greift mit bis zu 10 Minuten Verzögerung.

Für `pnpm dev:full` weise dieselben zwei Rollen deinem eigenen Konto zu, die Datenrolle nur auf
`files-dev`. Wähle im Reiter **Members** dafür **User, group, or service principal**. Per CLI liefert
`az ad signed-in-user show --query id -o tsv` die Object-ID, der Principal-Type ist `User`. Für den
**Storage browser** des Portals brauchst du zusätzlich die ARM-Rolle **Reader** auf dem Konto.

### f) CSP

Trage den Blob-Host `https://st<projekt>.blob.core.windows.net` in `connect-src` der CSP in
[`staticwebapp.config.json`](../apps/web/public/staticwebapp.config.json) ein.

Fertig, wenn ein Upload lokal und aus der deployten SWA durchläuft und der Blob im
**Storage browser** im Container liegt.

---

## Optional: Entra External ID

Dieser Block gilt, wenn sich firmenfremde Personen selbst registrieren sollen. Er ersetzt
[Schritt 1](#1-entra-zwei-app-registrierungen), die Schritte 2–7 bleiben unverändert.

Ziel: ein externer Mandant mit Self-Service-Sign-up, zwei Registrierungen darin, ein User Flow. Es
entstehen dieselben drei `entra`-Werte plus die Subdomain.

Ein nachträglicher Wechsel kostet beide Registrierungen, den User Flow und jede Redirect-URI neu.

### a) Externen Mandanten anlegen

Portal → **Microsoft Entra ID → Create a tenant** → Typ **External**. Du brauchst dafür die Rolle
**Tenant Creator** im Arbeitsmandanten.

Verknüpfe den Mandanten danach mit einer Subscription. Das ist ein eigener Schritt.

Notiere Subdomain und Directory (tenant) ID.

### b) Zwei App-Registrierungen im externen Mandanten

Der Klickpfad ist identisch zu [Schritt 1](#1-entra-zwei-app-registrierungen): API-Registrierung mit
`access_as_user` und `requestedAccessTokenVersion` auf `2`, SPA-Registrierung mit der Plattform
**Single-page application (SPA)**. Arbeite dabei im externen Mandanten. Den Mandanten wechselst du
oben rechts im Portal.

### c) User Flow anlegen

**External Identities → User flows → + New user flow** → **Sign up and sign in**, Identitätsanbieter
**Email with password**. Setz unter **User attributes** neben **Email Address** auch **Display
Name** — die vollständige Attributliste klappt erst über **Show more** auf. Ordne dem Flow danach
unter **Applications → Add application** die SPA-Registrierung zu.

Der Anzeigename ist Pflicht, weil External ID jedes Konto ohne ihn mit `displayName` = `unknown`
anlegt — und genau dieses Wort steht danach in der Kontoauswahl und in der Nutzerliste. Ein
Built-in User Flow kann den Namen nicht aus Given Name und Surname oder aus der E-Mail
zusammensetzen; abgefragt oder `unknown`, dazwischen gibt es nichts.

Abgefragt wird nur bei der Erst-Registrierung. Ein nachträglich gesetztes Häkchen (**User flows →
Flow → User attributes → Save**) greift deshalb erst für neue Konten; bestehende `unknown`-Konten
korrigierst du einzeln unter **Users → Konto → Edit properties → Display name**.

### d) Redirect-URIs

Trage in der SPA-Registrierung `http://localhost:5173` und die SWA-Domain aus
[Schritt 5](#5-static-web-app) ein. Exakt, inklusive Port, ohne Slash am Ende.

### e) MFA, optional

MFA läuft über Conditional Access. Verfügbar sind E-Mail-OTP, SMS und Passkey/FIDO2. Authenticator
und TOTP fehlen.

### f) Werte eintragen

`entra.tenantId`, `entra.clientId` und `entra.apiAudience` füllst du wie in Schritt 1, nur aus den
Registrierungen des externen Mandanten. Ein Wert kommt hinzu:

| Wert      | wohin                                                               |
| --------- | ------------------------------------------------------------------- |
| Subdomain | `entra.subdomain` in `project.json`, z. B. `contoso`                |
| Subdomain | App setting `ENTRA_SUBDOMAIN`, siehe [Schritt 3b](#3b-app-settings) |

Authority der SPA, erwarteter Aussteller `iss` und Schlüssel-Liste `jwks_uri` entstehen daraus
automatisch:

| Wert                  | Host      | Format                                                              |
| --------------------- | --------- | ------------------------------------------------------------------- |
| Authority der SPA     | Tenant-ID | `https://<tenant-id>.ciamlogin.com/<tenant-id>`                     |
| Erwarteter Aussteller | Tenant-ID | `https://<tenant-id>.ciamlogin.com/<tenant-id>/v2.0`                |
| Schlüssel-Liste       | Subdomain | `https://<subdomain>.ciamlogin.com/<tenant-id>/discovery/v2.0/keys` |

Gebildet wird das in [`auth.ts`](../apps/web/src/data/adapters/azure/auth.ts) und
[`verify.ts`](../apps/api/src/auth/verify.ts). Bleiben `entra.subdomain` und `ENTRA_SUBDOMAIN` leer,
verhält sich alles wie mit workforce Entra ID. An der CSP ist nichts zu tun, `https://*.ciamlogin.com`
ist bereits erlaubt.

Fertig, wenn die Anmeldeseite des User Flows E-Mail und Passwort anbietet, eine Selbst-Registrierung
durchläuft und der [Smoke-Test](#7-smoke-test) grün ist.

### g) Weitere Mandanten anbinden über Federation

Federation bindet Kundenfirmen mit eigenem Entra-Mandanten an und liefert SSO für die eigenen
Mitarbeitenden. Wiederhole die drei Schritte je Mandant.

1. Lege im Arbeitsmandanten eine App-Registrierung für den externen Mandanten an. Supported account
   types: **Accounts in this organizational directory only**. Plattform **Web** mit den Redirect-URIs
   `https://<subdomain>.ciamlogin.com/<tenant-id>/federation/oauth2` und
   `https://<subdomain>.ciamlogin.com/<subdomain>.onmicrosoft.com/federation/oauth2`. Erzeuge ein
   Client Secret und notiere den Wert, nicht die Secret-ID. Erteile unter **API permissions** die
   Graph-Delegated-Rechte `email`, `openid`, `profile` und `User.Read` mit Admin Consent. Ergänze
   unter **Token configuration** den `email`-Claim.

2. Lege im externen Mandanten unter **External Identities → All identity providers → Custom → New
   OpenID Connect provider** den Provider an:

    | Feld                | Wert                                                                                    |
    | ------------------- | --------------------------------------------------------------------------------------- |
    | Well-known endpoint | `https://login.microsoftonline.com/organizations/v2.0/.well-known/openid-configuration` |
    | OpenID Issuer URI   | `https://login.microsoftonline.com/<arbeits-tenant-id>/v2.0`                            |
    | Client ID / Secret  | aus Schritt 1                                                                           |
    | Scope               | `openid profile`                                                                        |
    | Response type       | `code`                                                                                  |

3. Füge den Provider dem User Flow hinzu. Die Zuordnung zum Mandanten allein genügt nicht.

Das Client Secret läuft ab und braucht Rotation.

Fertig, wenn auf der Anmeldeseite neben E-Mail und Passwort ein Knopf **Sign in with &lt;Firma&gt;**
steht und eine Anmeldung darüber durchläuft. Quelle für diesen Unterabschnitt:
[Microsoft Learn](https://learn.microsoft.com/en-us/entra/external-id/customers/how-to-entra-id-federation-customers).

---

## Optional: E-Mail-Versand (Microsoft Graph `sendMail`)

Dieser Block gilt nur, wenn die App Mails verschickt. Er greift in die Schritte 1–7 nicht ein.

Ziel: ein Shared Mailbox im M365-Mandanten des Kunden, die Graph-Berechtigung `Mail.Send` auf der
Managed Identity der Web App, eine **Access Policy**, die sie auf genau dieses Postfach einschränkt,
und zwei App settings.

> **Abweichung vom Template.** Die Vorlage dieses Runbooks benutzte Azure Communication Services.
> Für PRETTL trägt das nicht: die Azure-verwaltete ACS-Domain ist auf **10 Mails/Stunde** begrenzt
> und die Grenze ist nicht erhöhbar. Eine Sammelunterweisung mit 40 Teilnehmern bräuchte vier
> Stunden, und die Unterweisungs-Mail *ist* hier der Nachweis. Die ACS-Alternative — eine verifizierte
> eigene Domain — kostet DNS-Arbeit beim Kunden und startet mit unbeschriebener Zustell-Reputation;
> bei einem Medizintechnik-Zulieferer ist eine Unterweisungs-Mail im Spam-Ordner ein Audit-Befund.
> Graph liefert stattdessen aus einem echten `@prettl.com`-Postfach (mandantenintern, kein
> Reputationsrisiko), schafft ~30 Mails/Minute, braucht **kein Secret** — und legt jede Mail in
> *Gesendete Elemente* ab, was den Versandnachweis zu einer Exchange-Frage statt einer Log-Frage macht.

Drei Eigenschaften bestimmen den Entwurf:

- **Kein Secret.** `Mail.Send` hängt als App-Rolle an der Managed Identity, `DefaultAzureCredential`
  holt das Graph-Token — dieselbe Mechanik wie bei PostgreSQL und Blob Storage. Damit bleibt die
  Aussage aus [`patterns-azure.md`](../.claude/docs/patterns-azure.md) intakt, dass es in diesem
  Stack kein Secret gibt, das ein Tresor verwahren müsste.
- **`Mail.Send` als Anwendungsberechtigung gilt zunächst für JEDES Postfach im Mandanten.** Ohne
  Schritt c) darf die App als beliebiger Mitarbeiter senden. Das ist kein theoretisches Risiko,
  sondern die Standardwirkung der Rolle — Schritt c) ist deshalb **nicht optional**.
- **Nie im Request senden.** Exchange drosselt bei ~30 Mails/Minute, der SWA-Proxy bricht nach 45 s
  ab. Die API schreibt Ereigniszeilen mit `isSent = false` und antwortet sofort; ein Sweep versendet
  sie. Ein `429` von Graph ist damit ein erneuter Versuch statt eines Fehlers beim Nutzer.

Kosten: keine. Ein Shared Mailbox unter 50 GB braucht keine Lizenz.

### a) Shared Mailbox anlegen

Microsoft 365 Admin Center → **Teams & groups → Shared mailboxes → + Add a shared mailbox**.
Name z. B. `Prozessdokumentation`, Adresse `prozessdokumentation@prettl.com`. Die Adresse ist der
Wert für `MAIL_SENDER_UPN`.

Das Postfach braucht **keine Lizenz** und niemand meldet sich daran an — die App sendet als dieses
Postfach, sie liest es nicht.

### b) `Mail.Send` an die Managed Identity vergeben

Nicht im Portal klickbar: App-Rollen an eine Managed Identity vergibt man über Graph. Die Object-ID
der Identity stammt aus [Schritt 3](#3-app-service).

```bash
GRAPH_SP=$(az ad sp list --filter "appId eq '00000003-0000-0000-c000-000000000000'" --query "[0].id" -o tsv)
MAILSEND=$(az ad sp show --id "$GRAPH_SP" \
  --query "appRoles[?value=='Mail.Send' && contains(allowedMemberTypes,'Application')].id | [0]" -o tsv)

# je Umgebung, mit der Object (principal) ID der jeweiligen Web App
az rest --method post \
  --url "https://graph.microsoft.com/v1.0/servicePrincipals/<principal-id>/appRoleAssignments" \
  --headers "Content-Type=application/json" \
  --body "{\"principalId\":\"<principal-id>\",\"resourceId\":\"$GRAPH_SP\",\"appRoleId\":\"$MAILSEND\"}"
```

Braucht **Privileged Role Administrator** oder **Global Administrator** im Mandanten — eine
App-Rollen-Zuweisung auf einem Service Principal ist ein privilegierter Schreibvorgang.

Gegenprobe:

```bash
az rest --method get \
  --url "https://graph.microsoft.com/v1.0/servicePrincipals/<principal-id>/appRoleAssignments" \
  --query "[].{role:appRoleId,resource:resourceDisplayName}" -o table
```

### c) Auf das eine Postfach einschränken — Pflicht

Exchange Online PowerShell, einmal je Umgebung. Ohne diesen Schritt darf die App als **jedes**
Postfach im Mandanten senden.

```powershell
Connect-ExchangeOnline
New-DistributionGroup -Name "sg-prtl-processdoc-mail" -Type Security `
  -Members "prozessdokumentation@prettl.com"
New-ApplicationAccessPolicy -AppId "<client-id-der-managed-identity>" `
  -PolicyScopeGroupId "sg-prtl-processdoc-mail" -AccessRight RestrictAccess `
  -Description "PRETTL Prozessdokumentation darf nur aus dem Sammelpostfach senden"
Test-ApplicationAccessPolicy -Identity "prozessdokumentation@prettl.com" -AppId "<client-id>"
```

`Test-ApplicationAccessPolicy` muss `AccessCheckResult: Granted` liefern, und dieselbe Abfrage gegen
ein beliebiges anderes Postfach `Denied`. Beide Richtungen prüfen — nur die zweite belegt, dass die
Einschränkung wirkt. Die Policy greift mit bis zu 30 Minuten Verzögerung.

### d) App settings und `project.json`

Die Absenderadresse ist kein Secret und gehört in den `mail`-Block der Umgebung in
[`.unitix/project.json`](../.unitix/project.json). Weil `project.json` nicht mitdeployt wird, braucht
die Web App in Azure jeden Wert zusätzlich als App setting:

| in `project.json` | App setting       | Wert                                |
| ----------------- | ----------------- | ----------------------------------- |
| `mail.senderUpn`  | `MAIL_SENDER_UPN` | `prozessdokumentation@prettl.com`   |
| `url` der Umgebung | `APP_URL`        | die SWA-Origin, ohne Slash am Ende  |

Es gibt **keinen** Connection String und keinen Schlüssel — das ist der Punkt der Übung. `APP_URL`
baut die `?pid=`-Absprunglinks in den Mails; ohne ihn zeigen sie ins Leere.

## Lokal entwickeln

Beide Modi laufen ohne lokale Datenbank.

```bash
pnpm dev          # platform: mock — kein Login, kein Backend, Seed-Adapter. Normalfall für UI-Arbeit.

pnpm db:migrate   # platform: azure — Schema auf der Dev-Datenbank
pnpm dev:full     # API :3000 + SPA :5173 — braucht PGUSER in der Root-.env, siehe Schritt 6
```

`pnpm dev` startet keine API und braucht `PGUSER` nicht. `pnpm dev:full` und die `db:*`-Befehle
laufen passwortlos gegen die Dev-Datenbank in Azure, über `az login` und die Firewall-Regel aus
Schritt 2.

Musst du einmal gegen Prod lesen, setze `PGDATABASE` und `PGUSER` inline. Dann steht das Ziel sichtbar
im Befehl.

Schema ändern: `pnpm db:generate` erzeugt das SQL offline aus `schema.ts`, danach läuft
`pnpm db:migrate`. Die Files unter `apps/api/drizzle/` gehören ins Repo.

Fertig, wenn die Ziel-Zeile beim Start deine Adresse zeigt. Steht dort der Name der Web App, fehlt
`PGUSER` in der Root-`.env`.

---

## Referenz

### Preise und SKUs

| Rolle     | Dienst                           | SKU                  | ca. €/Monat |
| --------- | -------------------------------- | -------------------- | ----------- |
| Frontend  | Azure Static Web Apps            | Standard             | 8           |
| Backend   | App Service Linux, Node 24 (LTS) | B1, `Always On`      | 12          |
| Datenbank | PostgreSQL Flexible Server       | B1ms + 32 GB         | 17          |
| Login     | Entra ID, interner Mandant       | —                    | 0           |
|           |                                  | Summe, eine Umgebung | ~37         |
|           | zweite Umgebung Dev              | zweite SWA Standard  | +8          |
|           |                                  | Summe, Dev + Prod    | ~45         |

| Optionaler Posten               | Kosten                   |
| ------------------------------- | ------------------------ |
| Blob Storage, Grundpreis        | 0 €                      |
| Blob Storage, 20 GB LRS         | ~0,35 €/Monat            |
| Storage-Redundanz GRS statt LRS | doppelt so viel wie LRS  |
| Private Endpoint für die DB     | ~8 €/Monat               |
| VNet-Integration + NAT Gateway  | ~35 €/Monat              |
| External ID, bis 50.000 MAU     | 0 €                      |
| SMS-MFA in externen Mandanten   | ~0,03 $ pro Versuch      |
| Federation weiterer Mandanten   | 0 €                      |
| E-Mail-Versand, Ressourcen      | 0 €                      |
| E-Mail-Versand, je Mail         | 0,00025 $ + 0,00012 $/MB |

### Regionen

| Ressource                 | Region          |
| ------------------------- | --------------- |
| App Service + PostgreSQL  | eine EU-Region  |
| Static Web App            | West Europe     |
| Storage Account, optional | wie App Service |

Bevorzuge Germany West Central. Für kleine Subscriptions ist die Region oft gesperrt. Nimm dann
Spain Central, West Europe, North Europe oder Sweden Central, unter DSGVO sind alle gleichwertig.

### Fehlercodes und Symptome

| Code / Symptom                                                            | Ursache                                                                                       | Behebung                                                                                                  |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `AADSTS9002326` beim Einlösen des Auth-Codes                              | SPA-Registrierung hat Plattform-Typ Web                                                       | Plattform als SPA neu anlegen, [1b](#b-spa-registrierung)                                                 |
| `AADSTS50011`, Login endet auf der Entra-Seite                            | aufrufende Origin fehlt in den Redirect-URIs                                                  | Origin exakt nachtragen, [5b](#b-swa-url-als-zweite-redirect-uri-nachtragen)                              |
| Jede Token-Prüfung schlägt fehl, `iss` ohne `/v2.0`                       | `requestedAccessTokenVersion` steht nicht auf `2`                                             | Manifest korrigieren, [1a](#a-api-registrierung)                                                          |
| Login gelingt, jeder Request bringt `401`                                 | `ENTRA_API_AUDIENCE` ist nicht die Client-ID der API                                          | Wert gegen **Overview** der API prüfen, [1a](#a-api-registrierung)                                        |
| Token trägt den Scope `access_as_user` nicht                              | `entra.apiAudience` ist nicht die blanke Client-ID der API                                    | kein `api://…`, nicht die der SPA — `auth.ts` baut den Scope daraus zusammen                              |
| `AADSTS65001` — consent required                                          | SPA hat keine Freigabe für den API-Scope                                                      | **API permissions** → `access_as_user`, [1b](#b-spa-registrierung)                                        |
| `AADSTS700016` — application not found                                    | falsche `entra.clientId` oder falscher Mandant                                                | Werte gegen die **Overview**-Seite der Registrierung prüfen                                               |
| `AADSTS50058` — silent sign-in, no user signed in                         | keine Sitzung mehr am Mandanten (abgelaufen, oder Cookie im iframe als Third-Party geblockt)  | für sich kein Fehler, `auth.ts` geht in den Redirect-Flow. Hängt die Seite, fehlt `'self'` in `frame-src` |
| `Refused to connect` / `Refused to frame` in der Konsole                  | Domain fehlt in der CSP                                                                       | `connect-src` **und** `frame-src` in `staticwebapp.config.json`, [f\)](#f-csp)                            |
| `Framing '<eigene SWA-URL>' violates … frame-ancestors 'none'`            | die **eigene** Origin fehlt: die stille Erneuerung redirectet in die `redirectUri`, im iframe | `'self'` in `frame-src` **und** `frame-ancestors 'self'` statt `'none'`                                   |
| `timed_out` / `monitor_window_timeout`, keine CSP-Meldung                 | die App startet im Erneuerungs-iframe mit und verbraucht die Antwort vor dem Elternfenster    | `main.tsx` bremst das ab — tritt auf, wenn Konto gecacht und Refresh-Token abgelaufen ist (SPA: ~24 h)    |
| `429`                                                                     | Drosselung (`RATE_LIMIT_MAX`, Default 200/min pro `oid`)                                      | kein Fehler — Client-Schleife suchen                                                                      |
| `429` beim Mail-Versand                                                   | Exchange drosselt (~30 Mails/min pro Postfach)                                                | kein Fehler — der Sweep versendet beim nächsten Lauf weiter, [E-Mail-Versand](#optional-e-mail-versand-microsoft-graph-sendmail)                         |
| `GET /api/… 404`, Tabellen bleiben leer                                   | Backend-Link der SWA fehlt                                                                    | [5a](#a-api-proxy-verknüpfen), prüfen mit `az staticwebapp backends show`                                 |
| DB-Zugriff der API sieht im Log wie ein Timeout aus                       | Outbound-IPs fehlen in der DB-Firewall                                                        | `pnpm db:firewall`, [3c](#3c-firewall-der-db-auf-die-api-ips-abgleichen)                                  |
| `ERR_MODULE_NOT_FOUND: Cannot find package '@azure/…'`                    | ZIP ohne `--config.node-linker=hoisted` gebaut                                                | über `pnpm deploy:*` deployen, [6](#6-deployen)                                                           |
| `permission denied for table …`                                           | `GRANT` fehlt für neue Tabellen                                                               | `pnpm db:grant` erneut laufen lassen, [4](#4-datenbank-füllen)                                            |
| CORS-Fehler beim Upload, kein Server-Log                                  | CORS-Regel fehlt für diese Origin                                                             | [Blob Storage c\)](#c-cors)                                                                               |
| `403` auf Blob-Operationen direkt nach der Zuweisung                      | Zuweisung greift nach bis zu 10 Minuten                                                       | warten                                                                                                    |
| Service- oder Account-SAS wird mit `403` abgelehnt                        | Account-Key-Zugriff ist abgewählt                                                             | User-Delegation-SAS verwenden                                                                             |
| `AuthorizationPermissionMismatch` im Storage browser                      | Datenrolle fehlt, `Owner` auf der RG genügt nicht                                             | [Blob Storage e\)](#e-zwei-rollenzuweisungen-je-umgebung)                                                 |
| **+ Add** unter **Access Control (IAM)** ausgegraut                       | `Microsoft.Authorization/roleAssignments/write` fehlt                                         | **RBAC Administrator** anfordern                                                                          |
| Im IAM-Assistenten bleibt **Next** grau                                   | Rollenzeile ist nicht markiert                                                                | Zeile anklicken, [Blob Storage e\)](#e-zwei-rollenzuweisungen-je-umgebung)                                |
| `endpoints_resolution_error` in `ensureSignedIn()`                        | Host-Unterschied bei External ID                                                              | nichts zu tun, `auth.ts` verdrahtet die Tenant-ID                                                         |
| „No email address was obtained from the external OIDC identity provider." | `email`-Claim fehlt in der Registrierung                                                      | **Token configuration** → `email`, [g 1.](#g-weitere-mandanten-anbinden-über-federation)                  |
| Fehlercode `40015` bei der Federation                                     | Issuer oder Endpunkte passen nicht zum Discovery-Dokument                                     | Endpoints vergleichen, [g 2.](#g-weitere-mandanten-anbinden-über-federation)                              |
| Der Federation-Knopf erscheint nie                                        | Provider hängt nicht am User Flow                                                             | [g 3.](#g-weitere-mandanten-anbinden-über-federation)                                                     |
| Login bricht ab, alle Werte stimmen, External ID                          | SPA-Registrierung hängt nicht am User Flow                                                    | [External ID c\)](#c-user-flow-anlegen)                                                                   |
| Konten heißen in der Kontoauswahl und der Nutzerliste `unknown`           | Display Name wird im User Flow nicht abgefragt                                                | [External ID c\)](#c-user-flow-anlegen)                                                                   |
| Registrierungen sind da, funktionieren aber nicht                         | im Arbeitsmandanten statt im externen angelegt                                                | Mandanten oben rechts im Portal prüfen                                                                    |
| External ID nach 30 Tagen abgeschaltet                                    | externer Mandant hat keine Subscription                                                       | [External ID a\)](#a-externen-mandanten-anlegen)                                                          |
