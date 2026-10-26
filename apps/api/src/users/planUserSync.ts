export interface GroupMember {
    readonly entraObjectId: string;
    readonly displayName: string;
    readonly mail: string | null;
}

export interface KnownUser {
    readonly id: string;
    readonly entraObjectId: string;
    readonly isActive: boolean;
}

export interface UserSyncPlan {
    readonly create: readonly GroupMember[];
    readonly reactivate: readonly string[];
    readonly deactivate: readonly string[];
}

/**
 * Die Entra-Gruppe ist die Quelle: wer drin ist, steht aktiv in der Liste (ohne Rolle = Leser),
 * wer rausfällt, wird deaktiviert. Rollen bleiben dabei stehen und gelten bei Wiederaufnahme wieder.
 * `ignored` sind Dienstkonten (UNIT IX): in der Gruppe, damit die Anmeldung geht, aber aktiv nur,
 * wenn wir sie für Support von Hand einschalten.
 */
export function planUserSync(
    allMembers: readonly GroupMember[],
    allKnown: readonly KnownUser[],
    ignored: ReadonlySet<string> = new Set(),
): UserSyncPlan {
    const members = allMembers.filter((member) => !ignored.has(member.entraObjectId));
    const known = allKnown.filter((user) => !ignored.has(user.entraObjectId));
    const memberIds = new Set(members.map((member) => member.entraObjectId));
    const knownIds = new Set(allKnown.map((user) => user.entraObjectId));

    return {
        create: members.filter((member) => !knownIds.has(member.entraObjectId)),
        reactivate: known.filter((user) => !user.isActive && memberIds.has(user.entraObjectId)).map((user) => user.id),
        // Eine leere Gruppe ist eher eine kaputte Antwort als eine echte Entscheidung — sie würde
        // sonst alle aussperren, auch die Administration.
        deactivate:
            members.length === 0
                ? []
                : known.filter((user) => user.isActive && !memberIds.has(user.entraObjectId)).map((user) => user.id),
    };
}
