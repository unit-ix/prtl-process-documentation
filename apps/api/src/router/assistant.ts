// §7.10 — Retrieval serverseitig und IMMER im Lesebereich des Aufrufers: weder die Canvas-App noch
// der Prototyp tun das, aber ein Assistent, der einen Entwurf oder einen fremden Prozess
// ausspuckt, hebelt §2.4 aus. Der Index enthält deshalb nur freigegebene Prozesse, gefiltert mit
// derselben Klausel wie die Liste.
import { answerFor, search, type AssistantDocument, type AssistantHit, type SessionUser } from '@app/domain';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import { areas, processes } from '../db/schema/index.js';
import { readScope } from './processScope.js';

export const askSchema = z.object({ question: z.string().trim().min(1).max(500) }).strict();

export interface AssistantAnswer {
    readonly answer: string;
    readonly hits: AssistantHit[];
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
    const hits = search(await buildIndex(user), input.question);
    return { answer: answerFor(input.question, hits), hits };
}
