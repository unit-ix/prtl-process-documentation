// Welche Ausgabe ein Nutzer öffnet (§9.5). Die Regel entscheidet, ob jemand unfreigegebene Inhalte
// sieht — der schlimmste Fehlerfall in einem QMS. Canvas prüft hier das globale Verfasser-Flag,
// womit jeder Verfasser den Entwurf eines fremden Prozesses öffnet (§12, Defekt 2).
import { leadsArea, type Roles } from './permissions.js';

export interface VersionChoiceInput {
    readonly hasActiveDraft: boolean;
    readonly areaId: string;
    readonly authorId: string | null;
}

export interface VersionChoice {
    /** true = der Entwurf, false = die letzte freigegebene Ausgabe. */
    readonly showsDraft: boolean;
    /** true = es gibt einen Entwurf, den dieser Nutzer nicht sehen darf ("… ist in Bearbeitung"). */
    readonly hasHiddenDraft: boolean;
}

export function resolveVersionChoice(user: Roles, process: VersionChoiceInput): VersionChoice {
    const mayEdit =
        process.hasActiveDraft &&
        (user.isAdministrator || process.authorId === user.id || leadsArea(user, process.areaId));

    return { showsDraft: mayEdit, hasHiddenDraft: process.hasActiveDraft && !mayEdit };
}
