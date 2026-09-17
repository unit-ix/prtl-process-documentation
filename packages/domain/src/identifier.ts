// §5.1 Schritt 3 und §5.2. Das Identkennzeichen wird EINMAL geprägt und ändert sich danach nie —
// Canvas prägt es bei jeder Freigabe neu, womit aus VA PE 2 EK.001 bei Ausgabe 2 plötzlich
// VA PE 2 EK.007 wird (§12, Defekt 3). Die Prozessart-Nummer steht hier und NIE im Titel (§10 C2).
import type { CategoryNumber, Scope, SpecificationType } from './enums.js';

export interface IdentifierParts {
    readonly specificationType: SpecificationType;
    readonly scope: Scope | null;
    readonly categoryNumber: CategoryNumber;
    readonly areaShortCode: string;
    readonly documentNumber: number;
}

export const DOCUMENT_NUMBER_DIGITS = 3;

export function buildIdentifier(parts: IdentifierParts): string {
    const number = String(parts.documentNumber).padStart(DOCUMENT_NUMBER_DIGITS, '0');
    return [
        parts.specificationType,
        parts.scope,
        String(parts.categoryNumber),
        `${parts.areaShortCode}.${number}`,
    ]
        .filter((segment): segment is string => segment !== null && segment !== '')
        .join(' ');
}

/** Ein bereits geprägtes Kennzeichen bleibt, egal was sich seither geändert hat. */
export const keepOrBuildIdentifier = (existing: string | null, parts: IdentifierParts): string =>
    existing ?? buildIdentifier(parts);

/** §5.1 Schritt 2: die Nummer gilt je Bereich und wird nur beim ersten Mal gezogen. */
export const keepOrMintDocumentNumber = (existing: number | null, maxInArea: number | null): number =>
    existing ?? (maxInArea ?? 0) + 1;

/** §5.1 Schritt 1: die Ausgabe zählt je Prozess monoton hoch. */
export const nextEdition = (maxEdition: number | null): number => (maxEdition ?? 0) + 1;
