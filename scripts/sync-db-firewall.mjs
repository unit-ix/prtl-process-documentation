#!/usr/bin/env node
// Firewall des PostgreSQL Flexible Server auf die Outbound-IPs des App Service abgleichen — EIN
// idempotenter Befehl statt der Handarbeit, die docs/azure-setup.md (Schritt 3) vorher aufzählte:
// "Outbound addresses kopieren und für jede IP eine Regel anlegen".
//
// Das Problem an der Handarbeit ist nicht der Aufwand, sondern die Haltbarkeit. Die Liste ist ein
// Snapshot, und wenn sie veraltet, erreicht die API die DB nicht mehr — im Log sieht das wie ein
// Timeout aus. Drei Dinge machen die Liste ungültig, und keines davon meldet sich:
//
//   1. Web App löschen und in einer ANDEREN Resource Group neu anlegen (Deployment-Unit wechselt)
//   2. die letzte App einer RG+Region löschen und neu anlegen (dito)
//   3. Scaling ZWISCHEN den Tier-Gruppen {Basic, Standard, Premium} / {PremiumV2} / {PremiumV3} /
//      {Pmv3 innerhalb PremiumV3}
//   4. ein PITR-Restore der Datenbank — der wiederhergestellte Server hat KEINE Firewall-Regeln
//
// Deshalb liest das Script `possibleOutboundIpAddresses` und nicht `outboundIpAddresses`: die
// erste Liste enthält alle IPs, die die App in ihrer Deployment-Unit je nutzen kann, TIERÜBERGREIFEND.
// Damit ist Fall 3 gar keiner mehr — B1 → B2 → S1 → P1v3 ändert an der Firewall nichts. Wachsen kann
// die Liste, wenn Azure der Deployment-Unit später ein neues Tier hinzufügt; wirksam wird das erst,
// wenn man selbst dorthin wechselt. Also ein Ereignis, das wir auslösen, nicht eines, das uns
// überrascht — und dann genügt ein erneuter Lauf.
//
// Scale-OUT (Instanzzahl) ändert die Outbound-IPs nie.
//
// Verwaltet werden ausschließlich Regeln mit dem Präfix `api-outbound-`; der Regelname trägt die IP
// (`api-outbound-20-79-1-2`), womit der Abgleich ein reiner Mengenvergleich ist und keine
// Index-Buchhaltung braucht. Alles ohne dieses Präfix bleibt unangetastet — die Regel für den
// eigenen Rechner aus Schritt 2 überlebt jeden Lauf.
//
// Was das Script NICHT tut: die Checkbox "Allow public access from any Azure service" ersetzen. Die
// lässt laut Azure-Doku "connections from the subscriptions of other customers" durch, ist deshalb
// keine Option, und eine vorhandene 0.0.0.0-Regel wird hier gemeldet statt still geduldet.
//
//   pnpm db:firewall             # abgleichen
//   pnpm db:firewall --dry-run   # nur zeigen, was passieren würde
//
// Ziel-Ressourcen kommen aus .unitix/project.json → azure (resourceGroup, apiAppName, dbServerName),
// einmalig überschreibbar per --resource-group= / --app-name= / --db-server=.
//
// Voraussetzung (fail loud): Azure CLI installiert und `az login` gelaufen — dieselbe Sitzung, die
// auch db:migrate als DB-Passwort-Ersatz nutzt. Welche Flag-Belegung die installierte CLI für
// `firewall-rule` erwartet, erkennt resolveFlagStyle() unten selbst — sie wurde zwischen Versionen
// vertauscht.
//
// Details: docs/azure-setup.md.

import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// Nur Regeln mit diesem Präfix gehören dem Script. Die Grenze ist der ganze Sicherheitsmechanismus
// gegen "Script löscht die Regel, über die gerade migriert wird".
const RULE_PREFIX = 'api-outbound-'

function fail(message) {
  console.error(`\n✖ db:firewall: ${message}\n`)
  process.exit(1)
}

function readJson(relPath) {
  const abs = resolve(repoRoot, relPath)
  if (!existsSync(abs)) return null
  try {
    return JSON.parse(readFileSync(abs, 'utf8'))
  } catch {
    return null
  }
}

function argValue(flag) {
  const prefix = `${flag}=`
  return process.argv
    .slice(2)
    .map((a) => (a.startsWith(prefix) ? a.slice(prefix.length) : null))
    .find(Boolean)
}

const dryRun = process.argv.slice(2).includes('--dry-run')

