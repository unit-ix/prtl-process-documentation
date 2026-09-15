import {
    canSeeQualifications,
    isExpired,
    type EmployeeDetailView,
    type EmployeeListItem,
    type QualificationView,
    type SessionUser,
    type UserTaskView,
} from '@app/domain';
import { and, asc, eq, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import {
    areas,
    instructionParticipants,
    instructions,
    processes,
    qualificationDocuments,
    qualifications,
    users,
    userTasks,
} from '../db/schema/index.js';
import { notFound } from '../http/errors.js';
import { today } from './instructions.js';

export async function listEmployees(): Promise<{ items: EmployeeListItem[] }> {
    const rows = await db
        .select({
            id: users.id,
            displayName: users.displayName,
            mail: users.mail,
            areaTitle: areas.title,
            instructionCount: sql<number>`(
                select count(*) from ${instructionParticipants}
                where ${instructionParticipants.userId} = ${users.id}
                  and ${instructionParticipants.status} = 'Bestätigt'
                  and ${instructionParticipants.isActive}
            )::int`,
            qualificationCount: sql<number>`(
                select count(*) from ${qualifications}
                where ${qualifications.userId} = ${users.id}
                  and ${qualifications.isActive}
                  and (${qualifications.expiresAt} is null or ${qualifications.expiresAt} >= current_date)
            )::int`,
            taskCount: sql<number>`(
                select count(*) from ${userTasks}
                where ${userTasks.userId} = ${users.id} and ${userTasks.isActive}
            )::int`,
        })
        .from(users)
        .leftJoin(areas, eq(areas.id, users.areaId))
        .where(eq(users.isActive, true))
        .orderBy(asc(sql`${users.displayName} collate "de-DE-x-icu"`));

    return { items: rows };
}

async function loadQualifications(userId: string): Promise<QualificationView[]> {
    const rows = await db
        .select({
            id: qualifications.id,
            title: qualifications.title,
            description: qualifications.description,
            acquiredAt: qualifications.acquiredAt,
            expiresAt: qualifications.expiresAt,
            skillPoints: qualifications.skillPoints,
            documentCount: sql<number>`(
                select count(*) from ${qualificationDocuments}
                where ${qualificationDocuments.qualificationId} = ${qualifications.id}
                  and ${qualificationDocuments.isActive}
            )::int`,
        })
        .from(qualifications)
        .where(and(eq(qualifications.userId, userId), eq(qualifications.isActive, true)))
        .orderBy(asc(sql`${qualifications.title} collate "de-DE-x-icu"`));

    return rows.map((row) => ({ ...row, isExpired: isExpired(row.expiresAt, today()) }));
}

async function loadTasks(userId: string): Promise<UserTaskView[]> {
    return db
        .select({ id: userTasks.id, title: userTasks.title, description: userTasks.description })
        .from(userTasks)
        .where(and(eq(userTasks.userId, userId), eq(userTasks.isActive, true)))
        .orderBy(asc(sql`${userTasks.title} collate "de-DE-x-icu"`));
}

async function loadConfirmedInstructions(employeeId: string) {
    return db
        .select({
            id: instructionParticipants.id,
            confirmedAt: instructionParticipants.confirmedAt,
            processId: processes.id,
            processTitle: processes.title,
            processIdentifier: processes.identifier,
        })
        .from(instructionParticipants)
        .innerJoin(instructions, eq(instructions.id, instructionParticipants.instructionId))
        .innerJoin(processes, eq(processes.id, instructions.processId))
        .where(
            and(
                eq(instructionParticipants.userId, employeeId),
                eq(instructionParticipants.status, 'Bestätigt'),
                eq(instructionParticipants.isActive, true),
            ),
        );
}

export async function getEmployee(user: SessionUser, employeeId: string): Promise<EmployeeDetailView> {
    const [employee] = await db
        .select({
            id: users.id,
            displayName: users.displayName,
            mail: users.mail,
            areaId: users.areaId,
            areaTitle: areas.title,
        })
        .from(users)
        .leftJoin(areas, eq(areas.id, users.areaId))
        .where(and(eq(users.id, employeeId), eq(users.isActive, true)))
        .limit(1);
    if (!employee) throw notFound('Mitarbeiter nicht gefunden.');

    const maySee = canSeeQualifications(user, {
        area: employee.areaId === null ? null : { id: employee.areaId },
    });

    const confirmed = await loadConfirmedInstructions(employeeId);

    return {
        employee: {
            id: employee.id,
            displayName: employee.displayName,
            mail: employee.mail,
            areaTitle: employee.areaTitle,
        },
        instructions: confirmed.map((row) => ({
            id: row.id,
            confirmedAt: row.confirmedAt?.toISOString() ?? null,
            process: { id: row.processId, title: row.processTitle, identifier: row.processIdentifier },
        })),
        tasks: await loadTasks(employeeId),
        // Die eine echte Zugriffsbeschränkung im Produkt: ohne Recht kommen die Daten gar nicht
        // erst über die Leitung, statt in der Oberfläche ausgeblendet zu werden (§7.5).
        qualifications: maySee ? await loadQualifications(employeeId) : null,
        canManage: maySee,
    };
}
