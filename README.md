# Code Apps Projekt-Template

Ausgangsbasis für UNIT-IX Power Platform Code Apps (React + Vite + TypeScript SPA).  
Lovable liefert das UI-Grundgerüst, dieses Template steuert Struktur, Toolchain und Claude-Konfiguration bei.

---

## Neues Projekt starten

```bash
# 1. Repository aus diesem Template anlegen (GitHub → "Use this template")
git clone git@github.com:unit-ix/<projekt-name>.git
cd <projekt-name>

# 2. Submodul initialisieren
git submodule update --init --recursive

# 3. Node-Version setzen
nvm use   # liest .nvmrc → Node 24

# 4. README anpassen — Projektname, Kontext, Lovable-Link
```

---

## Nach dem Lovable-Import

```bash
# 1. Lovable-Code in dieses Repo kopieren
#    Konflikte: Template gewinnt bei .vscode/, .prettierrc, .editorconfig,
#               .gitignore, .claude/, eslint.config.js, .github/workflows/ci.yml

# 2. Lovable-Artefakte und Tests entfernen
rm -f vitest.config.ts vitest.config.js src/setupTests.ts
rm -f src/**/*.test.tsx src/**/*.test.ts src/**/*.spec.tsx src/**/*.spec.ts
rm -f package-lock.json yarn.lock

# 3. Dependencies installieren
pnpm install

# 4. Code normalisieren (einmalig)
pnpm lint --fix && pnpm format

# 5. verify-Script in package.json ergänzen
#    "scripts": { "verify": "pnpm lint && pnpm tsc --noEmit && pnpm build" }

# 6. Build prüfen — muss grün sein
pnpm verify

# 7. Commit
git add -A && git commit -m "chore: import lovable scaffold + apply UNIT IX code standards"
```

---

## Repo-Struktur

```
.claude/              Geteiltes UNIT-IX Claude-Submodul (CLAUDE.md, docs/, settings.json)
.github/workflows/    CI — lint + typecheck + build
docs/                 Projekt-Doku (PRD, Datenmodell, Architektur)
eslint.config.js      Base ESLint-Config mit Code-Apps-Hard-Rules
```

Alle Pre-Dev-Artefakte (Angebot, Meetings, Kundendokumente) bleiben in OneDrive.  
Claude-Konfiguration: [`.claude/CLAUDE.md`](.claude/CLAUDE.md)

---

## Shared-Ressourcen aktualisieren

```bash
git submodule update --remote .claude/shared
git add .claude/shared && git commit -m "chore: update shared claude resources"
```

---

## Übergabe PM → Dev

1. PRD ist in OneDrive finalisiert
2. Dev klont das Repo und legt `docs/prd.md` an (Kopie aus OneDrive)
3. Dev befüllt `docs/datamodel.mmd` und `docs/architecture.md` vor Dev-Start
4. Ab hier liegt die Verantwortung für `docs/` beim Dev-Team — kein automatischer Sync mit OneDrive

**Was wohin gehört:**

| Artefakt                                | Ort             |
| --------------------------------------- | --------------- |
| PRD, Angebot, Meetings, Kundendokumente | OneDrive only   |
| Datenmodell, Architektur                | `docs/` im Repo |
| Code, Konfiguration                     | Repo            |

---

## Dev-Loop

1. Feature-Branch anlegen
2. Änderungen manuell mit Claude als Hilfe umsetzen — **ein Schritt, dann Review, dann nächster Schritt** - Jeder Schritt sollte in mehrerensinnvolle Commits aufgeteilt werden
3. `pnpm verify` grün kriegen (lint + typecheck + build)
4. Pushen, PR öffnen, Mensch reviewt, Merge

**Regel:** Ein Feature = ein PR mit mehreren Commits. Kein Merge ohne grünes `pnpm verify` und Review.

---

## Entwicklungsprinzipien

**Ein Schritt → Prüfung → nächster Schritt.** Keine autonomen KI-Ketten. Claude ist Helfer, kein Autopilot.

**Build bleibt immer grün.** `pnpm verify` (lint + typecheck + build) nach jeder Änderung — das spiegelt CI 1:1.

**Lovable nur für initialen UI-Entwurf, manuelles Entwickeln und Claude für Migration und Business-Logik.** Lovable bleibt für initiales Scaffolding zuständig. Nicht für Tests oder Deployment-Logik.

**Keine Tests standardmäßig.** Tests werden eingeführt, wenn konkreter Bedarf entsteht — nicht vorsorglich. Lovable-Testdateien beim Import aktiv entfernen.

**Hard Rules sind nicht verhandelbar.** `power.config.json` und `src/generated/` werden nie manuell bearbeitet. Kein `localStorage`, kein direktes `fetch()` zu externen APIs, kein SSR. Details: [`.claude/docs/code-app-patterns.md`](.claude/docs/code-app-patterns.md) (Sektion "Hard Rules / Constraints")

---

## Lokale Entwicklung

Zwei Prozesse gleichzeitig in separaten Shells:

```bash
# Shell 1 — Vite Dev-Server
pnpm dev

# Shell 2 — PAC Connections-Server (zeigt Connector-Daten lokal)
pac code run --appUrl http://localhost:3000
```

```bash
pnpm verify   # lint + typecheck + build (spiegelt CI)
```

---

## Deployment

```bash
pac code push
```
