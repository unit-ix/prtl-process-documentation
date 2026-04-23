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

# 2. Lovable-Artefakte entfernen
rm -f vitest.config.ts vitest.config.js src/setupTests.ts
rm -f package-lock.json yarn.lock

# 3. Dependencies installieren
pnpm install

# 4. Code normalisieren (einmalig)
pnpm lint --fix && pnpm format

# 5. Build prüfen — muss grün sein
pnpm build

# 6. Commit
git add -A && git commit -m "chore: import lovable scaffold + apply UNIT IX code standards"
```

---

## Repo-Struktur

```
.claude/              Claude-Workspace (CLAUDE.md, settings.json, Agents/Commands/Skills)
  shared/             Gemeinsame Claude-Ressourcen (Git-Submodul)
.github/workflows/    CI — lint + typecheck + build
docs/                 Projekt-Coding-Docs (PRD, Datenmodell, Architektur, Constraints)
eslint.config.js      Base ESLint-Config mit Code-Apps-Hard-Rules
```

Alle Pre-Dev-Artefakte (Angebot, Meetings, Kundendokumente) bleiben in OneDrive.  
Claude-Konfiguration: [`.claude/CLAUDE.md`](.claude/CLAUDE.md)

---

## Lokale Entwicklung

```bash
pnpm dev          # Dev-Server auf Port 3000
pnpm verify       # lint + typecheck + build (spiegelt CI)
pac code push     # Deployment auf Power Platform
```
