# Code Apps Constraints

> Hard Rules für Microsoft Power Platform Code Apps. Vollständige Shared-Version: `.claude/shared/docs/code-apps-constraints.md`.

## Dateien, die NICHT manuell angefasst werden

| Pfad | Begründung |
|---|---|
| `power.config.json` | Power-Platform-Metadaten, wird von `pac code *` verwaltet |
| `src/PowerProvider.tsx` | Muss `initialize()` aus `@microsoft/power-apps/app` im `useEffect` aufrufen |
| `src/generated/**` | Wird von `pac code add-data-source` regeneriert |
| `vite.config.ts` Port 3000 | Hard-Requirement vom SDK |
| `package.json > scripts.build` → `tsc -b && vite build` | Hard-Requirement vom SDK |

## Verbotene Patterns

| ❌ Nicht erlaubt | ✅ Stattdessen |
|---|---|
| `localStorage`/`sessionStorage` für User-/Org-Daten | In-Memory-State oder Dataverse-Tabelle |
| `fetch('https://external.api/...')` direkt | Connector über `pac code add-data-source` |
| Next.js / SSR / React-Server-Components | Pure React SPA |
| Service Worker | — (nicht unterstützt) |
| Env-Vars für Secrets | Connector-basierte Auth über Power-Apps-Host |
| Eigener MSAL-Flow | Auth läuft automatisch über Power-Apps-Host |

## Versionen (Hard Pin)

- Node 24 LTS
- PAC CLI ≥ 1.51.1 (Connection References)
- `@microsoft/power-apps` ≥ 1.0.4
- TypeScript aus Template nicht downgraden
