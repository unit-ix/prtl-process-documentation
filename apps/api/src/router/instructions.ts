import {
    canManageInstructions,
    countParticipants,
    instructionStatus,
    nextRound,
    type InstructionDetailView,
    type InstructionListItem,
    type InstructionParticipantView,
    type SessionUser,
} from '@app/domain';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from '../db/client.js';
import {
    areas,
    instructionDocuments,
    instructionParticipants,
    instructions,
    processes,
    users,
} from '../db/schema/index.js';
import { notFound } from '../http/errors.js';

export const today = (): string => new Date().toISOString().slice(0, 10);

type ParticipantRow = typeof instructionParticipants.$inferSelect;

const toParticipantView = (
    row: ParticipantRow,
    person: { displayName: string; mail: string | null; areaTitle: string | null } | undefined,
): InstructionParticipantView => ({
    id: row.id,
    user: {
        id: row.userId,
        displayName: person?.displayName ?? 'Unbekannt',
        mail: person?.mail ?? null,
        areaTitle: person?.areaTitle ?? null,
    },
    status: row.status as InstructionParticipantView['status'],
    notifiedAt: row.notifiedAt?.toISOString() ?? null,
    confirmedAt: row.confirmedAt?.toISOString() ?? null,
    notifyStatus: row.notifyStatus as InstructionParticipantView['notifyStatus'],
    hasMail: (person?.mail ?? null) !== null,
});

async function loadPeople(userIds: readonly string[]) {
    if (userIds.length === 0) return new Map<string, { displayName: string; mail: string | null; areaTitle: string | null }>();

    const rows = await db
        .select({ id: users.id, displayName: users.displayName, mail: users.mail, areaTitle: areas.title })
        .from(users)
        .leftJoin(areas, eq(areas.id, users.areaId))
        .where(inArray(users.id, [...userIds]));

    return new Map(rows.map((row) => [row.id, row]));
}

async function loadParticipants(instructionIds: readonly string[]): Promise<Map<string, ParticipantRow[]>> {
    if (instructionIds.length === 0) return new Map();

    const rows = await db
        .select()
        .from(instructionParticipants)
        .where(
            and(
                inArray(instructionParticipants.instructionId, [...instructionIds]),
                eq(instructionParticipants.isActive, true),
            ),
        );

    const byInstruction = new Map<string, ParticipantRow[]>();
    for (const row of rows) {
        byInstruction.set(row.instructionId, [...(byInstruction.get(row.instructionId) ?? []), row]);
    }
    return byInstruction;
}

type InstructionRow = typeof instructions.$inferSelect;

function toListItem(
    row: InstructionRow,
    process: { id: string; title: string; identifier: string | null },
    creator: { displayName: string; mail: string | null } | undefined,
    participants: readonly ParticipantRow[],
): InstructionListItem {
    const counts = countParticipants(
        participants.map((participant) => ({ status: participant.status as 'Offen' | 'Bestätigt' | 'Abgelehnt' })),
    );

    return {
        id: row.id,
        instructionType: row.instructionType as InstructionListItem['instructionType'],
        dueDate: row.dueDate,
        recurrence: row.recurrence as InstructionListItem['recurrence'],
        note: row.note,
        createdAt: row.createdAt.toISOString(),
        createdBy: creator ? { id: row.createdById, ...creator } : null,
        process,
        counts,
        status: instructionStatus(counts, row.dueDate, today()),
    };
}

export async function listInstructions(): Promise<{ items: InstructionListItem[] }> {
    const rows = await db
        .select({ instruction: instructions, process: processes })
        .from(instructions)
        .innerJoin(processes, eq(processes.id, instructions.processId))
        .where(eq(instructions.isActive, true))
        .orderBy(desc(instructions.createdAt));

    const participants = await loadParticipants(rows.map((row) => row.instruction.id));
    const people = await loadPeople(rows.map((row) => row.instruction.createdById));

    return {
        items: rows.map((row) =>
            toListItem(
                row.instruction,
                { id: row.process.id, title: row.process.title, identifier: row.process.identifier },
                people.get(row.instruction.createdById),
                participants.get(row.instruction.id) ?? [],
            ),
        ),
    };
}

/**
 * Der Tag, an dem die Runde durch war — die letzte Bestätigung. Fehlt auch nur eine Antwort, gibt
 * es keinen Abschlusstag und damit auch keinen Termin für die nächste Runde.
 */
function completionDay(participants: readonly ParticipantRow[]): string | null {
    if (participants.length === 0) return null;
    if (participants.some((participant) => participant.status !== 'Bestätigt')) return null;

    const last = participants.reduce<Date | null>(
        (latest, participant) =>
            participant.confirmedAt !== null && (latest === null || participant.confirmedAt > latest)
                ? participant.confirmedAt
                : latest,
        null,
    );
    return last?.toISOString().slice(0, 10) ?? null;
}

async function previousRoundOf(row: InstructionRow) {
    if (row.previousInstructionId === null) return null;

    const [previous] = await db
        .select({ id: instructions.id, dueDate: instructions.dueDate })
        .from(instructions)
        .where(eq(instructions.id, row.previousInstructionId))
        .limit(1);
    return previous ?? null;
}

export async function getInstruction(user: SessionUser, id: string): Promise<InstructionDetailView> {
    const [row] = await db
        .select({ instruction: instructions, process: processes })
        .from(instructions)
        .innerJoin(processes, eq(processes.id, instructions.processId))
        .where(and(eq(instructions.id, id), eq(instructions.isActive, true)))
        .limit(1);
    if (!row) throw notFound('Unterweisung nicht gefunden.');

    const participantRows = (await loadParticipants([id])).get(id) ?? [];
    const people = await loadPeople([...participantRows.map((p) => p.userId), row.instruction.createdById]);
    const [documents] = await db
        .select({ id: instructionDocuments.id })
        .from(instructionDocuments)
        .where(and(eq(instructionDocuments.instructionId, id), eq(instructionDocuments.isActive, true)))
        .limit(1);

    const participants = participantRows.map((participant) =>
        toParticipantView(participant, people.get(participant.userId)),
    );
    const documentCount = documents === undefined ? 0 : 1;
    const completedOn = completionDay(participantRows);
    const upcoming = completedOn === null ? null : nextRound(row.instruction.recurrence as never, completedOn);

    return {
        ...toListItem(
            row.instruction,
            { id: row.process.id, title: row.process.title, identifier: row.process.identifier },
            people.get(row.instruction.createdById),
            participantRows,
        ),
        participants,
        documentCount,
        ownParticipant: participants.find((participant) => participant.user.id === user.id) ?? null,
        previousRound: await previousRoundOf(row.instruction),
        nextRoundDueDate: upcoming?.dueDate ?? null,
        permissions: {
            canManage: canManageInstructions(user),
            // §7.3: mindestens ein hochgeladenes Dokument ist harte Vorbedingung für jedes Bestätigen
            // von Hand — sonst gibt es keinen Nachweis, auf den sich der Haken stützt.
            canConfirmForOthers:
                canManageInstructions(user) &&
                (row.instruction.instructionType === 'Einzel' || documentCount > 0),
        },
    };
}
