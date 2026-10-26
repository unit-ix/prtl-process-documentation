// Gelesen wird mit der Managed Identity. Die nötige App-Rolle GroupMember.Read.All hat die PRETTL-IT
// am 26.10.2026 vergeben (Live und Test).
import { DefaultAzureCredential } from '@azure/identity';
import type { GroupMember } from './planUserSync.js';

const SCOPE = 'https://graph.microsoft.com/.default';
const TIMEOUT_MS = 15_000;

const credential = new DefaultAzureCredential();

export class DirectoryUnavailable extends Error {}

interface GraphUser {
    id: string;
    displayName?: string | null;
    givenName?: string | null;
    surname?: string | null;
    mail?: string | null;
    userPrincipalName?: string | null;
}

// Entra schreibt „Zapf Quentin (PRETTL, PE/COO)"; in der App stehen die Namen als „Quentin Zapf".
const nameOf = (user: GraphUser): string =>
    user.givenName && user.surname
        ? `${user.givenName} ${user.surname}`
        : (user.displayName ?? user.userPrincipalName ?? 'Unbekannt');

const toMember = (user: GraphUser): GroupMember => ({
    entraObjectId: user.id,
    displayName: nameOf(user),
    mail: user.mail ?? user.userPrincipalName ?? null,
});

export async function fetchGroupMembers(groupId: string): Promise<GroupMember[]> {
    const token = await credential.getToken(SCOPE);
    if (!token) throw new DirectoryUnavailable('Kein Graph-Token erhalten.');

    const members: GroupMember[] = [];
    let url: string | undefined =
        `https://graph.microsoft.com/v1.0/groups/${groupId}/members/microsoft.graph.user` +
        '?$select=id,displayName,givenName,surname,mail,userPrincipalName&$top=999';

    while (url) {
        const response = await fetch(url, {
            headers: { authorization: `Bearer ${token.token}` },
            signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (response.status === 401 || response.status === 403) {
            throw new DirectoryUnavailable('Der App fehlt die Graph-Berechtigung GroupMember.Read.All.');
        }
        if (!response.ok) throw new DirectoryUnavailable(`Graph antwortete mit ${response.status}.`);

        const body = (await response.json()) as { value?: GraphUser[]; '@odata.nextLink'?: string };
        members.push(...(body.value ?? []).map(toMember));
        url = body['@odata.nextLink'];
    }

    return members;
}
