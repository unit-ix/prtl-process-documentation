#!/usr/bin/env node
// Azure-Deploy: Migrationen → API → SPA.
//
//   node scripts/deploy-azure.mjs --env=dev|prod [--only=db,api,web]
//                                 [--allow-destructive] [--yes]
//                                 [--resource-group=<rg>] [--app-name=<name>]
//
// Modell, Gates und Ressourcen-Konvention: docs/environments.md. Setup: docs/azure-runbook.md.

import { spawnSync } from 'node:child_process'
import { createInterface } from 'node:readline/promises'
import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { argValue, hasFlag, readProjectConfig, repoRoot, resolveEnvironment } from './lib/environment.mjs'

const DEPLOY_DIR = '.artifacts/api'
const ZIP_FILE = '.artifacts/api.zip'
const MIGRATIONS = 'apps/api/drizzle'
const WEB_DIST = 'apps/web/dist'
const STEPS = ['db', 'api', 'web']

const DESTRUCTIVE_DDL = /\bDROP\s+(COLUMN|TABLE)\b|\bTRUNCATE\b|\bALTER\s+COLUMN\b[\s\S]{0,80}?\bTYPE\b/i

function fail(message) {
    console.error(`\n✖ deploy: ${message}\n`)
    process.exit(1)
}

function run(label, command, args, { cwd = repoRoot, env = process.env } = {}) {
    const r = spawnSync(command, args, { cwd, stdio: 'inherit', env })
    if (r.error) fail(`${label}: "${command}" nicht startbar (${r.error.message}).`)
    if (r.status !== 0) fail(`${label} beendete mit Code ${r.status}.`)
}

function capture(command, args) {
    const r = spawnSync(command, args, { cwd: repoRoot, encoding: 'utf8', stdio: 'pipe' })
    return { ok: !r.error && r.status === 0, out: (r.stdout ?? '').trim() }
}

const git = (...args) => capture('git', args)
const absPath = (relPath) => resolve(repoRoot, relPath)

async function assertProdGates({ allowDestructive, autoConfirm }) {
    console.log('→ Prod-Gates …')

    const branch = git('branch', '--show-current').out
    if (branch !== 'main' && !branch.startsWith('hotfix/')) {
        fail(`Prod deployt von "main" (oder hotfix/*), aktuell: "${branch}". Erst mergen.`)
    }
    if (git('status', '--porcelain').out !== '') {
        fail('Uncommittete Änderungen — der Tag würde hinterher auf etwas anderes zeigen als das Deployte.')
    }
    if (branch === 'main') {
        git('fetch', 'origin', 'main', '--quiet')
        const remote = git('rev-parse', 'origin/main').out
        if (remote && git('rev-parse', 'HEAD').out !== remote) {
            fail('main ist nicht in Sync mit origin/main — erst `git pull --ff-only` bzw. `git push`.')
        }
    } else {
        console.log(`  ⚠ ${branch}: Sync-Prüfung übersprungen, danach nach main cherry-picken.`)
    }
    console.log(`  ✓ ${branch}, clean`)

    console.log('  → pnpm verify …')
    run('verify', 'pnpm', ['verify'])

    assertSafeMigrations(allowDestructive)
    if (!autoConfirm) await confirmProd()
}

function assertSafeMigrations(allowDestructive) {
    const lastTag = git('tag', '--list', 'prod-*', '--sort=-creatordate').out.split('\n')[0]
    const changed = lastTag
        ? git('diff', '--name-only', '--diff-filter=A', `${lastTag}..HEAD`, '--', MIGRATIONS).out
        : git('ls-files', `${MIGRATIONS}/*.sql`).out
    const files = changed ? changed.split('\n').filter((f) => f.endsWith('.sql')) : []
    const label = lastTag ? `seit ${lastTag}` : 'insgesamt (erster Prod-Deploy)'

    if (files.length === 0) {
        console.log(`  ✓ keine neuen Migrationen ${label}`)
        return
    }
    console.log(`  ${files.length} neue Migration(en) ${label}: ${files.join(', ')}`)

    const destructive = files.filter((f) => existsSync(absPath(f)) && DESTRUCTIVE_DDL.test(readFileSync(absPath(f), 'utf8')))
    if (destructive.length === 0) return
    if (allowDestructive) {
        console.log(`  ⚠ --allow-destructive gesetzt: ${destructive.join(', ')}`)
        return
    }
    fail(
        `Destruktives DDL (DROP COLUMN/TABLE, TRUNCATE, ALTER COLUMN … TYPE) in: ${destructive.join(', ')}\n` +
            'Das löscht Daten in Produktion und ist nicht rückholbar — Restore geht nur server-weit.\n' +
            'Migration umbauen (Spalte erst ungenutzt lassen, später löschen) oder, wenn der Verlust\n' +
            'gewollt ist:  pnpm deploy:prod --allow-destructive',
    )
}

