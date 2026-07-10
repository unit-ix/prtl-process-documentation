# Hosting — Prototyp teilen (Cloudflare Pages)

> **localhost-first bleibt der Default.** Entwickelt und reviewt wird am laufenden `pnpm dev` im Browser
> gegen den Mock-Adapter. Ein öffentlicher Link ist nur nötig, um den Prototyp mit dem Kunden zu teilen.
> Bis ein Cloudflare-Zugang existiert, ist das Morgen-Ergebnis der lokale Prototyp + der PDF-Report;
> der Link wird eingesteckt, sobald der Token da ist.

Es gibt **zwei** Wege, den Prototyp auf Cloudflare Pages zu bekommen. Sie schließen sich nicht aus.

## 1. Manueller git-connect (push-to-deploy) — Dashboard-only

Der komfortable Dauerbetrieb: Cloudflare baut bei jedem Push automatisch neu.

- **Nicht scriptbar.** Der git-connect verlangt eine **einmalige GitHub-App-Autorisierung pro Cloudflare-Account**, die nur im Dashboard klickbar ist (Cloudflare Pages → *Create application* → *Connect to Git*).
- Danach wählt man Repo + Branch (z. B. `prototype`), Build-Command `pnpm build`, Output-Dir `dist`.
- **Einmal pro App**, danach push-to-deploy. Ein Loom von Jakob dokumentiert die Klickstrecke.
- Wer den Account/die Org provisioniert: **Olli**.

## 2. Scripted Direct-Upload — `scripts/deploy-prototype.mjs`

Der scriptbare Interims-Pfad — kein Dashboard-Klick, lädt den fertigen Build direkt hoch:

```bash
pnpm build           # erzeugt dist/
pnpm deploy:prototype # = node scripts/deploy-prototype.mjs
```

- Ruft `npx wrangler pages deploy dist --project-name=<slug>` auf (Direct Upload).
- **Erstellt das Projekt beim ersten Lauf automatisch** und printet die `*.pages.dev`-URL.
- **Projektname** (`--project-name`): Priorität `Argument` > `.unitix/project.json` (`name`/`slug`) > `package.json` (`name`), auf einen gültigen Cloudflare-Slug normalisiert (`a-z0-9-`).
- **Fail loud:** fehlt `CF_API_TOKEN` oder `CLOUDFLARE_ACCOUNT_ID` oder `dist/`, bricht das Script mit klarer Meldung ab.

### Benötigte Secrets

| Variable | Quelle | Scope |
| --- | --- | --- |
| `CF_API_TOKEN` | Cloudflare-Dashboard → *My Profile* → *API Tokens* | **Account > Cloudflare Pages > Edit** (minimal) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare-Dashboard, rechte Sidebar | — |

Wer provisioniert: **Olli**. Lokal als Umgebungsvariablen setzen (nicht committen), in CI als **Repository Secrets**.

### CI (optional, off by default)

[`.github/workflows/deploy-prototype.yml`](../.github/workflows/deploy-prototype.yml) spiegelt denselben Direct-Upload
über `cloudflare/wrangler-action` bei Push auf `prototype`. Er ist **gegated + standardmäßig aus**:

- läuft nur, wenn die **Repo-Variable** `CF_DEPLOY_ENABLED == 'true'` gesetzt ist (Settings → *Secrets and variables* → *Actions* → *Variables*), **und**
- die Secrets `CF_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` existieren.

Bis dahin ist der Workflow dokumentiert, aber **inert**.

## Pricing (korrigiert)

- **Cloudflare Pages (classic):** großzügiges Free-Tier — **~500 Builds/Monat**, **20-Minuten**-Build-Timeout, unbegrenzte statische Requests/Bandwidth.
- Die oft zitierten **„3000 Build-Minuten"** gehören zu **Workers Builds**, nicht zu classic Pages — nicht verwechseln.
- Direct Upload (Weg 2) verbraucht **keine** Build-Minuten, weil der Build lokal/in-CI passiert und nur `dist/` hochgeladen wird.

## Was gehört wohin

- **Entwicklung/Review:** `pnpm dev` (localhost), nie über einen Deploy.
- **Kunden-Link jetzt:** Weg 2 (Direct Upload), sobald der Token da ist.
- **Kunden-Link im Dauerbetrieb:** Weg 1 (git-connect), einmalig eingerichtet.
- **Power-Platform-Toolchain** (`npx power-apps …`) ist erst am `dataverse`-Fork relevant — für den Mock-Prototyp nie.
