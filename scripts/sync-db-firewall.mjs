#!/usr/bin/env node
// Firewall des PostgreSQL Flexible Server auf die Outbound-IPs der App Services abgleichen.
//
//   pnpm db:firewall             # abgleichen
//   pnpm db:firewall --dry-run   # nur zeigen, was passieren würde
//
// KEIN --env: die Firewall gehört dem SERVER, nicht einer Umgebung. Dev und Prod teilen sich
// standardmäßig einen Server, und der Abgleich löscht jede api-outbound-Regel, die nicht in der
// Soll-Liste steht — pro Umgebung gelaufen würde ein Dev-Lauf die Regeln von Prod entfernen und die
// Produktions-API binnen Minuten von der Datenbank trennen. Deshalb pro Server die VEREINIGUNG der
// IPs aller App Services, die ihn benutzen.
//
// Warum possibleOutboundIpAddresses statt outboundIpAddresses, was die Liste ungültig macht und
// warum nur Regeln mit dem eigenen Präfix angefasst werden: docs/azure-setup.md, Schritt 3.

import { spawnSync } from 'node:child_process'
import { argValue, hasFlag, readProjectConfig, repoRoot } from './lib/environment.mjs'

// Alles ohne dieses Präfix bleibt unangetastet — u. a. die Regel für den eigenen Rechner.
const RULE_PREFIX = 'api-outbound-'

function fail(message) {
  console.error(`\n✖ db:firewall: ${message}\n`)
  process.exit(1)
}

const dryRun = hasFlag('--dry-run')