async function confirmProd() {
    if (!process.stdin.isTTY) fail('Keine interaktive Eingabe möglich. Für automatisierte Läufe: --yes.')
    const rl = createInterface({ input: process.stdin, output: process.stdout })
    const answer = await rl.question('\n  Prod-Deploy bestätigen — "prod" tippen: ')
    rl.close()
    if (answer.trim() !== 'prod') fail('Abgebrochen.')
}

function assertAzLogin() {
    if (!capture('az', ['account', 'show']).ok) {
        fail('Keine aktive Azure-Sitzung — `az login` ausführen (dieselbe Sitzung ersetzt das DB-Passwort).')
    }
}

// PGUSER wird bewusst nicht injiziert: in Azure ist das die Managed Identity, von einem
// Entwickler-Rechner aus aber dessen eigener UPN aus der Root-.env.
function deployMigrations(env) {
    if (!process.env.PGUSER) {
        fail('PGUSER fehlt — dein UPN im Mandanten (nicht die Managed Identity), gehört in die Root-.env.')
    }
    console.log(`→ Migrationen gegen ${env.name}: ${process.env.PGUSER}@${env.pg.host}/${env.pg.database} …`)
    run('db:migrate', 'pnpm', ['--filter', '@app/api', 'db:migrate'], {
        env: { ...process.env, PGHOST: env.pg.host, PGDATABASE: env.pg.database },
    })
}

function findEntries(absDir, predicate, skip, rel = '', found = []) {
    for (const entry of readdirSync(absDir, { withFileTypes: true })) {
        if (skip.includes(entry.name)) continue
        const relPath = rel ? `${rel}/${entry.name}` : entry.name
        if (predicate(entry)) found.push(relPath)
        else if (entry.isDirectory()) findEntries(resolve(absDir, entry.name), predicate, skip, relPath, found)
    }
    return found
}

function assertCleanArtifact() {
    const abs = absPath(DEPLOY_DIR)

    // node_modules/ ausgenommen — dort liegen .env-Fixtures fremder Pakete.
    const envFiles = findEntries(abs, (e) => e.isFile() && e.name.startsWith('.env'), ['node_modules'])
    if (envFiles.length > 0) {
        fail(`.env im Artefakt (${envFiles.join(', ')}) — in Azure kommt die Konfiguration aus den App Settings.`)
    }

    // `zip` löst Symlinks auf, und ein aufgelöster pnpm-Link verliert seine Geschwister-Dependencies:
    // lokal unauffällig, in Azure stirbt die API beim Start mit ERR_MODULE_NOT_FOUND. Dagegen steht
    // `--config.node-linker=hoisted` unten am pnpm-deploy; diese Prüfung hält den Zustand fest.
    const symlinks = findEntries(abs, (e) => e.isSymbolicLink(), ['.bin']) // .bin = CLI-Shims
    if (symlinks.length > 0) {
        fail(
            `${symlinks.length} Symlink(s) im Artefakt (${symlinks.slice(0, 3).join(', ')} …) — daraus wird ein\n` +
                'kaputtes ZIP. Steht `--config.node-linker=hoisted` noch am pnpm-deploy-Aufruf?',
        )
    }
}

function createZip() {
    rmSync(absPath(ZIP_FILE), { force: true }) // sonst UPDATET zip das alte Archiv
    const cwd = absPath(DEPLOY_DIR)
    const name = ZIP_FILE.split('/').pop()
    if (process.platform === 'win32') {
        const command = `Compress-Archive -Path * -DestinationPath ..\\${name} -Force`
        run('Zippen', 'powershell', ['-NoProfile', '-Command', command], { cwd })
    } else {
        run('Zippen', 'zip', ['-r', '-q', `../${name}`, '.'], { cwd })
    }
}

function deployApi(env, alreadyBuilt) {
    const resourceGroup = argValue('--resource-group') || env.azure.resourceGroup
    const appName = argValue('--app-name') || env.azure.apiAppName
    if (!resourceGroup || !appName) {
        fail(`environments.${env.name}.azure braucht resourceGroup und apiAppName — docs/azure-runbook.md.`)
    }
    // Azure benennt die Managed Identity nach der Web App, und dieser Name IST die DB-Rolle.
    if (env.pg.user && env.pg.user !== appName) {
        console.log(`⚠ pg.user "${env.pg.user}" ≠ apiAppName "${appName}" — sonst: permission denied for table.`)
    }

    if (!alreadyBuilt) run('Build', 'pnpm', ['--filter', '@app/api', 'build'])

    console.log(`→ API: Package nach ${DEPLOY_DIR}/ herausziehen (flach, ohne devDependencies) …`)
    rmSync(absPath(DEPLOY_DIR), { recursive: true, force: true }) // pnpm deploy will es leer
    run('pnpm deploy', 'pnpm', [
        '--config.node-linker=hoisted',
        '--filter', '@app/api',
        '--prod',
        '--legacy', // ohne das Flag verlangt pnpm 10 inject-workspace-packages=true
        'deploy', DEPLOY_DIR,
    ])
    for (const f of ['.env', '.env.example']) rmSync(absPath(`${DEPLOY_DIR}/${f}`), { force: true })
    assertCleanArtifact()
    createZip()

    console.log(`→ API: Upload nach ${resourceGroup}/${appName} (Neustart, wenige Sekunden) …`)
    run('az webapp deploy', 'az', ['webapp', 'deploy', '--resource-group', resourceGroup,
        '--name', appName, '--src-path', ZIP_FILE, '--type', 'zip'])
}

