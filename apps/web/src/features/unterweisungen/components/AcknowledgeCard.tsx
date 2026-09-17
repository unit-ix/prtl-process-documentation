import type { InstructionDetailView } from '@app/domain';
import { CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';

interface AcknowledgeCardProps {
    instruction: InstructionDetailView;
    isPending: boolean;
    onConfirm: () => void;
}

// §7.3 — der Weg für angemeldete Teilnehmer. In Canvas ist diese Karte fest unsichtbar geschaltet.
export function AcknowledgeCard({ instruction, isPending, onConfirm }: AcknowledgeCardProps) {
    const [checked, setChecked] = useState(false);
    const own = instruction.ownParticipant;
    if (own === null) return null;

    if (own.status === 'Bestätigt') {
        return (
            <Card className="border-success/30 bg-success/5 text-success flex items-center gap-2 rounded-2xl border p-4 text-sm font-medium">
                <CheckCircle2 className="size-4" />
                Sie haben diese Unterweisung am{' '}
                {own.confirmedAt === null
                    ? '—'
                    : new Date(own.confirmedAt).toLocaleDateString('de-DE', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                      })}{' '}
                bestätigt.
            </Card>
        );
    }

    return (
        <Card className="glass-card border-border/40 space-y-3 rounded-2xl p-6">
            <h2 className="text-sm font-semibold">Ihre Kenntnisnahme</h2>
            <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} />
                Ich habe den Prozess gelesen und verstanden.
            </label>
            <Button disabled={!checked || isPending} onClick={onConfirm}>
                Bestätigen
            </Button>
        </Card>
    );
}
