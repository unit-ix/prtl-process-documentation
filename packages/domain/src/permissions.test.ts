import { describe, expect, it } from 'vitest';
import {
    canApproveContent,
    canApproveFormal,
    canAssignAuthor,
    canCreateProcess,
    canDeleteProcess,
    canEditContent,
    canManageInstructions,
    canReopen,
    canSeeApprovalTab,
    canSeeQualifications,
    canSeeSettings,
    canSubmit,
    hasAnyRole,
    leadsArea,
    type SessionUser,
} from './permissions.js';
import type { ProcessStatus } from './enums.js';

const AREA = 'area-1';
const OTHER_AREA = 'area-2';

const user = (overrides: Partial<SessionUser> = {}): SessionUser => ({
    id: 'user-1',
    entraObjectId: 'oid-1',
    displayName: 'Test',
    mail: null,
    isAuthor: false,
    isProcessOwner: false,
    isQm: false,
    isAdministrator: false,
    area: null,
    isActive: true,
    ledAreaIds: [],
    ...overrides,
});

const admin = user({ isAdministrator: true });
const qm = user({ id: 'qm-1', isQm: true });
const pvOfArea = user({ id: 'pv-1', isProcessOwner: true, ledAreaIds: [AREA] });
const pvOfOtherArea = user({ id: 'pv-2', isProcessOwner: true, ledAreaIds: [OTHER_AREA] });
const author = user({ id: 'author-1', isAuthor: true });
const stranger = user({ id: 'stranger-1' });

const process = (status: ProcessStatus, authorId: string | null = author.id) => ({
    status,
    area: { id: AREA },
    author: authorId === null ? null : { id: authorId },
});

const version = (status: ProcessStatus, authorId: string | null = author.id) => ({
    status,
    author: authorId === null ? null : { id: authorId },
});

describe('leadsArea', () => {
    it('trifft nur den geführten Bereich', () => {
        expect(leadsArea(pvOfArea, AREA)).toBe(true);
        expect(leadsArea(pvOfArea, OTHER_AREA)).toBe(false);
        expect(leadsArea(admin, AREA)).toBe(false);
    });
});

describe('canCreateProcess', () => {
    it('erlaubt Admin und Prozessverantwortlichen, sonst niemandem', () => {
        expect(canCreateProcess(admin)).toBe(true);
        expect(canCreateProcess(pvOfArea)).toBe(true);
        expect(canCreateProcess(qm)).toBe(false);
        expect(canCreateProcess(author)).toBe(false);
    });
});

describe('canAssignAuthor', () => {
    it('nur im Backlog', () => {
        expect(canAssignAuthor(admin, process('backlog'))).toBe(true);
        expect(canAssignAuthor(admin, process('in_capture'))).toBe(false);
    });

    it('der PV nur im eigenen Bereich', () => {
        expect(canAssignAuthor(pvOfArea, process('backlog'))).toBe(true);
        expect(canAssignAuthor(pvOfOtherArea, process('backlog'))).toBe(false);
    });
});

describe('canEditContent', () => {
    it('nur in backlog und in_capture', () => {
        expect(canEditContent(admin, process('backlog'), version('backlog'))).toBe(true);
        expect(canEditContent(admin, process('in_capture'), version('in_capture'))).toBe(true);
        expect(canEditContent(admin, process('content_review'), version('content_review'))).toBe(false);
        expect(canEditContent(admin, process('formal_review'), version('formal_review'))).toBe(false);
        expect(canEditContent(admin, process('approved'), version('approved'))).toBe(false);
    });

    // Canvas-Defekt 1: dort bindet || lockerer als &&, wodurch der passende Status allein genügte.
    it('lässt einen Fremden auch bei passendem Status nicht editieren', () => {
        expect(canEditContent(stranger, process('in_capture'), version('in_capture'))).toBe(false);
        expect(canEditContent(pvOfOtherArea, process('in_capture'), version('in_capture'))).toBe(false);
    });

    it('erlaubt dem Verfasser dieses Prozesses und dem PV des Bereichs', () => {
        expect(canEditContent(author, process('in_capture'), version('in_capture'))).toBe(true);
        expect(canEditContent(pvOfArea, process('in_capture'), version('in_capture'))).toBe(true);
    });
});

