# Prototype-Manifest

> **Zweck:** Ein einziger Ort, der jedes **PROTOTYPE-ONLY**-Artefakt auflistet — was es
> im Prototyp tut, was es am Fork (azure/dataverse) ersetzt, und ob der Austausch
> erledigt ist. Der Prototyp lügt bewusst an einigen Stellen (Mock-Daten, Fake-Rollen);
> dieses Manifest macht jede Lüge sichtbar, damit keine davon in Produktion durchrutscht.
>
> **Konvention:** Jede PROTOTYPE-ONLY-Stelle im Code trägt den Marker-Kommentar
> `PROTOTYPE-ONLY` **und** eine Zeile in der Tabelle unten. Kein Marker ohne Zeile,
> keine Zeile ohne Marker. Die `/prototype`-Engine pflegt diese Tabelle mit.

## Legende — Status

- `prototype` — nur die Prototyp-Variante existiert (Normalfall vor dem Fork)
- `forked` — Production-Ersatz implementiert, Prototyp-Variante entfernt/abgelöst
- `n/a` — bleibt bewusst auch in Produktion (kein Ersatz nötig)

## PROTOTYPE-ONLY-Artefakte

| Artefakt | Ort | Prototyp-Verhalten | Production-Ersatz | Status |
| --- | --- | --- | --- | --- |
| Rollen-Switcher | `apps/web/src/shared/components/layout/AppShell.tsx` (`RoleSwitcher`) | UI-Buttons wechseln die Persona frei | Switcher entfällt; Persona wird aus dem Host-User abgeleitet | `prototype` |
| Persona-Quelle | `apps/web/src/shared/lib/role/RoleContext.tsx` (`RoleProvider`) | Persona = lokaler `useState`, Default `admin` | Eine Zeile: Persona aus Host-Identity / Claims lesen | `prototype` |
| Mock-Adapter | `apps/web/src/data/adapters/mock/*` | In-Memory-Store implementiert die Ports | `AzureRepository` (eine Klasse für alle Entitäten, R4) bzw. `Dataverse*Repository` (R5) am selben Port | `prototype` |
| Query-Übersetzer | `apps/web/src/data/adapters/mock/query.ts` (`applyQuery`) | Filtert/sortiert/schneidet die Seed-Arrays in-memory, spec-getrieben | Derselbe Aufbau mit nativen Mitteln: PostgREST `.ilike/.eq/.order/.range` + `count: 'exact'` bzw. OData `filter`/`orderBy`/`maxPageSize`/`skipToken`. Der Port-Vertrag (`ListQuery`/`Page`/`QuerySpec`) bleibt unverändert | `prototype` |
| Seed-Daten (faker) | `apps/web/src/data/adapters/mock/seed.ts` | Deterministische deutsche Fake-Daten (SEED 42, fixe REF_DATE) | Echte Backend-Daten; faker fällt komplett weg | `prototype` |
| Seeded / laufende ids | `apps/web/src/data/adapters/mock/store.ts` (`nextId`) | `*-new-N` Sequenz + Seed-uuids | Vom Backend vergebene ids (uuid/GUID) | `prototype` |
| Adapter-Swap-Punkt | `apps/web/src/data/index.ts` | Verzweigt auf `platform`; `mock` liefert die Mock-Repositories | `azure`-Zweig verdrahtet (`AzureRepository`), `dataverse` noch `unsupported()` | `forked` |
| Demo-Anlegen | `apps/web/src/features/_example/pages/ContactsPage.tsx` (`handleCreateDemoContact`) | Legt einen Platzhalter-Kontakt an | Ersetzt durch echtes Formular pro Feature | `prototype` |
| Error-Demo-Trigger | `apps/web/src/features/_example/hooks/useContacts.ts` (`simulateError`) | `?debugError=1` in der URL erzwingt den DoD-Error-Zustand, ohne UI-Button | Entfällt — echte Ladefehler triggern den Zustand | `prototype` |
| Referenz-Feature `_example` | `apps/web/src/features/_example/*` | Kanonisches „mirror this, then delete."-Muster | Gelöscht, sobald das erste echte Feature steht | `prototype` |

## Bewusste `ui/`-Ausnahmen (kein PROTOTYPE-ONLY, bleiben in Produktion)

Stellen in `apps/web/src/shared/components/ui/` (vendored shadcn) weichen bewusst von einer Posture-Regel ab, tragen aber **keinen** `PROTOTYPE-ONLY`-Marker (deshalb nicht in der Tabelle oben) — sie bleiben auch in Produktion:

- **`sidebar.tsx` — `document.cookie`-Persistenz** (`SIDEBAR_COOKIE_NAME`): der shadcn-Sidebar-Block persistiert den Auf/Zu-Zustand in einem Cookie. Das ist eine harmlose UI-Präferenz (kein App-State, kein Secret), bewusst der „kein `localStorage`/Client-State"-Posture entzogen und als vendored shadcn-Standard **unverändert** übernommen. Kein Fork-Handlungsbedarf.

## Warum der Seed lazy ist

[`store.ts`](../apps/web/src/data/adapters/mock/store.ts) baut den Seed in einer Funktion
(`seedDb()`) und nicht als `export const db = buildSeed()`. Ein Aufruf auf Modul-Top-Level ist ein
Seiteneffekt, den Rollup nicht als rein beweisen kann: das Modul blieb dann selbst im azure-Bundle
stehen, mitsamt dem kompletten faker-Baum (~250 kB), obwohl dort nie ein Mock-Adapter läuft. Als
Funktion ist die Datei seiteneffektfrei und fällt beim Tree-Shaking zusammen mit den
Mock-Repositories weg. Die Form ist deshalb Absicht und keine Umständlichkeit.

Aus demselben Grund ist die **Aufrufreihenfolge in [`seed.ts`](../apps/web/src/data/adapters/mock/seed.ts)
Teil des Vertrags**: faker läuft gegen einen festen Seed, jedes Umstellen der Generator-Aufrufe
verschiebt jede id und jeden Wert danach.

## Fork-Checkliste (beim Übergang mock → azure/dataverse)

1. `platform` in `.unitix/project.json` umstellen.
2. Backend-Adapter pro Entität am jeweiligen Port implementieren, `apps/web/src/data/index.ts` um den Zweig ergänzen.
3. `RoleProvider`: Persona-Quelle auf den Host-User umstellen, `RoleSwitcher` aus `AppShell` entfernen.
4. `_example` löschen (falls noch vorhanden), Demo-Anlegen + Error-Demo-Trigger aus echten Features entfernen.
5. faker-Abhängigkeit entfernen, sobald kein Mock-Adapter mehr importiert wird.
6. Jede Zeile oben auf `forked`/`n/a` ziehen — bleibt eine auf `prototype`, ist der Fork nicht fertig.
