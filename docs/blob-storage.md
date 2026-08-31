# Dateien — Blob Storage mit User-Delegation-SAS

> Das Dateikonzept für `platform: azure`. Es deckt DEV und PROD ab und kommt ohne ein einziges
> Secret aus. Die **Regeln** stehen in
> [`.claude/docs/patterns-azure.md`](../.claude/docs/patterns-azure.md), die **Reihenfolge des
> Setups** gehört nach [`azure-runbook.md`](azure-runbook.md), das **Umgebungsmodell** steht in
> [`environments.md`](environments.md). Bei Widerspruch gewinnt der Regelsatz.

## Der Satz, auf den alles hinausläuft

**Wer die Datenbankzeile sehen darf, darf die Datei sehen — und es gibt keine zweite
Berechtigungslogik für Dateien.**

Das trägt nur, wenn der Client den Speicherort nicht beeinflussen kann. Deshalb sind es fünf
Invarianten und nicht eine:

| # | Invariante | Was sie verhindert |
| --- | --- | --- |
| 1 | **Kein Account-Key.** Jeder SAS wird mit einem User-Delegation-Key signiert, den die Managed Identity holt. `Allow storage account key access` ist **Disabled** | Ein geleakter Key wäre Vollzugriff auf alles. Abgeschaltet sind Service- und Account-SAS gar nicht mehr einlösbar |
| 2 | **Der Blob-Pfad kommt nie vom Client — in beiden Hälften.** Der Server setzt ihn aus dem `oid` des Tokens und einer uuid zusammen; der Dateiname des Nutzers ist ein Datenbankfeld, nie ein Pfadsegment | Pfad-Injection, Kollisionen, das Beanspruchen fremder Blobs, Personendaten im Pfad |
| 3 | **Ein SAS gilt für genau einen Blob, eine Richtung, wenige Minuten.** Upload `c`, Download `r` — nie `rw`, nie auf einen Container oder ein Präfix, immer `spr=https` | Ein geleakter Link erreicht genau die eine Datei, für die er gedacht war |
| 4 | **Der Weg zum SAS führt durch eine Datenbankabfrage.** Der Endpoint liest zuerst die Zeile; gibt es sie nicht, gibt es keinen SAS | Dass Dateirechte neben den Datenrechten ein zweites Mal — und irgendwann anders — implementiert werden |
| 5 | **Download immer als `attachment`.** Der Read-SAS setzt `rscd` und `rsct` aus den **serverseitig geprüften** Werten der Zeile | Dass eine hochgeladene `.html` im Browser rendert und die Storage-Origin für Phishing taugt |

Invariante 5 ist der Grund, warum der Content-Type in der Datenbank steht und nicht dem Blob geglaubt
wird: **die Header des Uploads setzt der Browser des Nutzers**, ein SAS kann sie nicht erzwingen — und
`getProperties()` gibt genau sie zurück, nicht eine unabhängige Wahrheit. Maßgeblich ist deshalb der
Typ, den **Schritt 1 gegen die Allowlist geprüft hat**; die Antwort des Dienstes ist der Abgleich, nicht
die Quelle. Beim Download setzen wir die Header neu, aus unseren Werten.

