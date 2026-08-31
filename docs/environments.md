# Umgebungen & Branches — ein `main`, zwei Azure-Umgebungen

> Die **einzige** Quelle des Umgebungs- und Branch-Modells. Andere Docs verlinken hierher statt es zu
> wiederholen. Die Umgebungs-*Werte* stehen an einer einzigen Stelle:
> [`.unitix/project.json`](../.unitix/project.json) → `environments`.

## Die vier Regeln

- **Ein Branch: `main`.** Kurzlebige `feature/*`-Branches sind erlaubt, langlebige Umgebungs-Branches
  nicht. Ein Branch pro Umgebung würde dasselbe Modell zweimal kodieren — einmal in Git, einmal in der
  Config — und beide können driften.
- **Umgebung ist ein Deploy-Ziel, kein Branch.** `--env=dev|prod` wählt den Block in `project.json`.
  Was in Prod läuft, sagt ein Git-Tag, nicht die Existenz eines Branches.
- **Lokal ist immer Dev** — strukturell, nicht als Default: [`apps/api/src/env.ts`](../apps/api/src/env.ts)
  liest fest `environments.dev`. Eine Umschalt-Variable existiert nicht, also kann man sie nicht
  versehentlich auf Prod stellen.
- **Der einzige Gate ist `pnpm deploy:prod`.** Ein Script, kein Command — damit er für jeden greift, der
  das Repo klont, nicht nur für den mit dem passenden Tooling.

```
main ──●────●────●────●────●────●──▶     jeder Merge ist Dev-fähig
       │                        │
       └─Tag prototype-ok       └─Tag prod-2026-09-01
                                  pnpm deploy:prod
```

## Der Prozess

| Schritt | Wo läuft was | Befehl |
| --- | --- | --- |
| 1. Prototyp | alles lokal, Seed-Daten | `platform: mock`, `pnpm dev` |
| 2. Dev-Umgebung aufsetzen | Entra + DB in Azure | `platform: azure`, [`azure-runbook.md`](azure-runbook.md), dann `pnpm deploy:dev` |
| 3. Entwickeln | SPA + API lokal, **DB in Azure-Dev** | `pnpm dev:full` |
| 4. Freigabe an den Kunden | Prod in Azure | `pnpm deploy:prod` |
| 5. Weiterentwickeln | wie 3, dann deployen | `feature/*` → `main` → `deploy:dev` → später `deploy:prod` |

Schritt 3 ist der Alltag: es gibt **keine lokale Datenbank**. Die API läuft auf `localhost:3000` gegen
die Azure-Dev-DB — passwortlos über `az login` statt Managed Identity. Das testet dieselbe
Authentifizierung wie Produktion.

## Was Dev und Prod teilen

Geteilt wird, was doppelt einzurichten wäre, ohne etwas zu trennen; getrennt wird, was Daten oder
Laufzeit berührt:

| Ressource | Dev | Prod | Warum |
| --- | --- | --- | --- |
| Entra-App-Registrierung | \<— geteilt —> | | Eine SPA- + eine API-Registrierung mit **allen** Origins als Redirect-URIs. Damit ist der Web-Bundle umgebungs-neutral: **ein** Build-Artefakt bedient beide Umgebungen |
| App-Service-Plan (B1) | \<— geteilt —> | | Zwei Apps auf einem Plan starten unabhängig voneinander. Spart ~12 €/Monat |
| PostgreSQL-Server | \<— geteilt —> | | Firewall und Entra-Admin nur einmal einrichten. Spart ~17 €/Monat |
| App Service | `…-node-dev` | `…-node` | Eigene Laufzeit, eigene App Settings, eigener Neustart |
| Datenbank | `app_dev` | `app` | Getrennte Daten |
| DB-Rolle / Managed Identity | `…-node-dev` | `…-node` | Die Rolle heißt wie die Identity, die heißt wie die App |
| Static Web App | eigene | eigene | Eine SWA proxied genau **ein** Backend |

**Konvention: Prod ohne Suffix, Dev mit `-dev`.** Der Prod-Name ist der kurze — er steht in URLs, die
Kunden sehen.

