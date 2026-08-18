#!/usr/bin/env node
// `pnpm deploy:cloudflare` — Direct-Upload der SPA auf Cloudflare Pages, für die drei Umgebungen
// eines Kundenprojekts:
//
//   prototype-Branch → <slug>-prototype   (eingefrorene Kunden-Referenz, immer Mock)
//   dev-Branch       → <slug>-dev          (Testumgebung)
//   main-Branch      → <slug>              (Produktion)
//
// Eines von drei Deploy-Scripts, eines je Ziel — hier Cloudflare Pages, daneben `deploy:api`
// (Node-API → Azure App Service) und `deploy:swa` (SPA → Azure Static Web Apps). Dieses Script
// kennt nur Cloudflare; welches Ziel ein Projekt hat, sagt .unitix/project.json → frontend.
//
// Die EINE Cloudflare-Deploy-Logik — lokal für den Ad-hoc-Link UND aus der CI heraus. Der
// Deploy-Job in .github/workflows/ci.yml ruft dieses Script auf statt die Logik zu duplizieren:
// sonst entstehen zwei Pages-Projekte mit zwei URLs, weil CI den Repo-Namen und das Script
// .unitix/project.json als Slug-Quelle nimmt.
//
// host-aware, damit genau dieser CI-Job unverändert in JEDEM Projekt laufen kann: `prototype`
// deployt IMMER (der abgestimmte Stand liegt per Definition auf Cloudflare), `dev`/`main` nur bei
// `frontend: cloudflare`. Liegt die SPA woanders (`swa`, `powerapps`), ist das kein Fehler, sondern
// ein anderes Ziel → dieses Script steigt sauber aus (exit 0) und der jeweilige Pfad übernimmt.
//
// Bewusst am `frontend`-Feld, nicht am `backend`: wo die SPA liegt, ist eine Host-Frage. Ein
// Azure-Backend hinter einer Cloudflare-SPA wäre eine gültige Kombination — sie deployt hier
// weiter, obwohl das Backend nicht mehr `mock` ist.
//
// Legt das Pages-Projekt bei Bedarf vorher explizit an (in CI unverzichtbar — wrangler würde sonst
// interaktiv nachfragen und der allererste Deploy failt) und printet die `*.pages.dev`-URL.
//
// SPA-only: hochgeladen wird das statische `apps/web/dist/` — fertig gebaut, dieses Script baut
// nicht selbst (der Build ist in CI ein eigener Job-Step; die beiden Azure-Scripts bauen dagegen
// selbst, weil sie von Hand laufen). SSR-Projekte laufen nicht über diesen Pfad.
//
// Voraussetzungen (fail loud): CLOUDFLARE_API_TOKEN (Scope Account > Cloudflare Pages > Edit),
// CLOUDFLARE_ACCOUNT_ID, und ein gebautes `apps/web/dist/`. Beide Env-Namen liest wrangler nativ.
//
// Umgebung: --env=prototype|dev|main  ODER  --branch=<name>  ODER  aktueller Git-Branch.
// Basis-Slug (`--project-name`): arg > .unitix/project.json (name/slug) > package.json name.
// Details: docs/hosting.md.

import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// Build-Output der SPA. Seit dem Workspace-Umbau liegt die SPA in apps/web/ — dieses Script
// bleibt an der Root, weil es projektweit ist (Slug aus .unitix/project.json, Branch-Mapping).
const WEB_DIST = 'apps/web/dist'

// Branch → { Projekt-Suffix, Cloudflare-production-branch, deployt-immer }.
// prototype liegt immer auf Cloudflare → alwaysDeploy; dev/main sind host-aware (siehe shouldDeploy).
const ENVIRONMENTS = {
  prototype: { suffix: '-prototype', productionBranch: 'prototype', alwaysDeploy: true },
  dev: { suffix: '-dev', productionBranch: 'dev', alwaysDeploy: false },
  main: { suffix: '', productionBranch: 'main', alwaysDeploy: false },
}

function fail(message) {
  console.error(`\n✖ deploy:cloudflare: ${message}\n`)
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

// Umgebung auflösen: expliziter --env / --branch schlägt den aktuellen Git-Branch.
// So deployt CI über `--branch=${{ github.ref_name }}` deterministisch, lokal reicht der Checkout.
function resolveEnv() {
  let branch = argValue('--env') || argValue('--branch')
  if (!branch) {
    const r = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' })
    branch = (r.stdout ?? '').trim()
  }
  if (!ENVIRONMENTS[branch]) {
    fail(
      `Unbekannte Deploy-Umgebung "${branch || '(leer)'}". Erwartet: prototype | dev | main ` +
        '(via --env=, --branch= oder aktuellem Git-Branch). feature/*-Branches deployen nicht.',
    )
  }
  return branch
}

// wrangler-Projektnamen sind lowercase, alphanumerisch + Bindestriche (max. 58 Zeichen)
// und dürfen weder auf `-` beginnen noch enden.
//
// Reihenfolge ist wichtig: das Trimmen der Bindestriche muss NACH dem slice(0,58) passieren —
// sonst endet ein Name, dessen 58. Zeichen ein `-` ist, auf `-` und Cloudflare lehnt ihn ab.
// Doppel-Bindestriche werden kollabiert, damit `Ein__Name` nicht zu `ein--name` wird.
export function sanitizeProjectName(raw) {
  return String(raw)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 58)
    .replace(/^-+|-+$/g, '')
}

