// §5.1 Schritt 3 und §5.2. Das Identkennzeichen wird EINMAL geprägt und ändert sich danach nie —
// Canvas prägt es bei jeder Freigabe neu, womit aus VA PE 2 EK.001 bei Ausgabe 2 plötzlich
// VA PE 2 EK.007 wird (§12, Defekt 3). Die Prozessart-Nummer steht hier und NIE im Titel (§10 C2).
// Die eine Ausnahme ist bewusst und protokolliert: ein Administrator korrigiert eine Nummer, damit
// beim Import aus Word die bisherigen Nummern erhalten bleiben (Testauswertung 09.10.2026).
import type { CategoryNumber, Scope, SpecificationType } from './enums.js';

export interface IdentifierParts {
    readonly specificationType: SpecificationType;
    readonly scope: Scope | null;
    readonly categoryNumber: CategoryNumber;
    readonly areaShortCode: string;
    readonly documentNumber: number;
    /** Nur für ein Unterdokument: es trägt die Nummer seiner VA und zählt darunter hoch. */
    readonly subNumber?: number | null;
}

export const DOCUMENT_NUMBER_DIGITS = 3;
export const SUB_NUMBER_DIGITS = 2;

/** Der Nummernteil des Kennzeichens: OM.001, als Unterdokument OM.001_01. */
export function formatNumber(areaShortCode: string, documentNumber: number, subNumber?: number | null): string {
    const number = String(documentNumber).padStart(DOCUMENT_NUMBER_DIGITS, '0');
    const sub = subNumber == null ? '' : `_${String(subNumber).padStart(SUB_NUMBER_DIGITS, '0')}`;
    return `${areaShortCode}.${number}${sub}`;
}

export function buildIdentifier(parts: IdentifierParts): string {
    return [
        parts.specificationType,
        parts.scope,
        String(parts.categoryNumber),
        formatNumber(parts.areaShortCode, parts.documentNumber, parts.subNumber),
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

/** Die Unternummer gilt je übergeordneter VA und wird ebenfalls nur beim ersten Mal gezogen. */
export const keepOrMintSubNumber = (existing: number | null, maxUnderParent: number | null): number =>
    existing ?? (maxUnderParent ?? 0) + 1;

/** §5.1 Schritt 1: die Ausgabe zählt je Prozess monoton hoch. */
export const nextEdition = (maxEdition: number | null): number => (maxEdition ?? 0) + 1;
