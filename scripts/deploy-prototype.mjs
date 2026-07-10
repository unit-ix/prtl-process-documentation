#!/usr/bin/env node
// Cloudflare Pages Direct-Upload-Deploy für den Mock-Prototyp.
//
// Der EINE scriptbare „Link am Morgen"-Pfad (localhost-first bleibt der Default für Entwicklung/Review).
// Lädt den fertigen `dist/`-Build via `wrangler pages deploy` als Direct Upload zu Cloudflare Pages hoch,
// erzeugt das Projekt beim ersten Lauf automatisch und printet die `*.pages.dev`-URL.
//
// Voraussetzungen (fail loud, siehe unten):
//   CF_API_TOKEN         — Account > Cloudflare Pages > Edit (wer provisioniert: Olli)
//   CLOUDFLARE_ACCOUNT_ID — Account-ID (Cloudflare-Dashboard, rechte Sidebar)
//   dist/                — vorher `pnpm build`
//
// Projektname (wrangler `--project-name`): Priorität arg > .unitix/project.json (name/slug) > package.json name.
// Details + der manuelle git-connect-Alternativpfad: docs/hosting.md.

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

// wrangler-Projektnamen sind lowercase, alphanumerisch + Bindestriche (max. 58 Zeichen).
function toProjectSlug(raw) {
  return String(raw)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 58)
}

// --- Projektname bestimmen (arg > .unitix > package.json) ---
const argName = process.argv
  .slice(2)
  .map((a) => (a.startsWith('--project-name=') ? a.slice('--project-name='.length) : a))
  .find((a) => a && !a.startsWith('-'))

const unitix = readJson('.unitix/project.json') ?? {}
const pkg = readJson('package.json') ?? {}
const rawName = argName || unitix.name || unitix.slug || pkg.name
if (!rawName) fail('Kein Projektname — via Argument, .unitix/project.json (name) oder package.json (name) setzen.')

const projectName = toProjectSlug(rawName)
if (!projectName) fail(`Projektname "${rawName}" ergibt keinen gültigen Cloudflare-Slug (a-z0-9-).`)

// --- Voraussetzungen prüfen (fail loud) ---
const token = process.env.CF_API_TOKEN
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
if (!token || !accountId) {
  fail(
    'Cloudflare-Zugang fehlt. Bitte setzen:\n' +
      '  CF_API_TOKEN          (Account > Cloudflare Pages > Edit)\n' +
      '  CLOUDFLARE_ACCOUNT_ID (Cloudflare-Dashboard, rechte Sidebar)\n' +
      'Wer provisioniert: Olli. Ohne Token bleibt der Prototyp localhost-first (pnpm dev) + PDF-Report.\n' +
      'Details + manueller git-connect-Alternativpfad: docs/hosting.md.',
  )
}

const distDir = resolve(repoRoot, 'dist')
if (!existsSync(distDir)) fail('Kein dist/ gefunden — zuerst `pnpm build` ausführen.')

// --- Deploy (Direct Upload) ---
console.log(`→ Deploy dist/ nach Cloudflare Pages (Projekt: ${projectName}) …`)
const result = spawnSync(
  'npx',
  ['--yes', 'wrangler@latest', 'pages', 'deploy', 'dist', `--project-name=${projectName}`],
  {
    cwd: repoRoot,
    stdio: 'inherit',
    env: { ...process.env, CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: accountId },
  },
)

if (result.error) fail(`wrangler konnte nicht gestartet werden: ${result.error.message}`)
if (result.status !== 0) fail(`wrangler beendete mit Code ${result.status}.`)

console.log(`\n✓ Deploy fertig. Die *.pages.dev-URL steht oben in der wrangler-Ausgabe (Projekt: ${projectName}).`)
