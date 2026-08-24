#!/usr/bin/env node
// `pnpm deploy:cloudflare` — Direct-Upload der SPA auf Cloudflare Pages: der Host des Mock-Prototyps,
// ein Ziel, `main` → `<slug>`. Bei `platform: azure`/`powerapps` steigt das Script sauber aus (exit 0),
// damit derselbe CI-Job in jedem Projekt läuft.
//
// Dieselbe Logik lokal UND aus der CI — der Deploy-Job ruft dieses Script auf statt sie zu
// duplizieren, sonst nimmt CI den Repo-Namen als Slug und es entstehen zwei Pages-Projekte.
//
// Voraussetzungen (fail loud): CLOUDFLARE_API_TOKEN (Scope Account > Cloudflare Pages > Edit),
// CLOUDFLARE_ACCOUNT_ID, ein gebautes `apps/web/dist/`. Beide Env-Namen liest wrangler nativ.
//
// Details: docs/hosting.md. Warum es nur eine Umgebung gibt: docs/environments.md.

import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { argValue, hasFlag, readProjectConfig, repoRoot } from './lib/environment.mjs'

const WEB_DIST = 'apps/web/dist'

// Cloudflare braucht den Branch beim Anlegen, damit ein Direct-Upload als Produktions-Deployment
// zählt und nicht als Preview.
const PRODUCTION_BRANCH = 'main'

function fail(message) {
  console.error(`\n✖ deploy:cloudflare: ${message}\n`)
  process.exit(1)
}

// wrangler-Projektnamen: lowercase, a-z0-9-, max. 58 Zeichen, kein führender/abschließender
// Bindestrich. Das Trimmen muss NACH dem slice passieren, sonst endet ein auf 58 gekürzter Name
// womöglich auf `-` und Cloudflare lehnt ihn ab.
function sanitizeProjectName(raw) {
  return String(raw)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 58)
    .replace(/^-+|-+$/g, '')
}

function resolveProjectName() {
  // Priorität: arg > .unitix/project.json > package.json.
  const unitix = readProjectConfig()
  const pkg = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8'))
  const rawName = argValue('--project-name') || unitix.name || unitix.slug || pkg.name
  if (!rawName) fail('Kein Projektname — via --project-name=, .unitix/project.json (name) oder package.json (name) setzen.')

  const name = sanitizeProjectName(rawName)
  if (!name) fail(`Projektname "${rawName}" ergibt keinen gültigen Cloudflare-Slug (a-z0-9-).`)
  return name
}

const OTHER_HOSTS = {
  azure: 'Azure Static Web Apps (`pnpm deploy:dev` / `pnpm deploy:prod`, siehe docs/environments.md)',
  powerapps: 'Power Platform (pac code push)',
}

function shouldDeploy() {
  const platform = readProjectConfig().platform ?? 'mock'
  const otherHost = OTHER_HOSTS[platform]
  if (otherHost) {
    console.log(`→ platform=${platform} → die SPA deployt über ${otherHost}. Cloudflare übersprungen.`)
    return false
  }
  return true
}

// Der Link ist der Stand, den der Kunde sieht — ein Feature-Branch würde ihn still überschreiben.
function assertBranch() {
  if (hasFlag('--force')) return
  const r = spawnSync('git', ['branch', '--show-current'], { cwd: repoRoot, encoding: 'utf8' })
  const branch = (r.stdout ?? '').trim()
  if (branch && branch !== PRODUCTION_BRANCH) {
    fail(
      `Aktueller Branch ist "${branch}", nicht "${PRODUCTION_BRANCH}".\n` +
        'Dieser Deploy überschreibt den Link, den der Kunde sieht. Erst mergen — oder, wenn ein\n' +
        'Zwischenstand wirklich raus soll:  pnpm deploy:cloudflare --force',
    )
  }
}

function assertPrerequisites() {
  if (!process.env.CLOUDFLARE_API_TOKEN || !process.env.CLOUDFLARE_ACCOUNT_ID) {
    fail(
      'Cloudflare-Zugang fehlt. Bitte setzen:\n' +
        '  CLOUDFLARE_API_TOKEN  (Account > Cloudflare Pages > Edit)\n' +
        '  CLOUDFLARE_ACCOUNT_ID (Cloudflare-Dashboard, rechte Sidebar)\n' +
        'Ohne Token bleibt der Prototyp localhost-first (pnpm dev). Details: docs/hosting.md.',
    )
  }
  if (!existsSync(resolve(repoRoot, WEB_DIST))) fail(`Kein ${WEB_DIST}/ gefunden — zuerst \`pnpm build\` ausführen.`)
}

// wrangler liest CLOUDFLARE_API_TOKEN/CLOUDFLARE_ACCOUNT_ID selbst aus der Env.
function wrangler(args, { allowFailure = false } = {}) {
  const r = spawnSync('pnpm', ['dlx', 'wrangler@latest', ...args], {
    cwd: repoRoot,
    stdio: allowFailure ? 'pipe' : 'inherit',
    encoding: 'utf8',
    env: process.env,
  })
  if (r.error) fail(`wrangler konnte nicht gestartet werden: ${r.error.message}`)
  return r
}

function main() {
  // Vor assertPrerequisites: ein azure-/powerapps-Push soll exit 0 liefern, nicht am fehlenden
  // Token sterben.
  if (!shouldDeploy()) process.exit(0)

  assertBranch()
  assertPrerequisites()
  const projectName = resolveProjectName()

  // wrangler legt ein fehlendes Projekt beim deploy nur INTERAKTIV an — in CI failt damit der
  // allererste Deploy. Deshalb explizit anlegen und ein existierendes tolerieren.
  console.log(`→ Stelle Cloudflare-Pages-Projekt sicher: ${projectName} …`)
  const create = wrangler(['pages', 'project', 'create', projectName, `--production-branch=${PRODUCTION_BRANCH}`], {
    allowFailure: true,
  })
  if (create.status !== 0) {
    const out = `${create.stdout ?? ''}${create.stderr ?? ''}`
    if (/already exists|bereits/i.test(out)) {
      console.log('  Projekt existiert bereits — weiter.')
    } else {
      process.stderr.write(out)
      fail(`Pages-Projekt "${projectName}" konnte nicht angelegt werden (Code ${create.status}).`)
    }
  }

  console.log(`→ Deploy ${WEB_DIST}/ nach Cloudflare Pages (Projekt: ${projectName}) …`)
  const result = wrangler(['pages', 'deploy', WEB_DIST, `--project-name=${projectName}`])
  if (result.status !== 0) fail(`wrangler beendete mit Code ${result.status}.`)

  console.log(`\n✓ Deploy fertig. Die *.pages.dev-URL steht oben in der wrangler-Ausgabe (Projekt: ${projectName}).`)
}

// Nur ausführen, wenn direkt gestartet — ein Import soll keinen Deploy auslösen.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main()
}
