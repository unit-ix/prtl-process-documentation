import { richOrPlain, type ProcessDetailView, type ProcessLinkView, type RichDocument } from '@app/domain';
import { Pencil } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { RichTextView } from '@/shared/components/richtext/RichTextView';
import { backState } from '@/shared/hooks/useBackTo';

type Section =
    | { readonly label: string; readonly value: string | null }
    | { readonly label: string; readonly doc: RichDocument | null };

// Dieselbe Reihenfolge wie im freigegebenen Dokument (snapshot.ts). Die Prozessbeschreibung hat
// einen eigenen Reiter (Testauswertung 09.10.): sie wird lang, und alles darunter rutschte weg.
function contentSections(process: ProcessDetailView): Section[] {
    const { version } = process;
    const responsibilities: Section = {
        label: 'Zuständigkeiten / Verantwortung',
        doc: richOrPlain(version.responsibilitiesDoc, version.responsibilities),
    };
    const common: Section[] = [
        { label: 'Zweck', value: version.purpose },
        { label: 'Geltungsbereich', value: version.scopeDetail },
    ];

    if (process.templateType === 'IMS') {
        return [...common, { label: 'Begriffe', doc: richOrPlain(version.termsDoc, version.terms) }, responsibilities];
    }

    return [
        ...common,
        { label: 'Prozessablauf', value: version.workSequence },
        responsibilities,
        { label: 'Verfahren', value: version.method },
        { label: 'Prozessparameter', value: version.processParameters },
        { label: 'Dokumentationen', value: version.documentationRef },
        { label: 'Reaktionsplan bei Abweichungen', value: version.deviationHandling },
        { label: 'Wartung (Verweis)', value: version.maintenanceRef },
    ];
}

function Field(section: Section) {
    return (
        <div className="space-y-1">
            <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{section.label}</h3>
            {'doc' in section ? (
                <RichTextView doc={section.doc} />
            ) : (section.value ?? '').trim() === '' ? (
                <p className="text-muted-foreground text-sm italic">Noch nicht erfasst</p>
            ) : (
                <p className="text-sm whitespace-pre-line">{section.value}</p>
            )}
        </div>
    );
}

export function EditLink({ to }: { to: string }) {
    return (
        <Button asChild variant="ghost" size="sm" className="h-7 gap-1.5 text-xs">
            <Link to={to}>
                <Pencil className="size-3.5" /> Bearbeiten
            </Link>
        </Button>
    );
}

function LinkList({ title, items, empty }: { title: string; items: ReactNode[]; empty: string }) {
    return (
        <div className="space-y-2">
            <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{title}</h3>
            {items.length === 0 ? (
                <p className="text-muted-foreground text-sm italic">{empty}</p>
            ) : (
                <ul className="space-y-1 text-sm">{items}</ul>
            )}
        </div>
    );
}

function ContentCard({ process }: { process: ProcessDetailView }) {
    return (
        <Card className="glass-card border-border/40 space-y-5 rounded-2xl p-6">
            <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">Kopfdaten</h2>
                {process.permissions.canEditContent ? <EditLink to={`/processes/${process.id}/edit`} /> : null}
            </div>
            {contentSections(process).map((section) => (
                <Field key={section.label} {...section} />
            ))}
        </Card>
    );
}

function PeopleCard({ process }: { process: ProcessDetailView }) {
    return (
        <Card className="glass-card border-border/40 space-y-5 rounded-2xl p-6">
            <h2 className="text-sm font-semibold">Verantwortlich</h2>
            <Field label="Autor" value={process.version.author?.displayName ?? null} />
            <Field label="Verantwortlich für Inhalt" value={process.version.processOwner?.displayName ?? null} />
        </Card>
    );
}

function LinkedProcessItem({ link, from }: { link: ProcessLinkView; from: ProcessDetailView }) {
    const target = link.linkedProcess;
    const suffix = target?.identifier ? <span className="text-muted-foreground"> · {target.identifier}</span> : null;

    if (target === null || !target.isAvailable) {
        return (
            <li className="text-muted-foreground">
                {target?.title ?? link.title}
                {suffix}
                {target === null ? null : <span className="italic"> (nicht mehr verfügbar)</span>}
            </li>
        );
    }

    return (
        <li>
            <Link
                to={`/processes/${target.id}`}
                state={backState(`/processes/${from.id}`, `Zurück zu ${from.identifier ?? from.title}`)}
                className="text-primary underline underline-offset-2"
            >
                {target.title}
            </Link>
            {suffix}
        </li>
    );
}

function LinkCard({ process }: { process: ProcessDetailView }) {
    const internal = process.links.filter((link) => link.linkType === 'InternerProzess');
    const external = process.links.filter((link) => link.linkType === 'ExternesDokument');

    return (
        <Card className="glass-card border-border/40 space-y-5 rounded-2xl p-6">
            <h2 className="text-sm font-semibold">Mitgeltende Unterlagen</h2>
            <LinkList
                title="Verknüpfte Prozesse"
                empty="Noch keine verknüpfte Prozesse."
                items={internal.map((link) => (
                    <LinkedProcessItem key={link.id} link={link} from={process} />
                ))}
            />
            <LinkList
                title="Externe Dokumente"
                empty="Noch keine Link hochgeladen."
                items={external.map((link) => (
                    <li key={link.id}>
                        <a
                            href={link.url ?? '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline underline-offset-2"
                        >
                            {link.title ?? link.url}
                        </a>
                    </li>
                ))}
            />
        </Card>
    );
}

export function OverviewTab({ process }: { process: ProcessDetailView }) {
    return (
        <div className="space-y-4">
            <ContentCard process={process} />
            <PeopleCard process={process} />
            <LinkCard process={process} />

            {process.additionalFields.length === 0 ? null : (
                <Card className="glass-card border-border/40 space-y-5 rounded-2xl p-6">
                    <h2 className="text-sm font-semibold">Erstellte Felder</h2>
                    {process.additionalFields.map((field) => (
                        <Field key={field.id} label={field.title} value={field.value} />
                    ))}
                </Card>
            )}
        </div>
    );
}
