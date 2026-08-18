#!/usr/bin/env node
// Deploy der Node-API auf den Azure App Service — EIN Befehl für die vier Schritte, die
// docs/azure-setup.md (Schritt 6) von Hand aufzählt:
//
//   1. apps/api bauen (tsc → dist/)
//   2. `pnpm --prod --legacy deploy` — Package flach mit echtem node_modules herausziehen
//   3. zippen
//   4. `az webapp deploy --type zip`
//
// `--prod` in Schritt 2 lässt die devDependencies (typescript, tsx, drizzle-kit, @types/*) aus dem
// ZIP: kleinerer Upload, schnelleres Mounten unter WEBSITE_RUN_FROM_PACKAGE=1 und kein Build-Werkzeug
// im Produktions-Runtime. `--legacy` ist die alte deploy-Semantik — ohne das Flag verlangt pnpm 10
// `inject-workspace-packages=true` im Workspace und bricht ab.
//
// `node-linker=hoisted` ist NICHT Kosmetik, sondern der Unterschied zwischen lauffähig und kaputt:
// pnpms Standard-Layout legt in node_modules/ nur Symlinks nach node_modules/.pnpm/<paket>/ ab, und
// dort liegen auch die Geschwister-Dependencies des Pakets. `zip` löst Symlinks per Default auf
// (dagegen gäbe es -y) und kopiert den Inhalt an die Symlink-Stelle — womit das Paket seine
// Geschwister verliert. In Azure stirbt die API dann beim Start mit
// `ERR_MODULE_NOT_FOUND: Cannot find package '@azure/logger' imported from
// .../node_modules/@azure/identity/dist/esm/util/logging.js`. Lokal fällt das nie auf, weil dort echte
// Symlinks stehen. `hoisted` erzeugt ein flaches node_modules aus echten Verzeichnissen — und das ZIP
// schrumpft nebenbei von 68 auf 15 MB, weil die aufgelösten Symlinks jedes Paket doppelt enthielten.
// assertNoSymlinks() unten hält den Zustand fest, falls das Flag jemand entfernt.
//
// Anders als scripts/deploy-cloudflare.mjs BAUT dieses Script selbst. Der Cloudflare-Deploy läuft
// aus der CI, wo der Build ein eigener Job-Step ist; der Azure-Deploy ist eine manuelle lokale
// Aktion, und ein altes dist/ würde still veralteten Code deployen.
//
// Ziel-Ressourcen kommen aus .unitix/project.json → azure (resourceGroup, apiAppName). Committet,
// weil Ressourcennamen keine Secrets sind — und weil so lokal und (später) CI dasselbe Ziel treffen.
// Der Block wird bewusst NICHT in apps/web/src/shared/lib/projectConfig.ts aufgenommen: er ist
// Deploy-Konfiguration und hat im SPA-Bundle nichts zu suchen.
//
// Was NICHT mitgeht: project.json und jede .env. Die Laufzeit-Konfiguration kommt in Azure aus den
// App Settings (docs/azure-setup.md, Schritt 3); assertNoEnvFiles() unten hält das fest.
//
// Voraussetzungen (fail loud): Azure CLI installiert und `az login` gelaufen (dieselbe Sitzung, die
// auch db:migrate als DB-Passwort-Ersatz nutzt), `zip` bzw. auf Windows PowerShell.
//
// Details: docs/azure-setup.md.

import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// Staging-Verzeichnis und ZIP liegen unter .artifacts/ (gitignored).
const DEPLOY_DIR = '.artifacts/api'
const ZIP_FILE = '.artifacts/api.zip'

