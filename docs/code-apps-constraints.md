# Code Apps Constraints

> Hard Rules für Microsoft Power Platform Code Apps. Vollständige Shared-Version: `.claude/shared/docs/code-apps-constraints.md`.

## Dateien, die NICHT manuell angefasst werden

| Pfad                                                    | Begründung                                                |
| ------------------------------------------------------- | --------------------------------------------------------- |
| `power.config.json`                                     | Power-Platform-Metadaten, wird von `pac code *` verwaltet |
| `src/generated/**`                                      | Wird von `pac code add-data-source` regeneriert           |
| `vite.config.ts` Port 3000                              | Hard-Requirement vom SDK                                  |
| `package.json > scripts.build` → `tsc -b && vite build` | Hard-Requirement vom SDK                                  |

## Verbotene Patterns

| ❌ Nicht erlaubt                                              | ✅ Stattdessen                               |
| ------------------------------------------------------------- | -------------------------------------------- |
| `localStorage`/`sessionStorage` für User-/Org-Daten           | In-Memory-State oder Dataverse-Tabelle       |
| `fetch()` zu authentifizierten / DLP-relevanten externen APIs | Connector über `pac code add-data-source`    |
| API-Keys oder Secrets in Code / Env-Vars                      | Connector-basierte Auth über Power-Apps-Host |
| Next.js / SSR / React-Server-Components                       | Pure React SPA                               |
| Service Worker                                                | — (nicht unterstützt)                        |
| Eigener MSAL-Flow                                             | Auth läuft automatisch über Power-Apps-Host  |

> **Öffentliche, unauthentifizierte APIs** können per direktem `fetch()` angesprochen werden — erfordern aber admin-seitige CSP-Konfiguration (`connect-src`) im Power Platform Admin Center. `connect-src` ist per Default `'none'`.

## Versionen (Hard Pin)

- Node 24 LTS
- PAC CLI ≥ 2.6 (Connection References)
- `@microsoft/power-apps` ≥ 1.1.1
- TypeScript aus Template nicht downgraden
