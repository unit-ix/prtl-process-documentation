// §9.7 — Benutzer kommen aus EINER Sicherheitsgruppe im Mandanten, nicht aus einem freien
// Formular: wer nicht in GRP_PRETTL_Prozessdokumentation_Nutzer steht, hat in der Anwendung
// nichts verloren. Gelesen wird mit der Managed Identity, also ohne Schlüssel.
//
// Die dafür nötige Graph-Rolle (GroupMember.Read.All, Anwendungsberechtigung) ist bewusst NICHT
// von uns vergeben: sie erlaubt das Lesen JEDER Gruppenmitgliedschaft im Mandanten und ist damit
// eine Entscheidung der PRETTL-IT, keine Nebenwirkung eines Feature-Wunsches. Fehlt sie, sagt der
// Endpoint das im Klartext, statt eine leere Liste vorzutäuschen.
import { canSeeSettings, type SessionUser } from '@app/domain';
import { DefaultAzureCredential } from '@azure/identity';
import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import { areas, users } from '../db/schema/index.js';
import { ApiError, badRequest, forbidden, notFound } from '../http/errors.js';
import { serverEnv } from '../env.js';

const SCOPE = 'https://graph.microsoft.com/.default';
const credential = new DefaultAzureCredential();

export interface DirectoryUser {
    entraObjectId: string;
    displayName: string;
    mail: string | null;
    /** true = in dieser Anwendung bereits angelegt. */
    exists: boolean;
}

interface GraphMember {
    id?: string;
    displayName?: string;
    mail?: string | null;
    userPrincipalName?: string | null;
}

export async function listDirectoryUsers(user: SessionUser): Promise<{ items: DirectoryUser[] }> {
    if (!canSeeSettings(user)) throw forbidden('Benutzerverwaltung ist Administration und QM vorbehalten.');

    const groupId = serverEnv().ENTRA_USER_GROUP_ID;
    if (groupId === undefined) throw badRequest('Es ist keine Benutzergruppe konfiguriert (entra.userGroupId).');

    const token = await credential.getToken(SCOPE);
    if (!token) throw new ApiError(502, 'bad_gateway', 'Kein Graph-Token erhalten.');

    const url = `https://graph.microsoft.com/v1.0/groups/${groupId}/members?$select=id,displayName,mail,userPrincipalName&$top=200`;
    const response = await fetch(url, { headers: { authorization: `Bearer ${token.token}` } });

    if (response.status === 403 || response.status === 401) {
        throw new ApiError(
            503,
            'directory_unavailable',
            'Der Verzeichniszugriff fehlt: die PRETTL-IT muss der App-Identität die Graph-Berechtigung ' +
                '"GroupMember.Read.All" erteilen. Bis dahin können Benutzer nicht aus der Gruppe übernommen werden.',
        );
    }
    if (!response.ok) {
        throw new ApiError(502, 'bad_gateway', `Graph antwortete mit ${response.status}.`);
    }

    const body = (await response.json()) as { value?: GraphMember[] };
    const members = (body.value ?? []).filter((member): member is GraphMember & { id: string } => typeof member.id === 'string');

    const known =
        members.length === 0
            ? []
            : await db
                  .select({ entraObjectId: users.entraObjectId })
                  .from(users)
                  .where(inArray(users.entraObjectId, members.map((member) => member.id)));
    const existing = new Set(known.map((row) => row.entraObjectId));

    return {
        items: members
            .map((member) => ({
                entraObjectId: member.id,
                displayName: member.displayName ?? member.userPrincipalName ?? 'Unbekannt',
                mail: member.mail ?? member.userPrincipalName ?? null,
                exists: existing.has(member.id),
            }))
            .sort((a, b) => a.displayName.localeCompare(b.displayName, 'de')),
    };
}

export const createUserSchema = z
    .object({
        entraObjectId: z.string().uuid(),
        displayName: z.string().trim().min(1).max(200),
        mail: z.string().trim().email().nullish(),
        areaId: z.string().uuid().nullish(),
    })
    .strict();

export async function createUser(user: SessionUser, input: z.infer<typeof createUserSchema>): Promise<{ id: string }> {
    if (!canSeeSettings(user)) throw forbidden('Benutzerverwaltung ist Administration und QM vorbehalten.');

    if (input.areaId) {
        const [area] = await db.select({ id: areas.id }).from(areas).where(eq(areas.id, input.areaId)).limit(1);
        if (!area) throw notFound('Bereich nicht gefunden.');
    }

    // Rollen bekommt niemand bei der Aufnahme — sie werden danach in den Einstellungen vergeben.
    // Ein neu übernommener Benutzer sieht bis dahin die Seite "Keine Berechtigungen" (§2.1).
    const [row] = await db
        .insert(users)
        .values({
            entraObjectId: input.entraObjectId,
            displayName: input.displayName,
            mail: input.mail ?? null,
            areaId: input.areaId ?? null,
        })
        .onConflictDoNothing({ target: users.entraObjectId })
        .returning({ id: users.id });

    if (!row) throw badRequest('Dieser Benutzer ist bereits angelegt.');
    return row;
}
