// §7.10 — ein FINDER, kein Erklärer. Die Bewertung ist eine reine Funktion: sie bekommt den Index
// herein und gibt Treffer zurück, ohne Netz und ohne Modell. Das ist der Teil, der falsch sein
// kann, ohne dass man es am Bildschirm sieht — deshalb steht er hier und ist getestet.

export interface AssistantDocument {
    readonly processId: string;
    readonly identifier: string | null;
    readonly title: string;
    readonly shortDescription: string | null;
    readonly purpose: string | null;
    readonly areaTitle: string;
    readonly descriptionText: string | null;
}

export interface AssistantHit {
    readonly processId: string;
    readonly identifier: string | null;
    readonly title: string;
    readonly areaTitle: string;
    readonly score: number;
}

// Füllwörter tragen keine Bedeutung und würden sonst jeden Prozess gleich hoch bewerten.
const STOP_WORDS = new Set([
    'der','die','das','den','dem','des','ein','eine','einen','einem','einer','und','oder','aber',
    'wie','was','wer','wo','wann','warum','wieso','welche','welcher','welches','ist','sind','war',
    'für','fuer','von','vom','mit','bei','aus','auf','in','im','zu','zum','zur','über','ueber','an',
    'ich','du','er','sie','es','wir','ihr','man','mir','mich','sich','nicht','kein','keine','noch',
    'mal','bitte','zeig','zeige','finde','suche','gibt','geben','habe','haben','hat','soll','muss',
    'prozess','prozesse','dokument','dokumente','anweisung',
]);

export function tokenize(text: string): string[] {
    return text
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .split(' ')
        .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

const FIELD_WEIGHTS = [
    { of: (doc: AssistantDocument) => doc.title, weight: 5 },
    { of: (doc: AssistantDocument) => doc.identifier ?? '', weight: 5 },
    { of: (doc: AssistantDocument) => doc.areaTitle, weight: 3 },
    { of: (doc: AssistantDocument) => doc.shortDescription ?? '', weight: 2 },
    { of: (doc: AssistantDocument) => doc.purpose ?? '', weight: 2 },
    { of: (doc: AssistantDocument) => doc.descriptionText ?? '', weight: 1 },
];

function scoreDocument(document: AssistantDocument, terms: readonly string[]): number {
    return FIELD_WEIGHTS.reduce((total, field) => {
        const haystack = field.of(document).toLowerCase();
        const matches = terms.filter((term) => haystack.includes(term)).length;
        return total + matches * field.weight;
    }, 0);
}

export const MAX_HITS = 5;

export function search(
    documents: readonly AssistantDocument[],
    question: string,
    limit: number = MAX_HITS,
): AssistantHit[] {
    const terms = tokenize(question);
    if (terms.length === 0) return [];

    return documents
        .map((document) => ({
            processId: document.processId,
            identifier: document.identifier,
            title: document.title,
            areaTitle: document.areaTitle,
            score: scoreDocument(document, terms),
        }))
        .filter((hit) => hit.score > 0)
        .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'de'))
        .slice(0, limit);
}

export function answerFor(question: string, hits: readonly AssistantHit[]): string {
    if (tokenize(question).length === 0) {
        return 'Bitte stellen Sie eine Frage mit mindestens einem Suchbegriff.';
    }
    if (hits.length === 0) {
        return 'Dazu habe ich keinen freigegebenen Prozess gefunden. Versuchen Sie es mit einem anderen Begriff, zum Beispiel dem Bereich oder der Nummer.';
    }
    if (hits.length === 1) {
        return `Dazu passt ein freigegebener Prozess: ${hits[0].title} (${hits[0].areaTitle}).`;
    }
    return `Dazu passen ${hits.length} freigegebene Prozesse. Der beste Treffer ist „${hits[0].title}" aus dem Bereich ${hits[0].areaTitle}.`;
}