function resolveBaseSlug() {
  // Priorität: arg > .unitix/project.json > package.json.
  const unitix = readJson('.unitix/project.json') ?? {}
  const pkg = readJson('package.json') ?? {}
  const rawName = argValue('--project-name') || unitix.name || unitix.slug || pkg.name
  if (!rawName) fail('Kein Projektname — via --project-name=, .unitix/project.json (name) oder package.json (name) setzen.')

  const base = sanitizeProjectName(rawName)
  if (!base) fail(`Projektname "${rawName}" ergibt keinen gültigen Cloudflare-Slug (a-z0-9-).`)
  return base
}

// Projektname je Umgebung: Basis-Slug + statisches Suffix. Die Basis wird VOR dem Anhängen des
// Suffix auf (58 − Suffix-Länge) gekürzt — sonst frisst die 58-Zeichen-Grenze bei langen Repo-Namen
// das Umgebungs-Suffix weg und prototype/dev/main kollabieren auf denselben Cloudflare-Slug (der
// Prototyp überschriebe still die Produktion). So bleibt das Suffix immer erhalten und die drei
// Umgebungen deployen garantiert auf drei getrennte Projekte.
// Exportiert (wie sanitizeProjectName) für den Test mit einem 60-Zeichen-Dummy-Slug.
export function envProjectName(baseSlug, suffix) {
  const base = baseSlug.slice(0, 58 - suffix.length).replace(/-+$/g, '')
  return `${base}${suffix}`
}

function projectNameFor(env) {
  return envProjectName(resolveBaseSlug(), ENVIRONMENTS[env].suffix)
}

// Wo dev/main gehostet werden, entscheidet das `frontend`-Feld. Alles außer `cloudflare` hat
// einen eigenen Deploy-Pfad und wird hier übersprungen, statt zu failen.
const OTHER_HOSTS = {
  swa: 'Azure Static Web Apps (`pnpm deploy:swa`, siehe docs/azure-setup.md)',
  powerapps: 'Power Platform (pac code push)',
}

function shouldDeploy(env) {
  if (ENVIRONMENTS[env].alwaysDeploy) return true
  const frontend = (readJson('.unitix/project.json') ?? {}).frontend ?? 'cloudflare'
  const otherHost = OTHER_HOSTS[frontend]
  if (otherHost) {
    console.log(`→ frontend=${frontend} → ${env} deployt über ${otherHost}. Cloudflare übersprungen.`)
    return false
  }
  return true
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

// wrangler liest CLOUDFLARE_API_TOKEN/CLOUDFLARE_ACCOUNT_ID selbst aus der Env — process.env
// wird unverändert durchgereicht, kein Umbiegen nötig.
// `pnpm dlx` statt `npx`: pnpm ist der Standard, npx bräuchte das npm-Binary zur Laufzeit.
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
  const env = resolveEnv()

  // host-aware ZUERST — ein swa-/dataverse-dev/main-Push soll exit 0 liefern, nicht am fehlenden
  // Token sterben. Deshalb der Skip-Check vor assertPrerequisites().
  if (!shouldDeploy(env)) process.exit(0)

  assertPrerequisites()
  const projectName = projectNameFor(env)
  const { productionBranch } = ENVIRONMENTS[env]

  // --- Pages-Projekt sicherstellen ---
  // wrangler legt ein fehlendes Projekt beim deploy nur INTERAKTIV an — in CI failt damit der
  // allererste Deploy, solange niemand es vorher im Dashboard geklickt hat .
  // Deshalb explizit anlegen und ein bereits existierendes Projekt tolerieren.
  console.log(`→ Umgebung ${env} → Stelle Cloudflare-Pages-Projekt sicher: ${projectName} …`)
  const create = wrangler(['pages', 'project', 'create', projectName, `--production-branch=${productionBranch}`], {
    allowFailure: true,
  })
  if (create.status !== 0) {
    const out = `${create.stdout ?? ''}${create.stderr ?? ''}`
    // Existiert schon = Erfolgsfall (idempotent). Alles andere ist ein echter Fehler.
    if (/already exists|bereits/i.test(out)) {
      console.log('  Projekt existiert bereits — weiter.')
    } else {
      process.stderr.write(out)
      fail(`Pages-Projekt "${projectName}" konnte nicht angelegt werden (Code ${create.status}).`)
    }
  }

  // --- Deploy (Direct Upload) ---
  console.log(`→ Deploy ${WEB_DIST}/ nach Cloudflare Pages (Projekt: ${projectName}) …`)
  const result = wrangler(['pages', 'deploy', WEB_DIST, `--project-name=${projectName}`])
  if (result.status !== 0) fail(`wrangler beendete mit Code ${result.status}.`)

  console.log(`\n✓ Deploy fertig. Die *.pages.dev-URL steht oben in der wrangler-Ausgabe (Projekt: ${projectName}).`)
}

// Nur ausführen, wenn direkt gestartet — nicht beim Import. Macht sanitizeProjectName()
// testbar, ohne dass der Import einen Deploy auslöst oder am fehlenden Token stirbt.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main()
}