// Alle az-Aufrufe laufen hierüber: stdout wird gelesen (nicht durchgeleitet), stderr nur im
// Fehlerfall gezeigt — sonst überdeckt das CLI-Rauschen die eigentliche Zusammenfassung.
function az(label, args, { json = false } = {}) {
  const r = spawnSync('az', args, { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  if (r.error) {
    fail(
      `${label}: Azure CLI nicht gefunden (${r.error.message}). Installieren (brew install azure-cli) ` +
        'und `az login` ausführen.',
    )
  }
  if (r.status !== 0) fail(`${label} beendete mit Code ${r.status}:\n${(r.stderr ?? '').trim()}`)
  if (!json) return (r.stdout ?? '').trim()
  try {
    return JSON.parse(r.stdout)
  } catch {
    fail(`${label}: Antwort war kein JSON.`)
  }
}

// Explizites Argument schlägt project.json — so gleicht man ohne Umschreiben der Config einmalig
// eine andere Umgebung ab (DEV vs. PROD).
function resolveTarget() {
  const azure = (readJson('.unitix/project.json') ?? {}).azure ?? {}
  const resourceGroup = argValue('--resource-group') || azure.resourceGroup
  const appName = argValue('--app-name') || azure.apiAppName
  const dbServer = argValue('--db-server') || azure.dbServerName
  if (!resourceGroup || !appName || !dbServer) {
    fail(
      'Ziel unbekannt. Bitte in .unitix/project.json ergänzen:\n' +
        '  "azure": { "resourceGroup": "<rg>", "apiAppName": "<name-der-web-app>", "dbServerName": "<psql-name>" }\n' +
        'Oder einmalig: pnpm db:firewall --resource-group=<rg> --app-name=<name> --db-server=<psql-name>\n' +
        'Der DB-Name ist der Server-Name ohne .postgres.database.azure.com. Details: docs/azure-setup.md.',
    )
  }
  return { resourceGroup, appName, dbServer }
}

function assertAzLogin() {
  const r = spawnSync('az', ['account', 'show'], { cwd: repoRoot, stdio: 'pipe', encoding: 'utf8' })
  if (r.error) {
    fail(
      'Azure CLI nicht gefunden. Installieren (brew install azure-cli) und `az login` ausführen — ' +
        'dieselbe Sitzung, die auch db:migrate als Passwort-Ersatz nutzt.',
    )
  }
  if (r.status !== 0) fail('Keine aktive Azure-Sitzung — bitte `az login` ausführen.')
}

const ruleName = (ip) => RULE_PREFIX + ip.replaceAll('.', '-')

// Die Azure CLI hat die Flags dieser Befehlsgruppe zwischen Versionen umbenannt: bis 2.75 heißt der
// SERVER `--name` und die Regel `--rule-name`, in neueren Versionen heißt der Server `--server-name`
// und die Regel `--name`. Beide Belegungen sind für sich schlüssig, keine lässt sich am Namen
// erkennen — und wer die falsche wählt, legt eine Regel auf einem Server an, der nicht existiert
// (bzw. bekommt "the following arguments are required"). Deshalb einmal die Hilfe befragen statt
// raten; der Aufruf ist lokal und kostet keinen Roundtrip.
function resolveFlagStyle() {
  const help = spawnSync('az', ['postgres', 'flexible-server', 'firewall-rule', 'create', '--help'], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const text = `${help.stdout ?? ''}${help.stderr ?? ''}`
  if (!text.trim()) fail('Azure CLI antwortet nicht auf `az postgres flexible-server firewall-rule create --help`.')
  return text.includes('--rule-name')
    ? { server: '--name', rule: '--rule-name' }
    : { server: '--server-name', rule: '--name' }
}

// Von main() gesetzt, bevor irgendeine Regel-Operation läuft.
let flags

// Beide Listen kommen als komma-separierter String. IPv6 wird verworfen: Postgres-Firewall-Regeln
// müssen laut Doku IPv4 sein und lehnen IPv6 mit einem Validierungsfehler ab (App-Service-Outbound-
// IPv6 ist Public Preview — es gehört bei diesem Stack aus).
function readOutboundIps(resourceGroup, appName) {
  const app = az(
    'az webapp show',
    ['webapp', 'show', '--resource-group', resourceGroup, '--name', appName,
      '--query', '{current: outboundIpAddresses, possible: possibleOutboundIpAddresses}', '--output', 'json'],
    { json: true },
  )

  const split = (s) => (s ?? '').split(',').map((x) => x.trim()).filter(Boolean)
  const possible = split(app.possible)
  const ipv4 = [...new Set(possible.filter((ip) => !ip.includes(':')))].sort()

  if (ipv4.length === 0) {
    fail(
      `Die Web App "${appName}" liefert keine Outbound-IPs.\n` +
        'Das ist der Premium-V4-Fall: Pv4 hat laut Azure-Doku bewusst KEINEN stabilen Satz von\n' +
        'Outbound-IPs, ARM gibt für beide Properties leere Strings zurück. Dann trägt keine\n' +
        'IP-Liste mehr — es braucht VNet-Integration + NAT Gateway. Also entweder Tier zurück auf\n' +
        'Basic/Standard/PremiumV3 oder der Stack bekommt ein VNet.',
    )
  }

  const dropped = possible.length - ipv4.length
  if (dropped > 0) console.log(`  ${dropped} IPv6-Adresse(n) übersprungen (Postgres-Firewall ist IPv4-only).`)

  return { ipv4, currentCount: split(app.current).length }
}

function readManagedRules(resourceGroup, dbServer) {
  const all = az(
    'az postgres flexible-server firewall-rule list',
    ['postgres', 'flexible-server', 'firewall-rule', 'list', '--resource-group', resourceGroup,
      flags.server, dbServer, '--output', 'json'],
    { json: true },
  )

  // Start = Ende = 0.0.0.0 ist CLI-seitig das Äquivalent zur Portal-Checkbox "Allow public access
  // from any Azure service" — laut Doku inklusive fremder Kunden-Subscriptions.
  const anyAzure = all.filter((r) => r.startIpAddress === '0.0.0.0' && r.endIpAddress === '0.0.0.0')
  if (anyAzure.length > 0) {
    console.log(
      `\n⚠ ${anyAzure.length} Regel(n) mit 0.0.0.0–0.0.0.0 (${anyAzure.map((r) => r.name).join(', ')}) — das ist\n` +
        '  "Allow public access from any Azure service" und lässt fremde Tenants durch. Bitte im Portal\n' +
        '  entfernen; das Script fasst sie nicht an, weil es nur eigene Regeln löscht.',
    )
  }

  const managed = new Map()
  for (const r of all) if (r.name.startsWith(RULE_PREFIX)) managed.set(r.name, r)
  return { managed, foreignCount: all.length - managed.size }
}

function applyRule(verb, resourceGroup, dbServer, name, ip) {
  az(`az … firewall-rule ${verb}`, [
    'postgres', 'flexible-server', 'firewall-rule', verb,
    '--resource-group', resourceGroup, flags.server, dbServer, flags.rule, name,
    '--start-ip-address', ip, '--end-ip-address', ip,
  ])
}

function main() {
  const { resourceGroup, appName, dbServer } = resolveTarget()

  assertAzLogin()
  flags = resolveFlagStyle()

  console.log(`→ Outbound-IPs von ${appName} lesen (possibleOutboundIpAddresses) …`)
  const { ipv4, currentCount } = readOutboundIps(resourceGroup, appName)
  console.log(`  ${ipv4.length} mögliche IPv4-Adresse(n), davon ${currentCount} aktuell in Benutzung.`)

  console.log(`→ Firewall-Regeln von ${dbServer} lesen …`)
  const { managed, foreignCount } = readManagedRules(resourceGroup, dbServer)
  console.log(`  ${managed.size} eigene Regel(n) (${RULE_PREFIX}*), ${foreignCount} fremde bleiben unangetastet.`)

  const desired = new Map(ipv4.map((ip) => [ruleName(ip), ip]))
  const toCreate = [...desired].filter(([name]) => !managed.has(name))
  // Namensgleich, aber Adressen von Hand verbogen: geradeziehen statt melden.
  const toFix = [...desired].filter(([name, ip]) => {
    const r = managed.get(name)
    return r && (r.startIpAddress !== ip || r.endIpAddress !== ip)
  })
  const toDelete = [...managed.keys()].filter((name) => !desired.has(name))

  if (toCreate.length + toFix.length + toDelete.length === 0) {
    console.log('\n✓ Firewall ist synchron — nichts zu tun.')
    return
  }

  console.log('')
  for (const [name, ip] of toCreate) console.log(`  + ${ip}  (${name})`)
  for (const [name, ip] of toFix) console.log(`  ~ ${ip}  (${name}, Adressen korrigiert)`)
  for (const name of toDelete) console.log(`  − ${name}`)

  if (dryRun) {
    console.log('\n--dry-run: nichts geändert.')
    return
  }

  // Serieller Ablauf mit Absicht: jede Regeländerung ist eine ARM-Operation auf DEMSELBEN Server,
  // parallel quittiert Azure das mit einem Conflict. Kostet einige Sekunden pro Regel.
  const total = toCreate.length + toFix.length + toDelete.length
  let done = 0
  const step = (label) => console.log(`→ ${++done}/${total} ${label} …`)

  for (const [name, ip] of toCreate) {
    step(`anlegen ${ip}`)
    applyRule('create', resourceGroup, dbServer, name, ip)
  }
  for (const [name, ip] of toFix) {
    step(`korrigieren ${ip}`)
    applyRule('update', resourceGroup, dbServer, name, ip)
  }
  for (const name of toDelete) {
    step(`entfernen ${name}`)
    az('az … firewall-rule delete', [
      'postgres', 'flexible-server', 'firewall-rule', 'delete',
      '--resource-group', resourceGroup, flags.server, dbServer, flags.rule, name, '--yes',
    ])
  }

  console.log(
    `\n✓ ${desired.size} Regel(n) gesetzt. Änderungen an der Firewall greifen laut Azure-Doku erst nach\n` +
      '  bis zu 5 Minuten — ein sofortiger Verbindungsversuch kann noch scheitern.',
  )
}

main()