function deployWeb(env, alreadyBuilt) {
    const tokenName = `SWA_DEPLOYMENT_TOKEN_${env.name.toUpperCase()}`
    const token = process.env[tokenName]
    if (!token) {
        const legacy = process.env.SWA_DEPLOYMENT_TOKEN ? ' Gefunden: SWA_DEPLOYMENT_TOKEN ohne Umgebung — umbenennen.' : ''
        fail(`${tokenName} fehlt (Portal → Static Web App → Manage deployment token, dann Root-.env).${legacy}`)
    }

    if (!alreadyBuilt) run('Build', 'pnpm', ['--filter', '@app/web', 'build'])
    if (!existsSync(absPath(WEB_DIST))) fail(`Build lief durch, aber ${WEB_DIST}/ fehlt.`)

    // `--env production` ist die Umgebung INNERHALB einer Static Web App (production statt Preview) —
    // unsere dev/prod sind zwei getrennte SWAs. Der Token geht über die Env des Kindprozesses statt
    // als Argument, sonst steht das Secret in der Prozessliste.
    console.log(`→ SPA: ${WEB_DIST}/ hochladen (Token aus ${tokenName}) …`)
    run('swa deploy', 'pnpm', ['dlx', '@azure/static-web-apps-cli', 'deploy', WEB_DIST, '--env', 'production'], {
        env: { ...process.env, SWA_CLI_DEPLOYMENT_TOKEN: token },
    })
}

function tagProd() {
    const day = new Date().toISOString().slice(0, 10)
    const sameDay = git('tag', '--list', `prod-${day}*`).out
    const tag = sameDay ? `prod-${day}-${sameDay.split('\n').length + 1}` : `prod-${day}`

    if (!git('tag', tag).ok) {
        console.log(`⚠ Tag ${tag} konnte nicht gesetzt werden — bitte von Hand nachtragen.`)
        return null
    }
    if (!git('push', 'origin', tag).ok) {
        console.log(`⚠ Tag ${tag} ist lokal gesetzt, der Push nach origin schlug fehl — bitte nachholen.`)
    }
    return tag
}

function resolveSteps() {
    const steps = (argValue('--only') ?? STEPS.join(',')).split(',').map((s) => s.trim())
    const unknown = steps.filter((s) => !STEPS.includes(s))
    if (unknown.length > 0) fail(`Unbekannter --only-Wert: ${unknown.join(', ')}. Erwartet: ${STEPS.join(', ')}.`)
    return steps
}

async function main() {
    const { platform } = readProjectConfig()
    if (platform !== 'azure') {
        fail(
            `platform=${platform ?? '(fehlt)'} — dieses Script deployt nach Azure. Bei mock ist der Host\n` +
                'Cloudflare Pages (pnpm deploy:cloudflare), bei powerapps die Power Platform. docs/hosting.md.',
        )
    }

    const env = resolveEnvironment()
    const steps = resolveSteps()
    const isProd = env.name === 'prod'
    console.log(`\n▸ Deploy nach ${env.name.toUpperCase()} — Schritte: ${steps.join(', ')}\n`)

    // Die Gates lassen `pnpm verify` laufen, und das baut beide Packages — ein zweiter Build wäre
    // identisch.
    if (isProd) {
        await assertProdGates({ allowDestructive: hasFlag('--allow-destructive'), autoConfirm: hasFlag('--yes') })
    }

    if (steps.includes('db') || steps.includes('api')) assertAzLogin()
    if (steps.includes('db')) deployMigrations(env)
    if (steps.includes('api')) deployApi(env, isProd)
    if (steps.includes('web')) deployWeb(env, isProd)

    const tag = isProd ? tagProd() : null
    console.log(
        `\n✓ ${env.name.toUpperCase()} deployt${tag ? `, Tag ${tag}` : ''}.` +
            `${env.url ? ` → ${env.url}` : ''}\n  Smoke-Test: docs/azure-runbook.md, Schritt 7.`,
    )
}

try {
    await main()
} catch (error) {
    fail(error instanceof Error ? error.message : String(error))
}
