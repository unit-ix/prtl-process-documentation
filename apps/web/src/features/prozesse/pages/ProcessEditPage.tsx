import type { ProcessDetailView } from '@app/domain';
import { ArrowLeft, Pencil, Save } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { AsyncBoundary } from '@/shared/components/state/AsyncBoundary';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { FormField, GENERAL_FIELDS, OVERVIEW_FIELDS, templateFields } from '../components/ProcessFormFields';
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
    const { form, set, setAdditionalField, save, isDirty } = useProcessForm(process);

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

            <AdditionalFieldsSection process={process} form={form} onChange={setAdditionalField} />
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

function AdditionalFieldsSection({
    process,
    form,
    onChange,
}: {
    process: ProcessDetailView;
    form: FormApi['form'];
    onChange: FormApi['setAdditionalField'];
}) {
    if (process.additionalFields.length === 0) return null;

    return (
                <Section title="Erstellte Felder">
                    {process.additionalFields.map((field) => (
                        <div key={field.id} className="space-y-1.5">
                            <Label htmlFor={field.id}>{field.title}</Label>
                            <Textarea
                                id={field.id}
                                rows={3}
                                value={form.additionalFields[field.id] ?? ''}
                                onChange={(event) => onChange(field.id, event.target.value)}
                            />
                        </div>
                    ))}
                </Section>
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