**Die Grenze des geteilten PG-Servers:** Point-in-Time-Restore läuft pro **Server**, nicht pro
Datenbank. Ein Dev-Restore erzeugt einen Klon-Server mit beiden Datenbanken, aus dem man die gewünschte
dumpt. Braucht ein Projekt unabhängiges Restore, ist das ein zweiter Server — eine Änderung im
`environments`-Block, kein Code-Umbau.

## Deployen

```bash
pnpm deploy:dev                 # Migrationen → API → SPA, ohne Rückfrage
pnpm deploy:prod                # dasselbe, mit Gates davor und Tag danach
pnpm deploy:dev --only=web      # nur die SPA (API neu zu starten kostet Sekunden Downtime)
```

Alle Flags: `--env=dev|prod`, `--only=db,api,web`, `--allow-destructive`, `--yes` und die beiden
Notausgänge `--resource-group=<rg>` / `--app-name=<name>`, die den `azure`-Block der Umgebung für
einen Lauf überschreiben.

Beides läuft über [`scripts/deploy-azure.mjs`](../scripts/deploy-azure.mjs), **lokal von Hand** — es gibt
bewusst noch keinen CI-Deploy nach Azure (Begründung und der spätere OIDC-Pfad:
[`azure-decisions.md`](azure-decisions.md#scope)). CI läuft `pnpm verify` auf jeden Push und PR.

Die Schritt-Reihenfolge ist fest und der Grund, warum es ein Script statt drei ist: **Migrationen vor
dem Deploy.** Neuer Code auf altem Schema stirbt beim ersten Query.

### Die Prod-Gates

Vor dem ersten Schritt, jeder ein Abbruch:

1. Branch `main`, Working-Tree clean, in Sync mit `origin/main`
2. `pnpm verify` grün
3. **Kein destruktives DDL** in den Migrationen seit dem letzten `prod-*`-Tag — `DROP COLUMN`,
   `DROP TABLE`, `TRUNCATE`, `ALTER COLUMN … TYPE`. Abbruch mit Dateinamen, außer mit
   `--allow-destructive`. Ohne `prod-*`-Tag (erster Prod-Deploy) werden alle Migrationen geprüft.
4. Getippte Bestätigung (`--yes` überspringt sie)

Nach erfolgreichem Deploy setzt und pusht das Script den Tag `prod-YYYY-MM-DD`. Ein fehlgeschlagener
Deploy hinterlässt keinen Tag — **was getaggt ist, ist deployt.** Ob es auch läuft, sagt der
Smoke-Test von Hand: [`azure-runbook.md`](azure-runbook.md#7-smoke-test).

## Lokal gegen eine andere Umgebung

Braucht es normalerweise nicht: `pnpm dev:full` zeigt auf Dev, fertig. Wer wirklich einmal gegen Prod
lesen muss, setzt die Variablen inline — gesetzte Umgebungsvariablen schlagen die Defaults aus
`project.json`:

```bash
PGDATABASE=app PGUSER=<dein-upn> pnpm dev:api
```

Das Ziel steht damit **sichtbar im Befehl** statt still in einer Datei, und die Startzeile der API
(`Datenbank-Ziel: …`) bestätigt es.

## Prod-Hotfix bei unveröffentlichter Arbeit auf `main`

Der einzige Fall, für den ein `dev`-Branch nötig wäre — und er kommt selten genug, um ihn ad hoc zu
lösen statt dauerhaft einen Branch zu pflegen:

```bash
git checkout -b hotfix/<slug> prod-2026-09-01   # vom letzten Prod-Tag, nicht von main
# fixen, committen
pnpm deploy:prod                                # Gate erlaubt hier explizit den Hotfix-Branch
git checkout main && git cherry-pick <sha>
```

## Kosten

Rund **45 €/Monat** für beide Umgebungen: SWA Standard 2 × ~8 € (Free proxied kein `/api/*`), App
Service B1 ~12 € (ein Plan, zwei Apps), PostgreSQL B1ms ~17 € (ein Server, zwei Datenbanken). Zwei
vollständig getrennte Stacks wären ~74 €.

Der Mock-Prototyp (`platform: mock`) kostet nichts — Cloudflare Pages, siehe [`hosting.md`](hosting.md).
