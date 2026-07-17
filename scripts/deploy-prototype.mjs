#!/usr/bin/env node
// Cloudflare Pages Direct-Upload-Deploy für den Mock-Prototyp.
//
// Die EINE Deploy-Logik — lokal für den Ad-hoc-„Link am Morgen" UND aus der CI heraus.
// Der Deploy-Job in .github/workflows/ci.yml ruft genau dieses Script auf, statt die Logik zu
// duplizieren (Review Jakob 2026-07-17): sonst entstehen je nach Weg zwei Pages-Projekte mit zwei
// URLs, weil CI den Repo-Namen und das Script .unitix/project.json als Slug-Quelle nimmt.
// localhost-first bleibt der Default für Entwicklung/Review.
//
// Lädt den fertigen `dist/`-Build via `wrangler pages deploy` als Direct Upload hoch, legt das
// Pages-Projekt bei Bedarf vorher explizit an (in CI unverzichtbar — wrangler würde sonst
// interaktiv nachfragen und der allererste Deploy failt) und printet die `*.pages.dev`-URL.
//
// SPA-only: hochgeladen wird ein statisches `dist/`. Das Golden Template IST per Design eine SPA
// (HashRouter-Pin, Pflicht für den späteren Dataverse-iframe). SSR-Projekte (TanStack) laufen
// nicht über diesen Pfad — siehe docs/hosting.md.
//
// Voraussetzungen (fail loud, siehe unten):
//   CLOUDFLARE_API_TOKEN  — Account > Cloudflare Pages > Edit (wer provisioniert: Olli)
//   CLOUDFLARE_ACCOUNT_ID — Account-ID (Cloudflare-Dashboard, rechte Sidebar)
//   dist/                 — vorher `pnpm build`
// Beide Namen liest wrangler nativ — deshalb genau diese Schreibweise (kein CF_-Kurzname mehr,
// vereinheitlicht 2026-07-17: Hosting-Stack-Review + Jakobs Kommentar zu docs/hosting.md).
//
// Projektname (wrangler `--project-name`): Priorität arg > .unitix/project.json (name/slug) > package.json name.
// Details: docs/hosting.md.

import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function fail(message) {
  console.error(`\n✖ deploy-prototype: ${message}\n`)
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

// wrangler-Projektnamen sind lowercase, alphanumerisch + Bindestriche (max. 58 Zeichen)
// und dürfen weder auf `-` beginnen noch enden.
//
// Reihenfolge ist wichtig: das Trimmen der Bindestriche muss NACH dem slice(0,58) passieren.
// Vorher wurde erst getrimmt und dann geschnitten — ein Name, dessen 58. Zeichen ein `-` war,
// endete damit auf `-` und Cloudflare lehnte ihn ab (Review Jakob 2026-07-17, A4).
// Doppel-Bindestriche werden zusätzlich kollabiert, damit `Ein__Name` nicht zu `ein--name` wird.
export function sanitizeProjectName(raw) {
  return String(raw)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 58)
    .replace(/^-+|-+$/g, '')
}

function resolveProjectName() {
  // Priorität: arg > .unitix/project.json > package.json.
  const argName = process.argv
    .slice(2)
    .map((a) => (a.startsWith('--project-name=') ? a.slice('--project-name='.length) : a))
    .find((a) => a && !a.startsWith('-'))

  const unitix = readJson('.unitix/project.json') ?? {}
  const pkg = readJson('package.json') ?? {}
  const rawName = argName || unitix.name || unitix.slug || pkg.name
  if (!rawName) fail('Kein Projektname — via Argument, .unitix/project.json (name) oder package.json (name) setzen.')

  const projectName = sanitizeProjectName(rawName)
  if (!projectName) fail(`Projektname "${rawName}" ergibt keinen gültigen Cloudflare-Slug (a-z0-9-).`)
  return projectName
}

function assertPrerequisites() {
  if (!process.env.CLOUDFLARE_API_TOKEN || !process.env.CLOUDFLARE_ACCOUNT_ID) {
    fail(
      'Cloudflare-Zugang fehlt. Bitte setzen:\n' +
        '  CLOUDFLARE_API_TOKEN  (Account > Cloudflare Pages > Edit)\n' +
        '  CLOUDFLARE_ACCOUNT_ID (Cloudflare-Dashboard, rechte Sidebar)\n' +
        'Wer provisioniert: Olli. Ohne Token bleibt der Prototyp localhost-first (pnpm dev) + PDF-Report.\n' +
        'Details: docs/hosting.md.',
    )
  }
  if (!existsSync(resolve(repoRoot, 'dist'))) fail('Kein dist/ gefunden — zuerst `pnpm build` ausführen.')
}

// wrangler liest CLOUDFLARE_API_TOKEN/CLOUDFLARE_ACCOUNT_ID selbst aus der Env — process.env
// wird unverändert durchgereicht, kein Umbiegen nötig.
// `pnpm dlx` statt `npx`: PNPM ist der Standard (Nerd-Session + Hosting-Stack-Review 2026-07-17),
// npx war die letzte Stelle, an der das npm-Binary zur Laufzeit nötig war.
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
  const projectName = resolveProjectName()
  assertPrerequisites()

  // --- Pages-Projekt sicherstellen ---
  // wrangler legt ein fehlendes Projekt beim deploy nur INTERAKTIV an — in CI failt damit der
  // allererste Deploy, solange niemand es vorher im Dashboard geklickt hat (Review Jakob, A3).
  // Deshalb explizit anlegen und ein bereits existierendes Projekt tolerieren.
  console.log(`→ Stelle Cloudflare-Pages-Projekt sicher: ${projectName} …`)
  const create = wrangler(['pages', 'project', 'create', projectName, '--production-branch=prototype'], {
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
  console.log(`→ Deploy dist/ nach Cloudflare Pages (Projekt: ${projectName}) …`)
  const result = wrangler(['pages', 'deploy', 'dist', `--project-name=${projectName}`])
  if (result.status !== 0) fail(`wrangler beendete mit Code ${result.status}.`)

  console.log(`\n✓ Deploy fertig. Die *.pages.dev-URL steht oben in der wrangler-Ausgabe (Projekt: ${projectName}).`)
}

// Nur ausführen, wenn direkt gestartet — nicht beim Import. Macht sanitizeProjectName()
// testbar, ohne dass der Import einen Deploy auslöst oder am fehlenden Token stirbt.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main()
}
