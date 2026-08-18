#!/usr/bin/env node
// Deploy der SPA auf Azure Static Web Apps — EIN Befehl für die zwei Schritte aus
// docs/azure-setup.md (Schritt 6): apps/web bauen, dann `swa deploy` per Deployment-Token.
//
// Für SWA gibt es keinen Portal-Upload und kein Kudu: die CLI ist außerhalb einer Pipeline der
// einzige Weg. `--env production` benennt die Ziel-UMGEBUNG der Static Web App (production statt
// eines Preview-Environments) und hat nichts mit dem `--prod` aus deploy:api zu tun — das dort
// steuert, welche Dependencies ins ZIP wandern.
//
// Wie deploy:api und anders als scripts/deploy-cloudflare.mjs (CI-getrieben) BAUT dieses Script
// selbst — ein altes apps/web/dist/ würde still veralteten Code deployen.
//
// Der Token ist ein echtes Secret und kommt deshalb NUR aus der Umgebung, nie aus project.json —
// per export oder aus der gitignoreten Root-.env, die das npm-Script über
// `node --env-file-if-exists=.env` lädt (Vorlage: .env.example):
//
//   export SWA_DEPLOYMENT_TOKEN='<Overview → Manage deployment token>'
//   pnpm deploy:swa
//
// Die Root-.env erreicht das Bundle nicht: vite lädt .env relativ zu apps/web/, und selbst dort
// landen nur VITE_-Variablen im Client-Code.
//
// Weitergegeben wird er als SWA_CLI_DEPLOYMENT_TOKEN in der Env des Kindprozesses statt als
// --deployment-token-Argument: sonst steht das Secret in der Prozessliste.
//
// Details: docs/azure-setup.md.

import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const WEB_DIST = 'apps/web/dist'

function fail(message) {
  console.error(`\n✖ deploy:swa: ${message}\n`)
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

function run(label, command, args, { env = process.env } = {}) {
  const r = spawnSync(command, args, { cwd: repoRoot, stdio: 'inherit', env })
  if (r.error) fail(`${label}: "${command}" konnte nicht gestartet werden (${r.error.message}).`)
  if (r.status !== 0) fail(`${label} beendete mit Code ${r.status}.`)
}

// Beide Namen werden akzeptiert: SWA_DEPLOYMENT_TOKEN steht so in docs/azure-setup.md,
// SWA_CLI_DEPLOYMENT_TOKEN liest die CLI nativ — wer den schon gesetzt hat, muss nichts umbenennen.
function resolveToken() {
  const token = process.env.SWA_DEPLOYMENT_TOKEN || process.env.SWA_CLI_DEPLOYMENT_TOKEN
  if (!token) {
    fail(
      'Deployment-Token fehlt. Im Portal holen (Static Web App → Overview → Manage deployment token)\n' +
        "und setzen:  export SWA_DEPLOYMENT_TOKEN='<token>'  — oder SWA_DEPLOYMENT_TOKEN=<token> in die Root-.env\n" +
        'Nicht wörtlich in den Befehl schreiben — das landet in der Shell-History.',
    )
  }
  return token
}

function main() {
  const token = resolveToken()

  const frontend = (readJson('.unitix/project.json') ?? {}).frontend
  if (frontend !== 'swa') {
    console.log(`⚠ .unitix/project.json → frontend=${frontend ?? '(fehlt)'} — die SPA deployt trotzdem nach SWA.`)
  }

  console.log('→ 1/2 apps/web bauen …')
  run('Build', 'pnpm', ['--filter', '@app/web', 'build'])
  if (!existsSync(resolve(repoRoot, WEB_DIST))) fail(`Build lief durch, aber ${WEB_DIST}/ fehlt.`)

  console.log(`→ 2/2 ${WEB_DIST}/ nach Static Web Apps hochladen (Umgebung production) …`)
  run('swa deploy', 'pnpm', ['dlx', '@azure/static-web-apps-cli', 'deploy', WEB_DIST, '--env', 'production'], {
    env: { ...process.env, SWA_CLI_DEPLOYMENT_TOKEN: token },
  })

  console.log('\n✓ SPA deployt. Die Umgebungs-URL steht oben in der swa-Ausgabe.')
}

main()
