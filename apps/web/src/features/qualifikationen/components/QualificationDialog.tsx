import type { QualificationView } from '@app/domain';
import { useEffect, useState } from 'react';
import { peopleRepository } from '@/data';
import { Button } from '@/shared/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { useEmployeeMutation } from '../hooks/usePeople';

interface Draft {
    title: string;
    description: string;
    acquiredAt: string;
    expiresAt: string;
    skillPoints: string;
}

const EMPTY: Draft = { title: '', description: '', acquiredAt: '', expiresAt: '', skillPoints: '' };

const fromView = (view: QualificationView): Draft => ({
    title: view.title,
    description: view.description ?? '',
    acquiredAt: view.acquiredAt ?? '',
    expiresAt: view.expiresAt ?? '',
    skillPoints: view.skillPoints === null ? '' : String(view.skillPoints),
});

interface QualificationDialogProps {
    userId: string;
    open: boolean;
    existing: QualificationView | null;
    onClose: () => void;
}

function DateAndPoints({
    draft,
    set,
}: {
    draft: Draft;
    set: <TKey extends keyof Draft>(key: TKey, value: Draft[TKey]) => void;
}) {
    return (
                    <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="q-acquired">Erworben</Label>
                            <Input
                                id="q-acquired"
                                type="date"
                                value={draft.acquiredAt}
                                onChange={(event) => set('acquiredAt', event.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="q-expires">Gültig bis</Label>
                            <Input
                                id="q-expires"
                                type="date"
                                value={draft.expiresAt}
                                onChange={(event) => set('expiresAt', event.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="q-points">Skill-Punkte</Label>
                            <Input
                                id="q-points"
                                type="number"
                                min={1}
                                max={4}
                                value={draft.skillPoints}
                                onChange={(event) => set('skillPoints', event.target.value)}
                            />
                        </div>
                    </div>
    );
}

function QualificationFields({
    draft,
    set,
}: {
    draft: Draft;
    set: <TKey extends keyof Draft>(key: TKey, value: Draft[TKey]) => void;
}) {
    return (
                <div className="space-y-3">
                    <div className="space-y-1.5">
                        <Label htmlFor="q-title">Titel</Label>
                        <Input id="q-title" value={draft.title} onChange={(event) => set('title', event.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="q-description">Beschreibung</Label>
                        <Textarea
                            id="q-description"
                            rows={3}
                            value={draft.description}
                            onChange={(event) => set('description', event.target.value)}
                        />
                    </div>
                    <DateAndPoints draft={draft} set={set} />
                </div>
    );
}

export function QualificationDialog({ userId, open, existing, onClose }: QualificationDialogProps) {
    const [draft, setDraft] = useState<Draft>(EMPTY);
    const save = useEmployeeMutation(userId, 'Qualifikation gespeichert.');

    useEffect(() => {
        setDraft(existing === null ? EMPTY : fromView(existing));
    }, [existing, open]);

    const set = <TKey extends keyof Draft>(key: TKey, value: Draft[TKey]) =>
        setDraft((current) => ({ ...current, [key]: value }));

    const submit = () =>
        save.mutate(
            () =>
                peopleRepository.saveQualification(
                    {
                        userId,
                        title: draft.title.trim(),
                        description: draft.description.trim() === '' ? null : draft.description.trim(),
                        acquiredAt: draft.acquiredAt === '' ? null : draft.acquiredAt,
                        expiresAt: draft.expiresAt === '' ? null : draft.expiresAt,
                        skillPoints: draft.skillPoints === '' ? null : Number(draft.skillPoints),
                    },
                    existing?.id,
                ),
            { onSuccess: onClose },
        );

    return (
        <Dialog open={open} onOpenChange={(isOpen) => (isOpen ? undefined : onClose())}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{existing === null ? 'Qualifikation erfassen' : 'Qualifikation bearbeiten'}</DialogTitle>
                </DialogHeader>

                <QualificationFields draft={draft} set={set} />

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Abbrechen
                    </Button>
                    <Button disabled={draft.title.trim() === '' || save.isPending} onClick={submit}>
                        Speichern
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
