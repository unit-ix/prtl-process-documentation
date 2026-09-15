import type { ProcessDetailView } from '@app/domain';
import { ArrowLeft, Save } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { AsyncBoundary } from '@/shared/components/state/AsyncBoundary';
import { RichTextEditor } from '@/shared/components/richtext/RichTextEditor';
import { Button } from '@/shared/components/ui/button';
import { useDescriptionAutosave, type SaveState } from '../hooks/useDescriptionAutosave';
import { useProcessDetail } from '../hooks/useProcessDetail';
import { NO_IDENTIFIER } from '../mappings/processMappings';

const STATE_LABELS: Record<SaveState, string> = {
    saved: 'Gespeichert',
    saving: 'Wird gespeichert …',
    unsaved: 'Nicht gespeichert',
    conflict: 'Konflikt',
    error: 'Nicht gespeichert',
};

const STATE_STYLES: Record<SaveState, string> = {
    saved: 'text-muted-foreground',
    saving: 'text-muted-foreground',
    unsaved: 'text-warning',
    conflict: 'text-destructive',
    error: 'text-destructive',
};

function Editor({ process }: { process: ProcessDetailView }) {
    const autosave = useDescriptionAutosave(process.id, process.version.rowVersion);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <h1 className="text-gradient-primary text-2xl font-semibold tracking-tight">
                        Beschreibung bearbeiten
                    </h1>
                    <p className="text-muted-foreground mt-1 flex items-center gap-2 text-sm">
                        <span className="font-mono text-xs">{process.identifier ?? NO_IDENTIFIER}</span>
                        <span className="truncate">{process.title}</span>
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium ${STATE_STYLES[autosave.state]}`}>
                        {STATE_LABELS[autosave.state]}
                    </span>
                    <Button className="gap-2" onClick={autosave.saveNow} disabled={autosave.state === 'saving'}>
                        <Save className="size-4" /> Speichern
                    </Button>
                </div>
            </div>

            {autosave.message ? (
                <div className="border-destructive/30 bg-destructive/5 text-destructive rounded-2xl border p-4 text-sm">
                    {autosave.message}
                </div>
            ) : null}

            <RichTextEditor
                value={process.version.descriptionDoc}
                onChange={autosave.onChange}
                owner={{ kind: 'process', id: process.id }}
            />
        </div>
    );
}

export function ProcessDescriptionPage() {
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
                {data ? <Editor process={data} /> : null}
            </AsyncBoundary>
        </div>
    );
}
