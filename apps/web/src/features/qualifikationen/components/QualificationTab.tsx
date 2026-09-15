import type { EmployeeDetailView, QualificationView } from '@app/domain';
import { Lock, Plus, Trash2 } from 'lucide-react';
import { peopleRepository } from '@/data';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { useEmployeeMutation } from '../hooks/usePeople';

const formatDate = (iso: string | null): string =>
    iso === null ? '—' : new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

interface QualificationTabProps {
    employee: EmployeeDetailView;
    onEdit: (qualificationId: string | null) => void;
}

// §7.5 — die einzige echte Zugriffsbeschränkung im Produkt. Wer sie nicht hat, bekommt die Daten
// gar nicht erst geschickt; hier steht nur noch der Hinweis.
function QualificationRow({
    qualification,
    onEdit,
    onRemove,
}: {
    qualification: QualificationView;
    onEdit: () => void;
    onRemove: () => void;
}) {
    return (
        <li className="flex items-start justify-between gap-3 py-3">
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <button type="button" className="text-sm font-medium hover:underline" onClick={onEdit}>
                        {qualification.title}
                    </button>
                    {qualification.skillPoints === null ? null : (
                        <Badge variant="outline" className="h-5 text-[10px]">
                            {qualification.skillPoints} Pkt.
                        </Badge>
                    )}
                    {qualification.isExpired ? (
                        <Badge
                            variant="outline"
                            className="border-destructive/30 bg-destructive/10 text-destructive h-5 text-[10px]"
                        >
                            abgelaufen
                        </Badge>
                    ) : null}
                </div>
                {qualification.description ? (
                    <p className="text-muted-foreground mt-0.5 text-xs">{qualification.description}</p>
                ) : null}
                <p className="text-muted-foreground mt-1 text-xs">
                    Erworben {formatDate(qualification.acquiredAt)} · Gültig bis{' '}
                    <span className={qualification.isExpired ? 'text-destructive' : undefined}>
                        {formatDate(qualification.expiresAt)}
                    </span>
                </p>
            </div>
            <Button variant="ghost" size="icon" aria-label="Entfernen" className="text-destructive" onClick={onRemove}>
                <Trash2 className="size-4" />
            </Button>
        </li>
    );
}

export function QualificationTab({ employee, onEdit }: QualificationTabProps) {
    const remove = useEmployeeMutation(employee.employee.id, 'Qualifikation entfernt.');

    if (employee.qualifications === null) {
        return (
            <div className="text-muted-foreground flex items-center gap-2 py-8 text-sm">
                <Lock className="size-4" />
                Qualifikationen sind nur für die Administration und den Prozessverantwortlichen dieses Bereichs
                sichtbar.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
                <p className="text-muted-foreground text-xs">
                    Skill-Punkte 1–4 messen Prozessstabilität und Vertretbarkeit — wer für wen einspringen kann. Sie
                    sind ausdrücklich keine Leistungsbewertung.
                </p>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onEdit(null)}>
                    <Plus className="size-3.5" /> Neu
                </Button>
            </div>

            {employee.qualifications.length === 0 ? (
                <p className="text-muted-foreground text-sm italic">Noch keine Qualifikationen erfasst.</p>
            ) : (
                <ul className="divide-border/40 divide-y">
                    {employee.qualifications.map((qualification) => (
                        <QualificationRow
                            key={qualification.id}
                            qualification={qualification}
                            onEdit={() => onEdit(qualification.id)}
                            onRemove={() => remove.mutate(() => peopleRepository.removeQualification(qualification.id))}
                        />
                    ))}
                </ul>
            )}
        </div>
    );
}
