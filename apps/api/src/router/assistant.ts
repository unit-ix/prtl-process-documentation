// §7.10 — Retrieval serverseitig und IMMER im Lesebereich des Aufrufers: weder die Canvas-App noch
// der Prototyp tun das, aber ein Assistent, der einen Entwurf oder einen fremden Prozess
// ausspuckt, hebelt §2.4 aus. Der Index enthält deshalb nur freigegebene Prozesse, gefiltert mit
// derselben Klausel wie die Liste.
import {
    answerFor,
    buildMessages,
    search,
    type AssistantDocument,
    type AssistantHit,
    type SessionUser,
} from '@app/domain';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import { areas, processes } from '../db/schema/index.js';
import { AssistantRefused, AssistantUnavailable, complete } from '../assistant/chat.js';
import { readScope } from './processScope.js';

export const askSchema = z.object({ question: z.string().trim().min(1).max(500) }).strict();

export interface AssistantAnswer {
    readonly answer: string;
    readonly hits: AssistantHit[];
    /** false = das Modell war nicht erreichbar, die Antwort ist die reine Trefferliste. */
    readonly generated: boolean;
}

async function buildIndex(user: SessionUser): Promise<AssistantDocument[]> {
    const scope = readScope(user);

    return db
        .select({
            processId: processes.id,
            identifier: processes.identifier,
            title: processes.title,
            shortDescription: processes.shortDescription,
            purpose: processes.purpose,
            descriptionText: processes.descriptionText,
            areaTitle: areas.title,
        })
        .from(processes)
        .innerJoin(areas, eq(areas.id, processes.areaId))
        .where(
            and(
                eq(processes.isActive, true),
                // Nur die freigegebene Spiegelung der Hülle — nie ein Entwurf.
                eq(processes.status, 'approved'),
                ...(scope ? [scope] : []),
            ),
        );
}

export async function ask(user: SessionUser, input: z.infer<typeof askSchema>): Promise<AssistantAnswer> {
    const index = await buildIndex(user);
    const hits = search(index, input.question);

    // Das Modell sieht ausschliesslich die Treffer — also nur, was der Fragende ohnehin lesen darf.
    const found = new Set(hits.map((hit) => hit.processId));
    const context = index.filter((document) => found.has(document.processId));

    try {
        const answer = await complete(buildMessages(input.question, context));
        return { answer, hits, generated: true };
    } catch (error) {
        if (error instanceof AssistantRefused) {
            return {
                answer: 'Diese Frage hat der Sicherheitsfilter abgelehnt. Bitte formulieren Sie sie sachlich neu.',
                hits,
                generated: false,
            };
        }
        // Ist das Modell nicht erreichbar, bleibt der Finder: lieber die Trefferliste ohne Satz als
        // eine Fehlermeldung, wo eine Antwort stehen sollte.
        if (!(error instanceof AssistantUnavailable)) throw error;
        console.error('[assistant] Modell nicht erreichbar:', error.message);
        return { answer: answerFor(input.question, hits), hits, generated: false };
    }
}
