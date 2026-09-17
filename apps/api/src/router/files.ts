// §7.9 — dreistufig, weil die Datei direkt zwischen Browser und Blob läuft: die API sieht sie nie
// (Body-Limit 64 KB, Proxy-Wand bei 45 s). Schritt 3 prüft die ECHTE Größe am Blob; zwei Schritte
// wären kürzer, dann ist die Größe aber nur eine Behauptung des Clients.
import type { SessionUser } from '@app/domain';
import { randomUUID } from 'node:crypto';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import {
    instructionDocuments,
    instructions,
    processDocuments,
    qualificationDocuments,
    qualifications,
} from '../db/schema/index.js';
import { badRequest, forbidden, notFound } from '../http/errors.js';
import { blobName, properties, readSas, remove, uploadSas } from '../storage/blob.js';
import { isAllowedType, isInlineType, MAX_FILE_BYTES } from './fileTypes.js';
import { canSeeProcess } from './processScope.js';

const OWNERS = ['process', 'instruction', 'qualification'] as const;
type Owner = (typeof OWNERS)[number];

const TABLES = {
    process: processDocuments,
    instruction: instructionDocuments,
    qualification: qualificationDocuments,
} as const;

const OWNER_COLUMN = {
    process: processDocuments.processId,
    instruction: instructionDocuments.instructionId,
    qualification: qualificationDocuments.qualificationId,
} as const;

export const uploadUrlSchema = z
    .object({
        owner: z.enum(OWNERS),
        ownerId: z.string().uuid(),
        contentType: z.string().min(1),
    })
    .strict();

export const commitSchema = z
    .object({
        fileId: z.string().uuid(),
        owner: z.enum(OWNERS),
        ownerId: z.string().uuid(),
        fileName: z.string().trim().min(1).max(400),
        contentType: z.string().min(1),
    })
    .strict();

export interface FileView {
    id: string;
    fileName: string;
    contentType: string;
    sizeBytes: number;
    uploadedAt: string;
    uploadedBy: { id: string } | null;
    isInline: boolean;
}

async function assertOwnerAccess(user: SessionUser, owner: Owner, ownerId: string): Promise<void> {
    if (owner === 'process') {
        if (!(await canSeeProcess(user, ownerId))) throw notFound('Prozess nicht gefunden.');
        return;
    }

    const table = owner === 'instruction' ? instructions : qualifications;
    const [row] = await db.select({ id: table.id }).from(table).where(eq(table.id, ownerId)).limit(1);
    if (!row) throw notFound('Datensatz nicht gefunden.');
    if (owner === 'qualification' && !user.isAdministrator && !user.isProcessOwner) {
        throw forbidden('Qualifikationsnachweise sind nur für Administration und Bereichsleitung.');
    }
}

export async function createUploadUrl(user: SessionUser, input: z.infer<typeof uploadUrlSchema>) {
    if (!isAllowedType(input.contentType)) {
        throw badRequest('Dieser Dateityp ist nicht erlaubt. Erlaubt sind Bilder, PDF, Word und Excel.');
    }
    await assertOwnerAccess(user, input.owner, input.ownerId);

    const fileId = randomUUID();
    const { url } = await uploadSas(blobName(user.entraObjectId, fileId));
    return { fileId, uploadUrl: url };
}

export async function commitFile(user: SessionUser, input: z.infer<typeof commitSchema>): Promise<FileView> {
    await assertOwnerAccess(user, input.owner, input.ownerId);
    const name = blobName(user.entraObjectId, input.fileId);
    const blob = await properties(name);

    const size = blob.contentLength ?? 0;
    if (size === 0 || size > MAX_FILE_BYTES || !isAllowedType(input.contentType)) {
        await remove(name);
        throw badRequest('Die Datei ist zu groß oder hat einen unerlaubten Typ.');
    }

    const table = TABLES[input.owner];
    const [row] = await db
        .insert(table)
        .values({
            id: input.fileId,
            [input.owner === 'process' ? 'processId' : input.owner === 'instruction' ? 'instructionId' : 'qualificationId']:
                input.ownerId,
            fileName: input.fileName,
            blobPath: name,
            contentType: input.contentType,
            sizeBytes: size,
            uploadedById: user.id,
        } as never)
        .returning();

    return toFileView(row as never);
}

const toFileView = (row: {
    id: string;
    fileName: string;
    contentType: string;
    sizeBytes: number;
    uploadedAt: Date;
    uploadedById: string;
}): FileView => ({
    id: row.id,
    fileName: row.fileName,
    contentType: row.contentType,
    sizeBytes: row.sizeBytes,
    uploadedAt: row.uploadedAt.toISOString(),
    uploadedBy: { id: row.uploadedById },
    isInline: isInlineType(row.contentType),
});

export async function listFiles(user: SessionUser, owner: Owner, ownerId: string): Promise<{ items: FileView[] }> {
    await assertOwnerAccess(user, owner, ownerId);
    const table = TABLES[owner];
    const rows = await db
        .select()
        .from(table)
        .where(and(eq(OWNER_COLUMN[owner], ownerId), eq(table.isActive, true)))
        .orderBy(desc(table.uploadedAt));

    return { items: rows.map((row) => toFileView(row as never)) };
}

async function findFile(fileId: string) {
    for (const owner of OWNERS) {
        const table = TABLES[owner];
        const [row] = await db.select().from(table).where(eq(table.id, fileId)).limit(1);
        if (row) return { owner, row: row as never as {
            id: string;
            fileName: string;
            blobPath: string;
            contentType: string;
            isActive: boolean;
        } & Record<string, string> };
    }
    throw notFound('Datei nicht gefunden.');
}

/** Der Weg zum SAS führt IMMER durch die Datenbankzeile: gibt es sie nicht, gibt es keinen SAS. */
export async function fileUrl(user: SessionUser, fileId: string): Promise<{ url: string }> {
    const { owner, row } = await findFile(fileId);
    if (!row.isActive) throw notFound('Datei nicht gefunden.');
    const ownerId = row[owner === 'process' ? 'processId' : owner === 'instruction' ? 'instructionId' : 'qualificationId'];
    await assertOwnerAccess(user, owner, ownerId);

    const { url } = await readSas(row.blobPath, row.fileName, row.contentType);
    return { url };
}

/** Erst die Zeile, dann der Blob — die umgekehrte Reihenfolge hinterlässt eine Zeile ohne Datei. */
export async function deleteFile(user: SessionUser, fileId: string): Promise<void> {
    const { owner, row } = await findFile(fileId);
    const ownerId = row[owner === 'process' ? 'processId' : owner === 'instruction' ? 'instructionId' : 'qualificationId'];
    await assertOwnerAccess(user, owner, ownerId);

    await db.update(TABLES[owner]).set({ isActive: false }).where(eq(TABLES[owner].id, fileId));
    await remove(row.blobPath);
}

export const isOwner = (value: string): value is Owner => (OWNERS as readonly string[]).includes(value);