Was Invariante 4 **nicht** sagt: dass es eine Datei-Berechtigung *pro Nutzer* gäbe. Sie hängt an der
Rechtestufe des Stacks, und die kennt heute nur „angemeldet" — siehe
[Grenzen und Restrisiken](#grenzen-und-restrisiken).

## Ressourcen und Konvention

Ein **Storage Account** (StorageV2, Hot, LRS), ein Container je Umgebung. Grundpreis 0 €, bei 20 GB
rund 0,35 €/Monat.

```
st<projekt>                    ein Storage Account
├── files          ← Prod      Container = Umgebungsgrenze, eigene Rollenzuweisung
└── files-dev      ← Dev
     └── a1b2…/         ← `oid` des Hochladenden, aus dem Token — nicht vom Client
          └── 9f2c…     ← ein Blob pro Datei, Name = uuid
```

**Warum ein Konto und nicht zwei.** Der Container ist ein vollwertiger RBAC-Scope, und die Datenrolle
wird pro Container zugewiesen — die Dev-Identity kann den Prod-Container nicht lesen (Schnittmengen-
Regel, siehe [die Rollenzuweisungen](azure-runbook.md#e-zwei-rollenzuweisungen-je-umgebung)). Ein zweites Konto brächte also keine
zusätzliche Grenze, kostet aber die doppelte Pflege von CORS-Regel, Data-Protection-Einstellungen und
CSP-Eintrag. **Umkehrbar bleibt es trotzdem:** `storage.account` steht im Umgebungsblock, nicht global.

```json
"environments": {
  "dev":  { …, "storage": { "account": "st<projekt>", "container": "files-dev" } },
  "prod": { …, "storage": { "account": "st<projekt>", "container": "files" } }
}
```

Nach der Regel *ein Wert, ein Name* heißen die App Settings `STORAGE_ACCOUNT` und
`STORAGE_CONTAINER` — zu kopieren, nicht herzuleiten
([Schritt 3b](azure-runbook.md#3b-app-settings)).
Kontonamen sind global eindeutig, 3–24 Zeichen, nur Kleinbuchstaben und Ziffern, keine Bindestriche;
Container-Namen erlauben sie.

## Der Ablauf

Die Datei geht **direkt** zwischen Browser und Blob Storage, nie durch die API.

```
Upload                                          Download
──────                                          ────────
1. POST /api/files/upload-url                   1. GET /api/files/:id/url
   → Typ gegen die Allowlist, uuid                 → liest die Zeile (Autorisierung!)
   → { id, uploadUrl }   SAS c, 15 min             → { url }   SAS r, 10 min, attachment

2. PUT uploadUrl                                2. window.location = url
   Browser → Blob, x-ms-blob-type: BlockBlob        Browser → Blob, kein Umweg

3. POST /api/files
   → getProperties(): echte Größe, Typ-Abgleich
   → zu groß oder anderer Typ? Blob löschen, 400
   → schreibt die Zeile   201
```

**Warum drei Schritte und nicht zwei.** Zeile und SAS in einem Aufruf wären kürzer — dann ist die
Dateigröße aber nur eine **Behauptung des Clients**, und ein SAS kann sie nicht begrenzen. Schritt 3
fragt stattdessen den Blob selbst: Größe **aus** der Antwort des Dienstes, Typ **gegen** den in
Schritt 1 geprüften abgeglichen. Damit fallen drei Vertrauensfragen weg: existiert er, wie groß ist
er wirklich, ist er das, was angekündigt war. Der Preis ist ein **verwaister Blob** bei abgebrochenem
Upload statt einer verwaisten Zeile — die bessere Hälfte des Tauschs, denn ein verwaister Blob ist
unsichtbar und kostet Zehntelcents.

**Warum der Pfad ein Präfix trägt.** Die uuid entsteht in Schritt 1 — aber in Schritt 3 kommt sie vom
Client zurück. Für sich genommen dürfte damit jeder Angemeldete eine **fremde** uuid einsetzen und sich
eine Zeile auf einen fremden Blob schreiben, die jede spätere Rechteprüfung dann als seine eigene liest.
Deshalb baut der Server den Blob-Namen aus zwei Hälften, die beide ihm gehören: `${oid}/${id}`, das
Präfix aus dem geprüften Token. Eine fremde uuid landet unter dem **eigenen** Präfix, dort liegt nichts,
`getProperties()` antwortet 404. Das kostet ein Pfadsegment und keine Zeile Zustand — der Preis ist,
dass `uploaded_by` Pfad-Material wird und damit unveränderlich ist. Als Nebeneffekt sind „alle Dateien
eines Nutzers" ein Prefix-Listing.

**Warum der Download ein `GET` ist.** Bekommt ein Projekt Rechtestufen, ist die Umsetzung ein globaler
`preHandler`, der bei Stufe „Lesen" jede Nicht-GET-Methode ablehnt. Ein `POST …/download-url` würde
genau die Nutzer aussperren, für die er gedacht ist. Die Methode ist hier keine Kosmetik.

**Löschen: erst die Zeile, dann der Blob.** So ist der schlimmste Fehlerfall ein verwaister Blob;
umgekehrt bliebe eine Zeile, die auf nichts zeigt.

| Methode + Pfad | Wer erledigt es |
| --- | --- |
| `GET /api/files?contact.id=…` und `GET /api/files/:id` | `router/files.ts`, aber über `listRows()` — Filtern, Sortieren, Paginieren gratis |
| `POST /api/files/upload-url`, `POST /api/files`, `GET /api/files/:id/url`, `DELETE /api/files/:id` | `router/files.ts` |

**`files` steht nicht in `RESOURCES`.** Den Registry-Eintrag gibt es — Filter, Sorts und Mapper werden
gebraucht — aber er wird exportiert und von `files.ts` an `listRows()` übergeben, statt in der Tabelle
zu stehen, die `handle.ts` nachschlägt. Sonst fiele `PATCH /api/files/:id` in das generische `onItem()`
durch und dürfte `content_type`, `contact_id` und `uploaded_by` überschreiben — genau die drei Felder,
die nie aus dem Body kommen. `RESOURCES` liest sich damit als das, was es ist: die Liste „hier ist
generisches CRUD erlaubt". Der Zweig für `/files*` sitzt **vor** dem Registry-Lookup und matcht exakt;
`resolveTarget()` kennt nur zwei Segmente und würde `/files/:id/url` sonst als 404 abweisen.

**Drei Werte werden an der Kante normalisiert**, bevor sie dort ankommen, wo sie wirken: `id` durch
`z.string().uuid()` (sie wird ein Pfad — das ist die mechanische Hälfte von Invariante 2), `contentType`
gegen die Allowlist, und `fileName` auf einen konservativen Zeichensatz mit Längengrenze. Der Dateiname
wird ein **Response-Header**: CR/LF und `"` brechen `Content-Disposition` auf, Nicht-ASCII braucht die
`filename*`-Form.

```ts
export const files = pgTable('files', {
    id: uuid('id').primaryKey(),                    // KEIN defaultRandom(): die id ist der Blob-Name
    fileName: text('file_name').notNull(),          // Anzeigename, normalisiert, nie Pfad
    contentType: text('content_type').notNull(),    // die Allowlist aus Schritt 1, nie der Body
    sizeBytes: integer('size_bytes').notNull(),     // aus getProperties()
    uploadedBy: text('uploaded_by').notNull(),      // `oid` aus dem JWT — zugleich das Pfad-Präfix
    contactId: uuid('contact_id').notNull().references(() => contacts.id, { onDelete: 'cascade' }),
    createdOn: timestamp('created_on', { withTimezone: true }).notNull().defaultNow(),
});
```

`id` hat bewusst **kein** `defaultRandom()`: sie entsteht in Schritt 1, steht im SAS und kommt in
Schritt 3 zurück. Zusammen mit `uploaded_by` ergibt sie den Blob-Pfad — eine eigene Pfad-Spalte wäre
eine zweite Wahrheit. `onDelete: 'cascade'` löscht die Zeilen, **nicht** die Blobs — wer kaskadierend
löscht, braucht die Aufräum-Abfrage („Blobs ohne Zeile, älter als 7 Tage") oder löscht die Dateien
vorher explizit. Eine Lifecycle-Regel ersetzt sie nicht: die sieht nur das Alter, nicht die Zeilen.

> **Der Delegation-Key wird gecacht** — sonst wären es zwei Round-Trips pro Datei. Er darf bis zu
> **sieben Tage** gelten; wir holen ihn für **eine Stunde**, um fünf Minuten rückdatiert, und erneuern
> ihn nach **40**. Kurz genug, dass ein Widerruf schnell greift, lang genug für einen Aufruf pro Stunde
> — dasselbe Muster wie das JWKS-Set in [`verify.ts`](../apps/api/src/auth/verify.ts).
>
> **Die 40 sind gerechnet, nicht gegriffen.** Der **SAS muss innerhalb der Key-Lebensdauer ablaufen**,
> sonst weist der Dienst ihn mit `403` ab, obwohl er selbst noch gültig wäre. Der Abstand ist also die
> längste SAS-Laufzeit plus Drift: 60 − 15 − 5. Mit fünf Minuten Abstand statt zwanzig scheiterte ein
> Upload-SAS aus Minute 54 sporadisch — und solche Fehler werden erfahrungsgemäß mit *längeren* SAS
> „repariert". Der SAS selbst bekommt **keinen** Startzeitpunkt, aus demselben Grund, aus dem der Key
> einen rückdatierten trägt: Uhrendrift ließe frisch ausgegebene sonst sporadisch scheitern.

## Was es an Code kostet

| Bereich | Aktion |
| --- | --- |
| `apps/api/src/storage/blob.ts` | **neu** — Container-Client, gecachter Delegation-Key, `uploadSas` / `readSas` / `properties` / `remove` |
| `apps/api/src/router/files.ts` | **neu** — die vier Endpoints |
| `apps/api/src/{db/schema,router/registry,router/handle,server,env}.ts` | Tabelle, **exportierter** Registry-Eintrag (nicht in `RESOURCES`), Zweig für `/files*`, `claims` im `RouterRequest`, engeres Limit auf `upload-url`, zwei Env-Variablen |
| `apps/web/src/data/ports/FileRepository.ts` + `adapters/{azure,mock}/` | **neu** — Port, HTTP-Adapter mit dem direkten `PUT`, Mock-Adapter |
| `staticwebapp.config.json`, `.unitix/project.json` | Blob-Host in `connect-src` (und `img-src`, sobald Bilder inline angezeigt werden), `storage`-Block je Umgebung |

Zusammen **≈ 300 Zeilen** und **eine** neue Abhängigkeit: `@azure/storage-blob` in `apps/api`. Im
Frontend keine — der Upload ist ein `fetch`-`PUT` mit zwei Headern, und der gehört ohnehin in den
Adapter (ESLint-erzwungen).

**Der Mock-Adapter ist nicht optional.** Ohne ihn hätte der Prototyp keine Datei-Oberfläche und die
Data-Seam wäre an dieser Stelle gelogen: `File`-Objekte im Store, `URL.createObjectURL(file)` als
Download-URL, ~30 Zeilen — und `pnpm dev` zeigt dieselbe UI wie Produktion.

## Setup und Smoke-Test

Die Klickfolge im Portal steht im Runbook: [Blob Storage](azure-runbook.md#optional-blob-storage)
legt Konto, Container und CORS-Regel an, [Schritt e\)](azure-runbook.md#e-zwei-rollenzuweisungen-je-umgebung) die
zwei Rollen — die brauchen die Object-ID der Managed Identity aus Schritt 3. Steht das, prüft diese
Liste die Invarianten und nicht nur, dass etwas läuft:

- Upload → die Größe in der Liste stimmt mit der Datei überein, nicht mit einer Behauptung des Clients
- Download → Originalname, öffnet **nicht** im Browser-Tab
- Download-URL nach zehn Minuten erneut aufrufen → `403`
- In Schritt 3 die uuid einer **fremden** Datei einsetzen → `404` (sie liegt nicht unter meinem Präfix)
- `PATCH /api/files/:id` mit `{"contentType": "text/html"}` → `404`, `files` steht nicht in `RESOURCES`
- Blob-URL ohne SAS → `404` (nicht `403`: ohne anonymen Zugriff verrät der Dienst nicht die Existenz)
- Pfad in einem gültigen SAS umschreiben → `403`, die Signatur deckt den Pfad

## Was DEV und PROD teilen

| Ressource | Dev | Prod |
| --- | --- | --- |
| Storage Account, CORS-Origins | \<— geteilt —> | |
| Container | `files-dev` | `files` |
| Rollenzuweisung der Managed Identity | auf `files-dev` | auf `files` |

**Die Grenze des geteilten Kontos:** Soft-Delete-Fristen, Firewall und Verschlüsselung gelten
kontoweit. Braucht Prod eine andere Aufbewahrung als Dev, ist das ein zweites Konto — zwei Felder in
`project.json`, kein Code-Umbau.

## Grenzen und Restrisiken

- **Jeder angemeldete Nutzer kann jede Datei laden.** Das ist die Rechtestufe des Basis-Stacks —
  Authentifizierung, keine Autorisierungsstufen ([`patterns-azure.md`](../.claude/docs/patterns-azure.md))
  — und keine Eigenschaft des Dateikonzepts: Invariante 4 gibt Dateien exakt die Sichtbarkeit ihrer
  Zeile, und die ist heute „alle". Bekommt das Projekt Rechtestufen oder Mandanten, wirkt das ohne
  Änderung an diesem Konzept. Wer die Datei *enger* stellen will als die Zeile, bricht Invariante 4.
- **Der Blob-Endpunkt ist öffentlich erreichbar, und das lässt sich nicht wegkonfigurieren.** Bei
  PostgreSQL zeigt die Firewall auf die Outbound-IPs des App Service; hier lädt der Browser des
  Nutzers von beliebigen IPs. Getragen wird die Absicherung vom SAS und von Entra-only, nicht vom
  Netz — ein Private Endpoint würde den direkten Upload gerade unmöglich machen.
- **Ein SAS-Link ist ein Zugriffsrecht in einer URL.** Er landet in der Browser-History und
  funktioniert, wo auch immer er auftaucht — bis er abläuft. Darum zehn Minuten und genau ein Blob.
  Er erzeugt dabei auch Egress-Kosten (frei bis 100 GB/Monat), also ist die kurze Laufzeit nicht nur
  eine Vertraulichkeitsfrage. Die Antwort, die ihn trägt, bekommt `Cache-Control: no-store` und gehört
  in kein Log. Nach einem `DELETE` läuft ein noch gültiger Link ins Leere — soft-deleted Blobs liefert
  der Dienst nicht aus —, das Fenster gilt also nur für bereits laufende Downloads. Notfall:
  `Revoke User Delegation Keys` entwertet **alle** ausgegebenen SAS, Entzug der Rollenzuweisung wirkt
  ebenso — beides mit Cache-Verzögerung von Minuten.
- **Das Ausstellen eines SAS ist nicht auditierbar.** Azure protokolliert es nicht, und keine API kann
  es nachträglich beantworten. Wer wissen muss, wer wann welche Datei geholt hat, schreibt es **selbst
  in die Datenbank**, im Endpoint. Echte Blob-Zugriffe bräuchten Diagnostic Settings, und die kosten.
- **Das Größen-Cap greift erst in Schritt 3.** Mit gültigem Upload-SAS kann ein angemeldeter Nutzer
  mehr schreiben, als er darf; die Zeile entsteht dann nicht und der Blob wird gelöscht. Was bleibt,
  ist Traffic. `RATE_LIMIT_MAX` (200/Minute) ist dafür keine Grenze — ein Einzel-`PUT` darf 5.000 MiB
  —, deshalb bekommt `upload-url` ein **eigenes, engeres Limit**. Eine Lifecycle-Regel hilft hier
  übrigens *nicht*: sie löscht nach Alter und kennt die Zeilen nicht, träfe also echte Dateien mit.
- **Kein Virenscan.** Wer Dateien von außerhalb der eigenen Organisation annimmt, sollte **Defender
  for Storage** einschalten — kostenpflichtig pro gescanntem GB, deshalb eine Projektentscheidung.
- **Soft Delete heißt: 7 Tage widerruflich.** Gut gegen den Fehlklick, erklärungsbedürftig gegenüber
  einem DSGVO-Löschverlangen.

## Verworfene Alternativen

| Option | Warum nicht |
| --- | --- |
| **Upload durch die API** (Datei durch den Prozess) | Der SWA-Proxy erlaubt 45 s pro Request, das Body-Limit steht bei 64 KB, und eine B1-Instanz wird zur Bandbreiten-Engstelle. Den Vorteil („der Server sieht die Datei") holt `getProperties` ohne den Datenverkehr |
| **Account-Key in den App Settings** (+ Key Vault) | Bricht die Regel „kein Secret". Der Key ist Vollzugriff auf alle Container und läuft nie ab; Key Vault würde das Problem verwalten statt es abzuschaffen |
| **Öffentlich lesbarer Container** („die URL kennt ja niemand") | Der Dateiname wäre die einzige Hürde, und Suchmaschinen sind gut im Raten |
| **Ein SAS auf den Container oder ein Präfix** | Spart einen Round-Trip und macht den Container zur Sicherheitsgrenze: wer den Link hat, erreicht alles darin. Ein SAS gilt für genau einen Blob, das ist Invariante 3 |
| **Dateien in PostgreSQL** (`bytea` / Large Object) | Speicher kostet dort 0,1202 €/GB statt 0,0172 €/GB, Backup und PITR wachsen mit, und die 45-s-Grenze bleibt. Eine Datenbank ist kein Dateisystem |
| **Dateiname des Nutzers als Blob-Pfad** | Pfad-Injection, Kollisionen, Längengrenzen, Personendaten im Pfad. Der Name ist ein Datenbankfeld, der Pfad eine uuid |
| **Blob Versioning / Change Feed** | Kosten pro Version bzw. Event, ohne Anforderung. Soft Delete deckt den Unfall; echte Dokumentversionierung ist ein Datenmodell, kein Storage-Schalter |
| **Front Door oder CDN vor dem Blob** | Ein Cache vor kurzlebigen, signierten URLs ist eine Fehlerquelle, kein Beschleuniger |

## Bewusst offen

Nachrüstbar ohne Umbau: **Defender for Storage** (Malware-Scan), **Immutability/WORM** (zeitbasierte
Aufbewahrung pro Container), **Lifecycle-Regeln** (Hot → Cool → Archive), **Diagnostic Settings** für
echte Zugriffsprotokolle. Bei `platform: powerapps` bleibt der Port und der Dataverse-Adapter würde
File-Spalten benutzen statt Blobs.

**Die Inline-Anzeige ist die eine Nachrüstung mit einer Bedingung.** Sie hebelt Invariante 5 aus, und
das ist genau dann vertretbar, wenn `rscd: inline` an eine enge Allowlist geprüfter Bildtypen
gebunden bleibt — **ohne `image/svg+xml`**, das rendert Skript. Alles andere bleibt `attachment`.

## Belege

Preise: Azure Retail Prices API, EUR, `germanywestcentral`, Stand 2026-08-06 — Blob Hot LRS
**0,0172 €/GB**, Postgres Storage 0,1202 €/GB, Egress frei bis 100 GB/Monat.

- [SAS-Übersicht](https://learn.microsoft.com/en-us/azure/storage/common/storage-sas-overview):
  User-Delegation-SAS ist die empfohlene Form · *„It's not possible to audit the generation of SAS
  tokens."* · Empfehlungen zu Startzeit, kurzen Laufzeiten, minimalen Rechten und HTTPS-only (`spr`)
- [User-Delegation-SAS erstellen](https://learn.microsoft.com/en-us/rest/api/storageservices/create-user-delegation-sas):
  *„The permissions granted to a client who possesses the SAS are the **intersection** of the
  permissions that were granted to the security principal that requested the user delegation key and
  the permissions that were granted to the resource on the SAS token"* · zu `skoid`: *„Before
  authorizing the operation, Azure Storage checks RBAC permissions against the object ID"* ·
  Delegator-Rolle auf Konto/RG/Subscription, Datenrolle auf dem Container · Key maximal 7 Tage, SAS
  muss darin ablaufen · `rscd` setzt `Content-Disposition` · Widerruf per Key oder Rollenentzug,
  beides mit Cache-Verzögerung
- [Shared Key verhindern](https://learn.microsoft.com/en-us/azure/storage/common/shared-key-authorization-prevent):
  bei `AllowSharedKeyAccess = false` ist der User-Delegation-SAS *„permitted"*, Service- und
  Account-SAS *„denied"* · die Eigenschaft ist bei neuen Konten **nicht gesetzt**
- [Anonymen Lesezugriff verhindern](https://learn.microsoft.com/en-us/azure/storage/blobs/anonymous-read-access-prevent):
  `AllowBlobPublicAccess = false` gilt kontoweit und schlägt jede Container-Einstellung
- [Put Blob](https://learn.microsoft.com/en-us/rest/api/storageservices/put-blob): `x-ms-blob-type`
  ist Pflicht · Einzel-`PUT` bis **5.000 MiB**, darüber `413`
