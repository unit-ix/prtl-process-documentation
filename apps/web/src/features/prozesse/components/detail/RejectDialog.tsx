import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/shared/components/ui/dialog';
import { Textarea } from '@/shared/components/ui/textarea';

export type RejectKind = 'content' | 'formal';

const TEXTS: Record<RejectKind, { title: string; confirm: string; description: string }> = {
    content: {
        title: 'Prozess zurückgeben',
        confirm: 'Zurückgeben',
        description: 'Der Verfasser erhält den Prozess zur Überarbeitung zurück.',
    },
    formal: {
        title: 'Prozess ablehnen (formelle Prüfung)',
        confirm: 'Ablehnen',
        description: 'Der Prozess geht zur Überarbeitung an den Verfasser zurück.',
    },
};

interface RejectDialogProps {
    kind: RejectKind | null;
    isPending: boolean;
    onClose: () => void;
    onConfirm: (comment: string) => void;
}

export function RejectDialog({ kind, isPending, onClose, onConfirm }: RejectDialogProps) {
    const [comment, setComment] = useState('');
    const text = kind === null ? TEXTS.content : TEXTS[kind];

    const close = () => {
        setComment('');
        onClose();
    };

    return (
        <Dialog open={kind !== null} onOpenChange={(open) => (open ? undefined : close())}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{text.title}</DialogTitle>
                    <DialogDescription>{text.description}</DialogDescription>
                </DialogHeader>
                <Textarea
                    value={comment}
                    onChange={(event) => setComment(event.target.value.slice(0, 2000))}
                    placeholder="z. B. Kennzahlen-Definition in Abschnitt 5 fehlt …"
                    rows={5}
                />
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={close}>
                        Abbrechen
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        disabled={comment.trim() === '' || isPending}
                        onClick={() => {
                            onConfirm(comment.trim());
                            setComment('');
                        }}
                    >
                        {text.confirm}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
