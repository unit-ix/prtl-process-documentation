# Projekt-Konfiguration

> Projektspezifische Claude-Konfiguration für DIESES Repo.
> Geteilte UNIT-IX-Standards inkl. Pflicht-Lektüre: [`.claude/CLAUDE.md`](.claude/CLAUDE.md) (wird automatisch zusätzlich geladen).

## Projektkontext

<!-- Wird im Verlauf des Projekts gefüllt: Kunde, Hauptdomäne, gewählte Connectoren,
     projektspezifische Abweichungen von den UNIT-IX-Standards. -->

## Workflow-Regeln

- Ein Schritt → Prüfung → nächster Schritt. Keine autonomen Ketten.
- Lovable liefert das Grundgerüst, Claude iteriert — Build muss nach jedem Schritt grün bleiben.
- `pnpm verify` muss vor jedem Commit grün sein (`pnpm lint && pnpm tsc --noEmit && pnpm build`). Das Gate sitzt im `/commit`-Skill.
- Für nicht-triviale Änderungen: `/plan <slug> [<beschreibung>]` → Plan-File inline editieren → `/execute docs/plans/<file>.md` (eine Phase) → `/commit` → ggf. weitere `/execute` + `/commit` für weitere Phasen → `/ship`. Details: [`.claude/CLAUDE.md`](.claude/CLAUDE.md) Sektion "Workflow-Skills (4-Kette)".

## Projekt-Doku

| Thema         | Datei                                          |
| ------------- | ---------------------------------------------- |
| Anforderungen | [`docs/prd.md`](docs/prd.md)                   |
| Datenmodell   | [`docs/datamodel.md`](docs/datamodel.md) + [`docs/datamodel.mmd`](docs/datamodel.mmd) |
| Architektur   | [`docs/architecture.md`](docs/architecture.md) |
