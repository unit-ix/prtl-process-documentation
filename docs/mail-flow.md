# Mailversand über Power Automate — Übergangsweg

> **Zielzustand ist Microsoft Graph `sendMail`** ohne Flow und ohne Geheimnis
> ([`azure-runbook.md`](azure-runbook.md) → E-Mail-Versand). Dieser Weg hier überbrückt die Zeit, bis
> PRETTL IT die App-Rolle `Mail.Send` vergeben hat. Beide Wege liegen als Adapter im Code
> nebeneinander; umgeschaltet wird mit `MAIL_TRANSPORT`.

## Was der Flow tut — und was er ausdrücklich nicht tut

Der Flow ist **Briefträger, nicht Sachbearbeiter**. Er bekommt Empfänger, Betreff und fertiges HTML
und verschickt genau das.

**Er schreibt nichts in die Datenbank.** Die Bestätigung aus der Unterweisungs-Mail geht als
normaler Klick gegen `POST /api/confirm/{token}` — also durch unsere API, mit Einmal-Token, Ablauf
und Nachweis. Der naheliegende Postgres-Connector wäre der falsche Weg: unser Server läuft
**Entra-only, Passwort-Authentifizierung ist abgeschaltet** — der wichtigste Schalter des ganzen
Setups —, und ein Connector schriebe an jeder Prüfung der API vorbei.

```
API (Sweep)  ──POST {to,subject,html} + x-prtl-secret──►  Flow  ──►  Postfach
                                                                      │
Teilnehmer klickt im Postfach ──────────────────────────────────────►  POST /api/confirm/{token}
                                                                      (unsere API schreibt)
```

## Die zwei Geheimnisse

Der einzige Ort im Stack, an dem es Geheimnisse gibt — und beide verschwinden wieder, sobald Graph
freigeschaltet ist.

| Wert | Was es ist | Wohin |
| --- | --- | --- |
| `MAIL_FLOW_URL` | die Trigger-URL des Flows. Sie trägt ihre Signatur im Query-String, ist also selbst das Geheimnis | App setting der Web App, lokal Root-`.env` |
| `MAIL_FLOW_SECRET` | frei gewählter Wert, den der Flow im Header `x-prtl-secret` prüft | ebenda |

Der Header ist nicht überflüssig: **eine geleakte Trigger-URL allein reicht damit nicht**, um über
PRETTL-Konten Mails zu verschicken. Beide Werte stehen **nicht** in `.unitix/project.json` — die
Datei ist committet.

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

## Flow anlegen

Fünf Schritte. Die fertige Definition liegt als Referenz in
[`power-automate/prtl-mail-versand.definition.json`](power-automate/prtl-mail-versand.definition.json)
— sie zeigt Ausdrücke und Reihenfolge, falls im Designer etwas unklar ist.

1. **Neuer Flow** → *Instant cloud flow* → Name `PRTL Prozessdokumentation — Mailversand` →
   Trigger **When an HTTP request is received**.

2. Im Trigger **Request Body JSON Schema** einfügen:

    ```json
    {
      "type": "object",
      "required": ["to", "subject", "html"],
      "properties": {
        "to": { "type": "string" },
        "subject": { "type": "string" },
        "html": { "type": "string" }
      }
    }
    ```

3. **Condition** einfügen. Linke Seite im Ausdrucks-Editor:

    ```
    triggerOutputs()?['headers']?['x-prtl-secret']
    ```

    Operator *is equal to*, rechts der Wert aus `MAIL_FLOW_SECRET`.

4. **If yes** → **Send an email (V2)** (Office 365 Outlook):
   `To` = `to`, `Subject` = `subject`, `Body` = `html` (im Feld auf **</>**-Ansicht umschalten, sonst
   escapet der Designer das HTML). Danach **Response** mit Status **202**.

   Soll als Sammelpostfach verschickt werden, stattdessen **Send an email from a shared mailbox
   (V2)** nehmen und die Adresse eintragen; das verbundene Konto braucht dafür „Senden als".

5. **If no** → **Response** mit Status **401**.

Speichern, dann die **HTTP POST URL** aus dem Trigger kopieren — das ist `MAIL_FLOW_URL`.

> **Die Response-Aktion ist Pflicht.** Ohne sie antwortet der Flow mit `202` erst, wenn der ganze
> Lauf fertig ist — und ein fehlgeschlagener Versand käme bei uns trotzdem als Erfolg an.

## Einschalten

```bash
# lokal: beide Werte in die Root-.env, dann
MAIL_TRANSPORT=powerAutomate pnpm dev:api

# Azure, je Umgebung
az webapp config appsettings set -n <app> -g <rg> \
  --settings MAIL_TRANSPORT=powerAutomate MAIL_FLOW_URL='<trigger-url>' MAIL_FLOW_SECRET='<secret>'
```

Fertig, wenn im Flow-Verlauf ein Lauf mit `202` steht und in der Datenbank
`process_events.is_sent = true` mit gesetztem `sent_at` erscheint.

## Was beim Umstieg auf Graph passiert

`MAIL_TRANSPORT=graph` setzen, `MAIL_FLOW_URL` und `MAIL_FLOW_SECRET` löschen, Flow abschalten.
Sonst nichts: Warteschlange, Vorlagen, Wiederholung und Zustandsrückschreibung sind dieselben.

## Offene Punkte

- **Eigentümer des Flows.** Zum Testen genügt ein persönliches Konto mit Power-Automate-Premium
  (der HTTP-Trigger ist premium). Vor Go-live gehört der Flow einem **lizenzierten Servicekonto** —
  sonst steht der Versand still, sobald diese Person das Unternehmen verlässt, und zwar lautlos.
- **Absenderpostfach.** Ohne Sammelpostfach kommen die Mails vom verbundenen Konto persönlich. Für
  den späteren Graph-Weg ist genau dieses Postfach ausserdem das, worauf die `Mail.Send`-Berechtigung
  per Exchange-Policy eingeschränkt wird.