describe('canSubmit', () => {
    it('nur aus in_capture und nur durch Verfasser oder Admin', () => {
        expect(canSubmit(author, version('in_capture'))).toBe(true);
        expect(canSubmit(admin, version('in_capture'))).toBe(true);
        expect(canSubmit(stranger, version('in_capture'))).toBe(false);
        expect(canSubmit(author, version('content_review'))).toBe(false);
    });
});

describe('canApproveContent', () => {
    it('nur aus content_review, nur Admin oder PV des Bereichs', () => {
        expect(canApproveContent(pvOfArea, process('content_review'), version('content_review'))).toBe(true);
        expect(canApproveContent(admin, process('content_review'), version('content_review'))).toBe(true);
        expect(canApproveContent(pvOfOtherArea, process('content_review'), version('content_review'))).toBe(false);
        expect(canApproveContent(qm, process('content_review'), version('content_review'))).toBe(false);
        expect(canApproveContent(pvOfArea, process('formal_review'), version('formal_review'))).toBe(false);
    });
});

describe('canApproveFormal', () => {
    it('nur aus formal_review, nur QM oder Admin', () => {
        expect(canApproveFormal(qm, version('formal_review'))).toBe(true);
        expect(canApproveFormal(admin, version('formal_review'))).toBe(true);
        expect(canApproveFormal(pvOfArea, version('formal_review'))).toBe(false);
        expect(canApproveFormal(qm, version('content_review'))).toBe(false);
    });
});

describe('canReopen', () => {
    it('nur aus approved, nur Admin, Verfasser der Ausgabe oder PV des Bereichs', () => {
        expect(canReopen(author, process('approved'), version('approved'))).toBe(true);
        expect(canReopen(pvOfArea, process('approved'), version('approved'))).toBe(true);
        expect(canReopen(admin, process('approved'), version('approved'))).toBe(true);
        expect(canReopen(qm, process('approved'), version('approved'))).toBe(false);
        expect(canReopen(author, process('in_capture'), version('in_capture'))).toBe(false);
    });
});

describe('Sicht-Prädikate', () => {
    it('canDeleteProcess und canManageInstructions: Admin oder PV', () => {
        for (const predicate of [canDeleteProcess, canManageInstructions]) {
            expect(predicate(admin)).toBe(true);
            expect(predicate(pvOfArea)).toBe(true);
            expect(predicate(qm)).toBe(false);
            expect(predicate(author)).toBe(false);
        }
    });

    it('canSeeQualifications: Admin oder PV des Bereichs dieses Mitarbeiters', () => {
        const employee = { area: { id: AREA } };
        expect(canSeeQualifications(admin, employee)).toBe(true);
        expect(canSeeQualifications(pvOfArea, employee)).toBe(true);
        expect(canSeeQualifications(pvOfOtherArea, employee)).toBe(false);
        expect(canSeeQualifications(qm, employee)).toBe(false);
        expect(canSeeQualifications(pvOfArea, { area: null })).toBe(false);
    });

    it('canSeeApprovalTab: Admin, QM oder PV', () => {
        expect(canSeeApprovalTab(admin)).toBe(true);
        expect(canSeeApprovalTab(qm)).toBe(true);
        expect(canSeeApprovalTab(pvOfArea)).toBe(true);
        expect(canSeeApprovalTab(author)).toBe(false);
    });

    it('canSeeSettings: nur Admin oder QM', () => {
        expect(canSeeSettings(admin)).toBe(true);
        expect(canSeeSettings(qm)).toBe(true);
        expect(canSeeSettings(pvOfArea)).toBe(false);
        expect(canSeeSettings(author)).toBe(false);
    });

    it('hasAnyRole: vier Flags aus heisst kein Zugriff', () => {
        expect(hasAnyRole(stranger)).toBe(false);
        for (const role of [admin, qm, pvOfArea, author]) expect(hasAnyRole(role)).toBe(true);
    });
});
