import type { ProcessDetailView } from '@app/domain';
import type { ReactNode } from 'react';
import { Card } from '@/shared/components/ui/card';
import { RichTextView } from '@/shared/components/richtext/RichTextView';

interface Section {
    readonly label: string;
    readonly value: string | null;
}

function textSections(process: ProcessDetailView): Section[] {
    const { version } = process;
    const common: Section[] = [
        { label: 'Zweck', value: version.purpose },
        { label: 'Geltungsbereich', value: version.scopeDetail },
    ];

    if (process.templateType === 'IMS') return [...common, { label: 'Begriffe', value: version.terms }];

    return [
        ...common,
        { label: 'Prozessablauf', value: version.workSequence },
        { label: 'Verfahren', value: version.method },
        { label: 'Prozessparameter', value: version.processParameters },
        { label: 'Dokumentationen', value: version.documentationRef },
        { label: 'Reaktionsplan bei Abweichungen', value: version.deviationHandling },
        { label: 'Wartung (Verweis)', value: version.maintenanceRef },
    ];
}

function Field({ label, value }: Section) {
    return (
        <div className="space-y-1">
            <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{label}</h3>
            {(value ?? '').trim() === '' ? (
                <p className="text-muted-foreground text-sm italic">Noch nicht erfasst</p>
            ) : (
                <p className="text-sm whitespace-pre-line">{value}</p>
            )}
        </div>
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
            {textSections(process).map((section) => (
                <Field key={section.label} {...section} />
            ))}
            <div className="space-y-1">
                <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Prozessbeschreibung
                </h3>
                <RichTextView doc={process.version.descriptionDoc} />
            </div>
        </Card>
    );
}

function ResponsibilityCard({ process }: { process: ProcessDetailView }) {
    return (
        <Card className="glass-card border-border/40 space-y-5 rounded-2xl p-6">
            <h2 className="text-sm font-semibold">Verantwortlichkeiten</h2>
            <Field label="Autor" value={process.version.author?.displayName ?? null} />
            <Field label="Verantwortlich für Inhalt" value={process.version.processOwner?.displayName ?? null} />
            <Field label="Zuständigkeiten / Verantwortung" value={process.version.responsibilities} />
        </Card>
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
                        <li key={link.id}>
                            {link.linkedProcess?.title ?? link.title}
                            {link.linkedProcess?.identifier ? (
                                <span className="text-muted-foreground"> · {link.linkedProcess.identifier}</span>
                            ) : null}
                        </li>
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
            <ResponsibilityCard process={process} />
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
