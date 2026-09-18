// §7.8 — der Teil, den Canvas nie gebaut hat: der Turnus öffnet wirklich die nächste Runde.
//
// Zustandsgetrieben wie der Mail-Sweep: gesucht wird „welche abgeschlossene Unterweisung hat noch
// keine Nachfolgerin und ist fällig", nie „was war heute früh dran". Ein Lauf, der durch ein
// Deployment ausfällt, wird vom nächsten einfach mit erledigt — auch Tage später.
import { isDueForNextRound, type Recurrence } from '@app/domain';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { instructionParticipants, instructions, users } from '../db/schema/index.js';

interface Candidate {
    readonly id: string;
    readonly processId: string;
    readonly instructionType: string;
    readonly recurrence: string;
    readonly note: string | null;
    readonly createdById: string;
    readonly completedOn: string | null;
    readonly hasSuccessor: boolean;
}

/**
 * Abschlusstag = die letzte Bestätigung. Steht auch nur eine Antwort aus, ist die Runde nicht
 * abgeschlossen und completedOn bleibt null — dann öffnet nichts Neues, genau wie besprochen.
 */
const completedOn = sql<string | null>`(
    select case when count(*) filter (where p.status <> 'Bestätigt') = 0
                then to_char(max(p.confirmed_at), 'YYYY-MM-DD') end
    from instruction_participants p
    where p.instruction_id = instructions.id and p.is_active
)`;

const hasSuccessor = sql<boolean>`exists (
    select 1 from instructions successor where successor.previous_instruction_id = instructions.id
)`;

async function candidates(): Promise<Candidate[]> {
    return db
        .select({
            id: instructions.id,
            processId: instructions.processId,
            instructionType: instructions.instructionType,
            recurrence: instructions.recurrence,
            note: instructions.note,
            createdById: instructions.createdById,
            completedOn,
            hasSuccessor,
        })
        .from(instructions)
        .where(and(eq(instructions.isActive, true), sql`${instructions.recurrence} <> 'Keine Wiederholung'`));
}

/**
 * Teilnehmer der Vorrunde, ohne die inzwischen deaktivierten. Wer nicht mehr im Unternehmen ist,
 * wird nicht erneut unterwiesen.
 */
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function carryOverParticipants(tx: Tx, instructionId: string) {
    return tx
        .select({ userId: instructionParticipants.userId, mail: users.mail })
        .from(instructionParticipants)
        .innerJoin(users, eq(users.id, instructionParticipants.userId))
        .where(
            and(
                eq(instructionParticipants.instructionId, instructionId),
                eq(instructionParticipants.isActive, true),
                eq(users.isActive, true),
            ),
        );
}

async function openRound(candidate: Candidate, dueDate: string): Promise<string | null> {
    return db.transaction(async (tx) => {
        const participants = await carryOverParticipants(tx, candidate.id);
        if (participants.length === 0) return null;

        const [round] = await tx
            .insert(instructions)
            .values({
                processId: candidate.processId,
                instructionType: candidate.instructionType,
                recurrence: candidate.recurrence,
                dueDate,
                note: candidate.note,
                createdById: candidate.createdById,
                // Der eindeutige Index auf dieser Spalte ist der eigentliche Schutz vor einer
                // zweiten Folgerunde — zwei gleichzeitige Läufe können hier nicht beide gewinnen.
                previousInstructionId: candidate.id,
            })
            .returning({ id: instructions.id });

        await tx.insert(instructionParticipants).values(
            participants.map((participant) => ({
                instructionId: round.id,
                userId: participant.userId,
                // Ohne Adresse gibt es nichts zu versenden; die Zeile bleibt sichtbar offen,
                // statt in der Warteschlange zu verhungern.
                notifyStatus: participant.mail === null ? null : ('In Bearbeitung' as const),
            })),
        );

        return round.id;
    });
}

export async function openNextRounds(today: string): Promise<{ opened: number }> {
    let opened = 0;

    for (const candidate of await candidates()) {
        const due = isDueForNextRound(
            {
                recurrence: candidate.recurrence as Recurrence,
                completedOn: candidate.completedOn,
                hasSuccessor: candidate.hasSuccessor,
            },
            today,
        );
        if (due === null) continue;

        const created = await openRound(candidate, due.dueDate);
        if (created !== null) {
            opened += 1;
            console.log(`[unterweisung] Folgerunde zu ${candidate.id} angelegt, Frist ${due.dueDate}.`);
        }
    }

    return { opened };
}