function fail(message) {
  console.error(`\n✖ deploy:api: ${message}\n`)
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

// Ein Schritt der Kette. Bricht die Kette ab, statt mit halbem Ergebnis weiterzulaufen.
function run(label, command, args, { cwd = repoRoot } = {}) {
  const r = spawnSync(command, args, { cwd, stdio: 'inherit', env: process.env })
  if (r.error) fail(`${label}: "${command}" konnte nicht gestartet werden (${r.error.message}).`)
  if (r.status !== 0) fail(`${label} beendete mit Code ${r.status}.`)
}

// Explizites Argument schlägt project.json — so deployt man ohne Umschreiben der Config einmalig
// gegen eine andere Ressourcengruppe.
function resolveTarget() {
  const azure = (readJson('.unitix/project.json') ?? {}).azure ?? {}
  const resourceGroup = argValue('--resource-group') || azure.resourceGroup
  const appName = argValue('--app-name') || azure.apiAppName
  if (!resourceGroup || !appName) {
    fail(
      'Ziel unbekannt. Bitte in .unitix/project.json ergänzen:\n' +
        '  "azure": { "resourceGroup": "<rg>", "apiAppName": "<name-der-web-app>" }\n' +
        'Oder einmalig: pnpm deploy:api --resource-group=<rg> --app-name=<name>\n' +
        'Beide Namen stehen im Portal auf der Übersicht der Web App. Details: docs/azure-setup.md.',
    )
  }
  return { resourceGroup, appName }
}

// pg.user IST der Name der Web App: Azure benennt die Managed Identity nach ihr, und dieser Name ist
// die DB-Rolle. Weichen sie ab, endet in Azure jeder Query mit `permission denied for table`.
function warnOnIdentityMismatch() {
    const config = readJson('.unitix/project.json') ?? {}
    const appName = (config.azure ?? {}).apiAppName
    const pgUser = (config.pg ?? {}).user
    if (appName && pgUser && appName !== pgUser) {
      console.log(
        `⚠ .unitix/project.json: pg.user ("${pgUser}") weicht von azure.apiAppName ("${appName}") ab.\n` +
          '  In Azure ist PGUSER der Name der Web App — die DB-Rolle heisst so wie die Managed Identity.\n' +
          '  Bleibt das so, endet jeder Query mit "permission denied for table".',
      )
    }
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

// Ein Symlink im Staging-Verzeichnis heißt: das ZIP wird kaputt (siehe Kopfkommentar). Der Fehler
// zeigt sich sonst erst im App-Service-Log, eine Deploy-Runde später. `.bin/` ist ausgenommen — das
// sind CLI-Shims, die im App Service niemand aufruft.
function collectSymlinks(absDir, rel = '', found = []) {
  for (const entry of readdirSync(absDir, { withFileTypes: true })) {
    if (entry.name === '.bin') continue
    const relPath = rel ? `${rel}/${entry.name}` : entry.name
    if (entry.isSymbolicLink()) found.push(relPath)
    else if (entry.isDirectory()) collectSymlinks(resolve(absDir, entry.name), relPath, found)
  }
  return found
}

// Letzte Linie gegen einen .env-Leak ins ZIP: `pnpm deploy` kopiert Dotfiles mit, `zip -r .` nimmt
// sie auf. node_modules/ ist ausgenommen — dort liegen .env-Fixtures fremder Pakete.
function collectEnvFiles(absDir, rel = '', found = []) {
  for (const entry of readdirSync(absDir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue
    const relPath = rel ? `${rel}/${entry.name}` : entry.name
    if (entry.isFile() && entry.name.startsWith('.env')) found.push(relPath)
    else if (entry.isDirectory()) collectEnvFiles(resolve(absDir, entry.name), relPath, found)
  }
  return found
}

function assertNoEnvFiles() {
  const found = collectEnvFiles(resolve(repoRoot, DEPLOY_DIR))
  if (found.length === 0) return
  fail(
    `${found.length} .env-Datei(en) in ${DEPLOY_DIR}/ — die dürfen nicht ins ZIP:\n` +
      found.map((f) => `  ${f}`).join('\n') +
      '\nIn Azure kommt die Konfiguration aus den App Settings — eine mitgelieferte .env liefert Werte,\n' +
      'die dort fehlen, und trägt lokale Werte in ein Produktions-Artefakt.',
  )
}

function assertFlatNodeModules() {
  const symlinks = collectSymlinks(resolve(repoRoot, DEPLOY_DIR))
  if (symlinks.length === 0) return
  fail(
    `${symlinks.length} Symlink(s) in ${DEPLOY_DIR}/ — daraus würde ein kaputtes ZIP:\n` +
      symlinks
        .slice(0, 5)
        .map((s) => `  ${s}`)
        .join('\n') +
      '\nzip löst Symlinks auf, und ein aufgelöster pnpm-Link verliert seine Geschwister-Dependencies:\n' +
      'die API startet lokal, stirbt in Azure aber mit ERR_MODULE_NOT_FOUND. Erwartet wird ein flaches\n' +
      'node_modules — steht `--config.node-linker=hoisted` noch am pnpm-deploy-Aufruf?',
  )
}

// node kann nicht zippen. `zip` liegt auf macOS/Linux bei; unter Windows übernimmt Compress-Archive.
function createZip() {
  rmSync(resolve(repoRoot, ZIP_FILE), { force: true }) // sonst UPDATET zip das alte Archiv
  const cwd = resolve(repoRoot, DEPLOY_DIR)
  if (process.platform === 'win32') {
    run('Zippen', 'powershell', [
      '-NoProfile',
      '-Command',
      `Compress-Archive -Path * -DestinationPath ..\\${ZIP_FILE.split('/').pop()} -Force`,
    ], { cwd })
    return
  }
  run('Zippen', 'zip', ['-r', '-q', `../${ZIP_FILE.split('/').pop()}`, '.'], { cwd })
}

function main() {
  const { resourceGroup, appName } = resolveTarget()

  const backend = (readJson('.unitix/project.json') ?? {}).backend
  if (backend !== 'azure') {
    console.log(`⚠ .unitix/project.json → backend=${backend ?? '(fehlt)'} — die API deployt trotzdem.`)
  }

  warnOnIdentityMismatch()
  assertAzLogin()

  console.log('→ 1/4 apps/api bauen …')
  run('Build', 'pnpm', ['--filter', '@app/api', 'build'])

  // pnpm deploy bricht ab, wenn das Zielverzeichnis nicht leer ist — deshalb vorher wegwerfen.
  console.log(`→ 2/4 Package nach ${DEPLOY_DIR}/ herausziehen (flach, ohne devDependencies) …`)
  rmSync(resolve(repoRoot, DEPLOY_DIR), { recursive: true, force: true })
  run('pnpm deploy', 'pnpm', [
    '--config.node-linker=hoisted',
    '--filter',
    '@app/api',
    '--prod',
    '--legacy',
    'deploy',
    DEPLOY_DIR,
  ])
  rmSync(resolve(repoRoot, DEPLOY_DIR, '.env'), { force: true })
  rmSync(resolve(repoRoot, DEPLOY_DIR, '.env.example'), { force: true })
  assertNoEnvFiles()
  assertFlatNodeModules()

  console.log(`→ 3/4 ${ZIP_FILE} packen …`)
  createZip()

  console.log(`→ 4/4 Upload nach ${resourceGroup} / ${appName} (Neustart, wenige Sekunden) …`)
  run('az webapp deploy', 'az', [
    'webapp',
    'deploy',
    '--resource-group',
    resourceGroup,
    '--name',
    appName,
    '--src-path',
    ZIP_FILE,
    '--type',
    'zip',
  ])

  console.log(`\n✓ API deployt. Smoke-Test: https://${appName}.azurewebsites.net/health`)
}

main()
