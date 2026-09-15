import { describe, expect, it } from 'vitest';
import { resolveVersionChoice } from './versionChoice.js';
import type { SessionUser } from './permissions.js';

const user = (overrides: Partial<SessionUser> = {}): SessionUser => ({
    id: 'user-1',
    entraObjectId: 'oid',
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

const withDraft = { hasActiveDraft: true, areaId: 'area-1', authorId: 'author-1' };
const released = { hasActiveDraft: false, areaId: 'area-1', authorId: 'author-1' };

describe('resolveVersionChoice', () => {
    it('zeigt ohne Entwurf immer die freigegebene Ausgabe', () => {
        expect(resolveVersionChoice(user({ isAdministrator: true }), released)).toEqual({
            showsDraft: false,
            hasHiddenDraft: false,
        });
    });

    it('öffnet den Entwurf für Admin, Verfasser dieses Prozesses und den PV des Bereichs', () => {
        const allowed = [
            user({ isAdministrator: true }),
            user({ id: 'author-1', isAuthor: true }),
            user({ isProcessOwner: true, ledAreaIds: ['area-1'] }),
        ];
        for (const person of allowed) {
            expect(resolveVersionChoice(person, withDraft).showsDraft).toBe(true);
        }
    });

    // Canvas-Defekt 2: dort öffnet jeder Verfasser jeden Entwurf.
    it('zeigt einem fremden Verfasser die freigegebene Ausgabe, nicht den Entwurf', () => {
        const choice = resolveVersionChoice(user({ id: 'other', isAuthor: true }), withDraft);
        expect(choice).toEqual({ showsDraft: false, hasHiddenDraft: true });
    });

    it('zeigt dem QM die freigegebene Ausgabe — QM prüft formell, es verfasst nicht', () => {
        expect(resolveVersionChoice(user({ isQm: true }), withDraft).showsDraft).toBe(false);
    });

    it('meldet einen verborgenen Entwurf nur, wenn es einen gibt', () => {
        expect(resolveVersionChoice(user(), released).hasHiddenDraft).toBe(false);
        expect(resolveVersionChoice(user(), withDraft).hasHiddenDraft).toBe(true);
    });
});
