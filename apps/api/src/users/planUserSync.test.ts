import { describe, expect, it } from 'vitest';
import { planUserSync, type GroupMember, type KnownUser } from './planUserSync.js';

const member = (oid: string): GroupMember => ({ entraObjectId: oid, displayName: oid, mail: `${oid}@prettl.test` });
const known = (oid: string, isActive = true): KnownUser => ({ id: `id-${oid}`, entraObjectId: oid, isActive });

describe('planUserSync', () => {
    it('legt neue Gruppenmitglieder an', () => {
        const plan = planUserSync([member('a'), member('b')], [known('a')]);
        expect(plan.create.map((m) => m.entraObjectId)).toEqual(['b']);
    });

    it('deaktiviert, wer nicht mehr in der Gruppe ist', () => {
        const plan = planUserSync([member('a')], [known('a'), known('weg')]);
        expect(plan.deactivate).toEqual(['id-weg']);
    });

    it('nimmt Rückkehrer wieder auf, statt sie doppelt anzulegen', () => {
        const plan = planUserSync([member('a')], [known('a', false)]);
        expect(plan.reactivate).toEqual(['id-a']);
        expect(plan.create).toEqual([]);
    });

    it('lässt bekannte, aktive Mitglieder in Ruhe', () => {
        const plan = planUserSync([member('a')], [known('a')]);
        expect(plan).toEqual({ create: [], reactivate: [], deactivate: [] });
    });

    it('deaktiviert bei leerer Gruppe niemanden', () => {
        const plan = planUserSync([], [known('a'), known('b')]);
        expect(plan.deactivate).toEqual([]);
    });

    it('fasst bereits Deaktivierte nicht noch einmal an', () => {
        const plan = planUserSync([member('a')], [known('a'), known('alt', false)]);
        expect(plan.deactivate).toEqual([]);
        expect(plan.reactivate).toEqual([]);
    });

    describe('ignorierte Dienstkonten', () => {
        const ignored = new Set(['dienst']);

        it('werden nicht angelegt', () => {
            expect(planUserSync([member('a'), member('dienst')], [known('a')], ignored).create).toEqual([]);
        });

        it('werden nicht wieder eingeschaltet', () => {
            expect(planUserSync([member('dienst')], [known('dienst', false)], ignored).reactivate).toEqual([]);
        });

        it('werden nicht abgeschaltet', () => {
            expect(planUserSync([member('a')], [known('a'), known('dienst')], ignored).deactivate).toEqual([]);
        });

        it('lassen die übrigen Mitglieder unberührt', () => {
            const plan = planUserSync([member('neu'), member('dienst')], [known('weg')], ignored);
            expect(plan.create.map((m) => m.entraObjectId)).toEqual(['neu']);
            expect(plan.deactivate).toEqual(['id-weg']);
        });
    });
});
