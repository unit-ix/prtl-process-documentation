// §7.3 — Bestätigen direkt aus der Mail, ohne Anmeldung. Der gefährlichste Endpoint der Anwendung,
// deshalb drei Eigenschaften, die nicht verhandelbar sind:
//
// 1. ZWEISTUFIG. Outlook Safe Links und Defender for Office rufen Adressen in eingehenden Mails
//    VORAB auf. Ein einziger GET, der schreibt, würde jede Unterweisung vom Virenscanner des
//    Kunden bestätigen lassen — mit plausibler Uhrzeit, bevor ein Mensch die Mail öffnet. Der GET
//    zeigt nur an, geschrieben wird per POST.
// 2. Das Token steht nur als sha256-Hash in der Datenbank, ist einmal verwendbar und läuft ab.
// 3. Eine Antwort für alles: unbekannt, abgelaufen, schon benutzt. Sonst verrät der Endpoint,
//    welche Token existieren.
import { and, eq, gt, isNull } from 'drizzle-orm';
import { db } from './../db/client.js';
import { instructionParticipants, instructions, processes, users } from './../db/schema/index.js';
import { hashToken } from './instructionWrites.js';

export interface ConfirmPageData {
    readonly valid: boolean;
    readonly processTitle?: string;
    readonly displayName?: string;
    readonly alreadyAnswered?: boolean;
}

async function findByToken(token: string) {
    const [row] = await db
        .select({
            participant: instructionParticipants,
            processTitle: processes.title,
            displayName: users.displayName,
        })
        .from(instructionParticipants)
        .innerJoin(instructions, eq(instructions.id, instructionParticipants.instructionId))
        .innerJoin(processes, eq(processes.id, instructions.processId))
        .innerJoin(users, eq(users.id, instructionParticipants.userId))
        .where(
            and(
                eq(instructionParticipants.confirmTokenHash, hashToken(token)),
                eq(instructionParticipants.isActive, true),
                isNull(instructionParticipants.consumedAt),
                gt(instructionParticipants.confirmTokenExpiresAt, new Date()),
            ),
        )
        .limit(1);

    return row;
}

export async function confirmPage(token: string): Promise<ConfirmPageData> {
    const row = await findByToken(token);
    if (!row) return { valid: false };

    return {
        valid: true,
        processTitle: row.processTitle,
        displayName: row.displayName,
        alreadyAnswered: row.participant.status !== 'Offen',
    };
}

export interface ConfirmResult {
    readonly ok: boolean;
    readonly answer?: 'yes' | 'no';
}

export async function submitConfirmation(
    token: string,
    answer: 'yes' | 'no',
    evidence: { ip: string | null; userAgent: string | null },
): Promise<ConfirmResult> {
    const row = await findByToken(token);
    if (!row) return { ok: false };

    const now = new Date();
    await db
        .update(instructionParticipants)
        .set({
            status: answer === 'yes' ? 'Bestätigt' : 'Abgelehnt',
            confirmedAt: answer === 'yes' ? now : null,
            consumedAt: now,
            confirmTokenHash: null,
            notifyStatus: 'Fertig',
            sourceIp: evidence.ip,
            userAgent: evidence.userAgent?.slice(0, 400) ?? null,
        })
        .where(eq(instructionParticipants.id, row.participant.id));

    return { ok: true, answer };
}
