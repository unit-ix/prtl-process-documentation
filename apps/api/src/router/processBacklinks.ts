import type { ProcessRef } from '@app/domain';
import { and, asc, eq, isNull, ne } from 'drizzle-orm';
import { db } from '../db/client.js';
import { processes, processLinks } from '../db/schema/index.js';

// Rückfrage vor dem Deaktivieren (Termin 30.10.): wer verweist noch auf diesen Prozess? Gezählt
// wird nur die aktuelle Ausgabe der anderen Prozesse — eine alte Ausgabe ist eingefroren und
// zeigt ohnehin ihren Stand von damals.
export async function loadLinkedFrom(processId: string): Promise<ProcessRef[]> {
    return db
        .selectDistinct({ id: processes.id, title: processes.title, identifier: processes.identifier })
        .from(processLinks)
        .innerJoin(processes, eq(processes.currentVersionId, processLinks.processVersionId))
        .where(
            and(
                eq(processLinks.linkedProcessId, processId),
                eq(processLinks.isActive, true),
                eq(processes.isActive, true),
                isNull(processes.deactivatedAt),
                ne(processes.id, processId),
            ),
        )
        .orderBy(asc(processes.title));
}
