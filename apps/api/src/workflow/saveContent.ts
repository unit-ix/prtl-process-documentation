// §9.4 Speichern und §8.3 Autosave. Zwei Eigenschaften hängen daran: Inhalte gehen IMMER in die
// Version, nie in die Hülle (die schreibt allein die Freigabe), und ein zweiter Bearbeiter bekommt
// eine klare Meldung statt eines stillen Überschreibens.
import { canEditContent, richTextToPlainText, type RichDocument, type SessionUser } from '@app/domain';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import { processAdditionalFields, processes, processLinks, processVersions } from '../db/schema/index.js';
import { ApiError, badRequest, notFound } from '../http/errors.js';
import { assertAllowed, lockTarget, type Tx } from './context.js';

const richDocument = z.record(z.string(), z.unknown());

const EDITABLE_STATUSES = ['backlog', 'in_capture'];

export const saveContentSchema = z
    .object({
        rowVersion: z.number().int().positive(),
        title: z.string().trim().min(1).max(400).optional(),
        shortDescription: z.string().trim().max(4000).nullish(),
        specificationType: z.enum(['VA', 'AA']).optional(),
        templateType: z.enum(['IMS', 'PROD']).optional(),
        scope: z.enum(['PE', 'PER', 'PEL']).nullish(),
        confidentiality: z.enum(['Öffentlich', 'Intern', 'Vertraulich']).nullish(),
        parentProcessId: z.string().uuid().nullish(),
        purpose: z.string().nullish(),
        scopeDetail: z.string().nullish(),
        terms: z.string().nullish(),
        descriptionDoc: richDocument.nullish(),
        responsibilities: z.string().nullish(),
        workSequence: z.string().nullish(),
        method: z.string().nullish(),
        processParameters: z.string().nullish(),
        documentationRef: z.string().nullish(),
        deviationHandling: z.string().nullish(),
        maintenanceRef: z.string().nullish(),
        additionalFields: z.array(z.object({ id: z.string().uuid(), value: z.string().nullish() })).optional(),
        links: z
            .array(
                z
                    .object({
                        linkType: z.enum(['InternerProzess', 'ExternesDokument']),
                        linkedProcessId: z.string().uuid().nullish(),
                        title: z.string().trim().max(400).nullish(),
                        url: z.string().trim().url().max(2000).nullish(),
                    })
                    .strict(),
            )
            .optional(),
    })
    .strict();

export type SaveContentInput = z.infer<typeof saveContentSchema>;

const SHELL_KEYS = [
    'title',
    'shortDescription',
    'specificationType',
    'templateType',
    'scope',
    'confidentiality',
    'parentProcessId',
] as const;

const VERSION_KEYS = [
    'purpose',
    'scopeDetail',
    'terms',
    'responsibilities',
    'workSequence',
    'method',
    'processParameters',
    'documentationRef',
    'deviationHandling',
    'maintenanceRef',
] as const;

const pick = (input: SaveContentInput, keys: readonly string[]): Record<string, unknown> =>
    Object.fromEntries(
        keys
            .filter((key) => key in input)
            .map((key) => [key, (input as Record<string, unknown>)[key] ?? null]),
    );

export const conflict = (detail: string): ApiError => new ApiError(409, 'conflict', detail);

const CONFLICT_MESSAGE =
    'Diese Ausgabe wurde zwischenzeitlich von jemand anderem gespeichert. Bitte laden Sie die Seite neu — Ihre Eingaben bleiben im Editor erhalten.';

interface EditableTarget {
    readonly process: Awaited<ReturnType<typeof lockTarget>>['process'];
    readonly version: Awaited<ReturnType<typeof lockTarget>>['version'];
}

function assertEditable(user: SessionUser, { process, version }: EditableTarget, rowVersion: number): void {
    assertAllowed(
        canEditContent(
            user,
            {
                status: process.status as never,
                area: { id: process.areaId },
                author: process.authorId === null ? null : { id: process.authorId },
            },
            {
                status: version.status as never,
                author: version.authorId === null ? null : { id: version.authorId },
            },
        ),
    );

    if (!EDITABLE_STATUSES.includes(version.status)) {
        throw conflict('Diese Ausgabe ist in Prüfung oder freigegeben und kann nicht mehr bearbeitet werden.');
    }
    if (version.rowVersion !== rowVersion) throw conflict(CONFLICT_MESSAGE);
}

async function saveAdditionalFields(
    tx: Tx,
    versionId: string,
    fields: SaveContentInput['additionalFields'],
): Promise<void> {
    for (const field of fields ?? []) {
        const updated = await tx
            .update(processAdditionalFields)
            .set({ value: field.value ?? null })
            .where(
                and(
                    eq(processAdditionalFields.id, field.id),
                    eq(processAdditionalFields.processVersionId, versionId),
                ),
            )
            .returning({ id: processAdditionalFields.id });
        if (updated.length === 0) throw notFound(`Zusatzfeld ${field.id} gehört nicht zu dieser Ausgabe.`);
    }
}

// Mitgeltende Unterlagen sind versionsgebundener Inhalt ohne eigene Historie: beim Speichern wird
// die Liste ersetzt, nicht abgeglichen. Das hält die Regel einfach und verhindert Waisen.
async function replaceLinks(tx: Tx, versionId: string, links: SaveContentInput['links']): Promise<void> {
    if (links === undefined) return;

    await tx.delete(processLinks).where(eq(processLinks.processVersionId, versionId));
    if (links.length === 0) return;

    for (const link of links) {
        if (link.linkType === 'InternerProzess' && !link.linkedProcessId) {
            throw badRequest('Eine interne Verknüpfung braucht einen Prozess.');
        }
        if (link.linkType === 'ExternesDokument' && !link.url) {
            throw badRequest('Ein externes Dokument braucht eine Adresse.');
        }
    }

    await tx.insert(processLinks).values(
        links.map((link) => ({
            processVersionId: versionId,
            linkType: link.linkType,
            linkedProcessId: link.linkedProcessId ?? null,
            title: link.title ?? null,
            url: link.url ?? null,
        })),
    );
}

export async function saveContent(user: SessionUser, processId: string, input: SaveContentInput) {
    return db.transaction(async (tx) => {
        const target = await lockTarget(tx, processId);
        assertEditable(user, target, input.rowVersion);

        const descriptionPatch =
            'descriptionDoc' in input
                ? {
                      descriptionDoc: (input.descriptionDoc ?? null) as RichDocument | null,
                      descriptionText: richTextToPlainText(input.descriptionDoc as RichDocument | null),
                  }
                : {};

        const [version] = await tx
            .update(processVersions)
            .set({
                ...pick(input, VERSION_KEYS),
                ...descriptionPatch,
                rowVersion: target.version.rowVersion + 1,
                updatedAt: new Date(),
            })
            .where(eq(processVersions.id, target.version.id))
            .returning({ rowVersion: processVersions.rowVersion });

        const shellPatch = pick(input, SHELL_KEYS);
        if (Object.keys(shellPatch).length > 0) {
            if (shellPatch.parentProcessId === processId) throw badRequest('Ein Prozess kann nicht sich selbst übergeordnet sein.');
            await tx.update(processes).set(shellPatch).where(eq(processes.id, processId));
        }

        await saveAdditionalFields(tx, target.version.id, input.additionalFields);
        await replaceLinks(tx, target.version.id, input.links);

        return { rowVersion: version.rowVersion };
    });
}