// stderr nur im Fehlerfall zeigen, sonst überdeckt das CLI-Rauschen die Zusammenfassung.
function az(label, args, { json = false, soft = false } = {}) {
  const r = spawnSync('az', args, { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  if (r.error) {
    fail(
      `${label}: Azure CLI nicht gefunden (${r.error.message}). Installieren (brew install azure-cli) ` +
        'und `az login` ausführen.',
    )
  }
  if (r.status !== 0 && soft) return null // noch nicht angelegte Ressource ist kein Fehler
  if (r.status !== 0) fail(`${label} beendete mit Code ${r.status}:\n${(r.stderr ?? '').trim()}`)
  if (!json) return (r.stdout ?? '').trim()
  try {
    return JSON.parse(r.stdout)
  } catch {
    fail(`${label}: Antwort war kein JSON.`)
  }
}

function resolveTargets() {
  const override = {
    resourceGroup: argValue('--resource-group'),
    appName: argValue('--app-name'),
    dbServer: argValue('--db-server'),
  }
  if (override.resourceGroup && override.appName && override.dbServer) {
    console.log('→ Explizites Einzelziel aus den Argumenten — der environments-Block wird ignoriert.')
    return [{ name: '(argumente)', ...override }]
  }
  if (override.resourceGroup || override.appName || override.dbServer) {
    fail(
      'Ein Einzelziel braucht alle drei Argumente: --resource-group= --app-name= --db-server=\n' +
        'Teilweise gesetzt wäre es halb aus der Config und halb aus dem Befehl — und damit unlesbar.',
    )
  }

  const environments = readProjectConfig().environments ?? {}
  const targets = Object.entries(environments).map(([name, env]) => ({
    name,
    resourceGroup: (env.azure ?? {}).resourceGroup,
    appName: (env.azure ?? {}).apiAppName,
    // Abgeleitet statt als zweites Feld gepflegt.
    dbServer: ((env.pg ?? {}).host ?? '').split('.')[0],
  }))

  const broken = targets.filter((t) => !t.resourceGroup || !t.appName || !t.dbServer)
  if (targets.length === 0 || broken.length > 0) {
    fail(
      'Ziel unbekannt. Bitte in .unitix/project.json je Umgebung ergänzen:\n' +
        '  "environments": { "dev": {\n' +
        '      "azure": { "resourceGroup": "<rg>", "apiAppName": "<name-der-web-app>" },\n' +
        '      "pg": { "host": "<psql-name>.postgres.database.azure.com", … } } }\n' +
        (broken.length > 0 ? `Unvollständig: ${broken.map((t) => t.name).join(', ')}\n` : '') +
        'Oder einmalig: pnpm db:firewall --resource-group=<rg> --app-name=<name> --db-server=<psql-name>\n' +
        '--db-server erwartet den Server-Namen ohne .postgres.database.azure.com. Details: docs/azure-setup.md.',
    )
  }
  return targets
}

function groupByServer(targets) {
  const servers = new Map()
  for (const t of targets) {
    const existing = servers.get(t.dbServer)
    if (existing) existing.apps.push(t)
    // Die Resource Group des Servers: die der ersten Umgebung, die ihn nennt.
    else servers.set(t.dbServer, { dbServer: t.dbServer, resourceGroup: t.resourceGroup, apps: [t] })
  }
  return [...servers.values()]
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

// Die Azure CLI hat die Flags dieser Befehlsgruppe zwischen Versionen vertauscht: bis 2.75 ist der
// SERVER `--name` und die Regel `--rule-name`, danach umgekehrt. Wer falsch rät, legt eine Regel auf
// einem Server an, der nicht existiert — deshalb die Hilfe befragen statt raten.
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

// IPv6 wird verworfen: Postgres-Firewall-Regeln müssen IPv4 sein und lehnen IPv6 mit einem
// Validierungsfehler ab.
function readOutboundIps(resourceGroup, appName) {
  const app = az(
    'az webapp show',
    ['webapp', 'show', '--resource-group', resourceGroup, '--name', appName,
      '--query', '{current: outboundIpAddresses, possible: possibleOutboundIpAddresses}', '--output', 'json'],
    { json: true, soft: true },
  )
  if (!app) return null

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
  const targets = resolveTargets()

  assertAzLogin()
  flags = resolveFlagStyle()

  const servers = groupByServer(targets)
  console.log(
    `→ ${targets.length} Umgebung(en) (${targets.map((t) => t.name).join(', ')}) an ` +
      `${servers.length} Server: ${servers.map((s) => s.dbServer).join(', ')}`,
  )

  let changed = 0
  for (const server of servers) changed += syncServer(server)

  if (changed === 0) console.log('\n✓ Alle Server sind synchron — nichts zu tun.')
}

/** Gleicht EINEN Server gegen die Vereinigung der IPs aller Apps ab, die ihn benutzen. */
function syncServer({ dbServer, resourceGroup, apps }) {
  console.log(`\n▸ ${dbServer}`)

  const ips = new Set()
  const missing = []
  for (const app of apps) {
    const result = readOutboundIps(app.resourceGroup, app.appName)
    if (!result) {
      missing.push(app)
      continue
    }
    for (const ip of result.ipv4) ips.add(ip)
    console.log(
      `  ${app.name}: ${app.appName} → ${result.ipv4.length} mögliche IPv4-Adresse(n), ` +
        `davon ${result.currentCount} aktuell in Benutzung.`,
    )
  }

  for (const app of missing) {
    console.log(`  ⚠ ${app.name}: Web App "${app.appName}" existiert (noch) nicht — übersprungen.`)
  }

  if (ips.size === 0) {
    // Leere Soll-Liste würde ALLE eigenen Regeln löschen.
    console.log('  ⚠ Keine App Service dieses Servers ist erreichbar — Abgleich übersprungen.')
    return 0
  }
  if (missing.length > 0 && !hasFlag('--allow-partial')) {
    fail(
      `${missing.length} von ${apps.length} App Service(s) an ${dbServer} sind nicht lesbar.\n` +
        'Ein Abgleich würde jetzt die Regeln der fehlenden Umgebung(en) löschen — bei einer noch nicht\n' +
        'angelegten Umgebung harmlos, bei einem Tippfehler im Namen ein Ausfall der anderen.\n' +
        'Wenn die Umgebung wirklich noch nicht existiert:  pnpm db:firewall --allow-partial',
    )
  }

  console.log(`  → Firewall-Regeln lesen …`)
  const { managed, foreignCount } = readManagedRules(resourceGroup, dbServer)
  console.log(`    ${managed.size} eigene Regel(n) (${RULE_PREFIX}*), ${foreignCount} fremde bleiben unangetastet.`)

  const desired = new Map([...ips].sort().map((ip) => [ruleName(ip), ip]))
  const toCreate = [...desired].filter(([name]) => !managed.has(name))
  // Namensgleich, aber Adressen von Hand verbogen: geradeziehen statt melden.
  const toFix = [...desired].filter(([name, ip]) => {
    const r = managed.get(name)
    return r && (r.startIpAddress !== ip || r.endIpAddress !== ip)
  })
  const toDelete = [...managed.keys()].filter((name) => !desired.has(name))

  if (toCreate.length + toFix.length + toDelete.length === 0) {
    console.log('    ✓ synchron')
    return 0
  }

  for (const [name, ip] of toCreate) console.log(`    + ${ip}  (${name})`)
  for (const [name, ip] of toFix) console.log(`    ~ ${ip}  (${name}, Adressen korrigiert)`)
  for (const name of toDelete) console.log(`    − ${name}`)

  if (dryRun) {
    console.log('    --dry-run: nichts geändert.')
    return 1
  }

  // Serieller Ablauf mit Absicht: jede Regeländerung ist eine ARM-Operation auf DEMSELBEN Server,
  // parallel quittiert Azure das mit einem Conflict. Kostet einige Sekunden pro Regel.
  const total = toCreate.length + toFix.length + toDelete.length
  let done = 0
  const step = (label) => console.log(`    ${++done}/${total} ${label} …`)

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
    `    ✓ ${desired.size} Regel(n) gesetzt. Änderungen greifen laut Azure-Doku erst nach bis zu\n` +
      '      5 Minuten — ein sofortiger Verbindungsversuch kann noch scheitern.',
  )
  return 1
}

try {
  main()
} catch (error) {
  fail(error instanceof Error ? error.message : String(error))
}
