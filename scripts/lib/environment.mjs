import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

const PROJECT_JSON = '.unitix/project.json'

export function argValue(flag) {
    const prefix = `${flag}=`
    return process.argv
        .slice(2)
        .map((a) => (a.startsWith(prefix) ? a.slice(prefix.length) : null))
        .find((v) => v !== null)
}

export function hasFlag(flag) {
    return process.argv.slice(2).includes(flag)
}

export function readProjectConfig() {
    const abs = resolve(repoRoot, PROJECT_JSON)
    if (!existsSync(abs)) return {}
    try {
        return JSON.parse(readFileSync(abs, 'utf8'))
    } catch (error) {
        throw new Error(`${PROJECT_JSON} ist kein gültiges JSON: ${error.message}`)
    }
}

export function resolveEnvironment() {
    const name = argValue('--env') ?? 'dev'
    const environments = readProjectConfig().environments ?? {}
    const known = Object.keys(environments)

    if (!environments[name]) {
        throw new Error(
            `Unbekannte Umgebung "${name}".` +
                (known.length > 0
                    ? ` Erwartet: ${known.join(' | ')}.`
                    : ` Der environments-Block in ${PROJECT_JSON} ist leer.`) +
                '\nDetails: docs/environments.md.',
        )
    }

    const { url = '', azure = {}, pg = {} } = environments[name]
    return { name, url, azure, pg }
}
