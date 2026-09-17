import type { ProcessDetailView } from '@app/domain';
import { ArrowLeft, Pencil, Save } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { AsyncBoundary } from '@/shared/components/state/AsyncBoundary';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Label } from '@/shared/components/ui/label';
import type { ProcessListItem } from '@app/domain';
import { AdditionalFieldsEditor } from '../components/AdditionalFieldsEditor';
import { LinksEditor } from '../components/LinksEditor';
import { FormField, GENERAL_FIELDS, OVERVIEW_FIELDS, templateFields } from '../components/ProcessFormFields';
import { useReleasedProcesses } from '../hooks/useReleasedProcesses';
import { useProcessDetail } from '../hooks/useProcessDetail';
import { useProcessForm } from '../hooks/useProcessForm';
import { NO_IDENTIFIER } from '../mappings/processMappings';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <Card className="glass-card border-border/40 space-y-4 rounded-2xl p-6">
            <h2 className="text-muted-foreground text-xs font-semibold tracking-[0.15em] uppercase">{title}</h2>
            {children}
        </Card>
    );
}

function EditForm({ process }: { process: ProcessDetailView }) {
    const { form, set, setFields, setLinks, save, isDirty } = useProcessForm(process);
    const { data: released } = useReleasedProcesses();

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <h1 className="text-gradient-primary text-2xl font-semibold tracking-tight">Prozess bearbeiten</h1>
                    <p className="text-muted-foreground mt-1 flex items-center gap-2 text-sm">
                        <span className="font-mono text-xs">{process.identifier ?? NO_IDENTIFIER}</span>
                        <span className="truncate">{process.title}</span>
                    </p>
                </div>
                <Button className="gap-2" disabled={!isDirty || save.isPending} onClick={() => save.mutate()}>
                    <Save className="size-4" /> Speichern
                </Button>
            </div>

            <Section title="Allgemein">
                {GENERAL_FIELDS.map((field) => (
                    <FormField key={field.id} {...field} form={form} onChange={set} />
                ))}
            </Section>

            <OverviewSection process={process} form={form} set={set} />

            <Section title="Verantwortlichkeiten">
                <FormField
                    id="responsibilities"
                    label="Zuständigkeiten / Verantwortung"
                    form={form}
                    onChange={set}
                    rows={5}
                />
            </Section>

            <ExtraSections form={form} setFields={setFields} setLinks={setLinks} processes={released ?? []} />
        </div>
    );
}

type FormApi = ReturnType<typeof useProcessForm>;

function OverviewSection({ process, form, set }: { process: ProcessDetailView; form: FormApi['form']; set: FormApi['set'] }) {
    return (
            <Section title="Prozess-Übersicht">
                {[...OVERVIEW_FIELDS, ...templateFields(process.templateType)].map((field) => (
                    <FormField key={field.id} {...field} form={form} onChange={set} />
                ))}
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                        <Label>Prozessbeschreibung</Label>
                        <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                            <Link to={`/processes/${process.id}/description`}>
                                <Pencil className="size-3.5" /> Im Editor bearbeiten
                            </Link>
                        </Button>
                    </div>
                    <p className="text-muted-foreground text-xs">
                        Bilder, Tabellen und Texthierarchien werden im eigenen Editor gepflegt und dort automatisch
                        gespeichert.
                    </p>
                </div>
            </Section>
    );
}

function ExtraSections({
    form,
    setFields,
    setLinks,
    processes,
}: {
    form: FormApi['form'];
    setFields: FormApi['setFields'];
    setLinks: FormApi['setLinks'];
    processes: readonly ProcessListItem[];
}) {
    return (
        <>
            <Section title="Mitgeltende Unterlagen">
                <LinksEditor links={form.links} processes={processes} onChange={setLinks} />
            </Section>

            <Section title="Erstellte Felder">
                <AdditionalFieldsEditor fields={form.additionalFields} onChange={setFields} />
            </Section>
        </>
    );
}

export function ProcessEditPage() {
    const { id = '' } = useParams();
    const { data, isPending, error, refetch } = useProcessDetail(id);

    return (
        <div className="space-y-4">
            <Button asChild variant="ghost" size="sm" className="gap-2">
                <Link to={`/processes/${id}`}>
                    <ArrowLeft className="size-4" /> Zurück zum Prozess
                </Link>
            </Button>

            <AsyncBoundary isLoading={isPending} error={error} onRetry={() => void refetch()}>
                {data ? <EditForm process={data} /> : null}
            </AsyncBoundary>
        </div>
    );
}
