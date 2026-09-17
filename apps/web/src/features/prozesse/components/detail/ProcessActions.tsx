import type { ProcessDetailView } from '@app/domain';
import { CheckCircle2, RotateCcw, Send, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip';
import { Info } from 'lucide-react';
import { processRepository } from '@/data';
import { AssignAuthorDialog } from './AssignAuthorDialog';
import type { RejectKind } from './RejectDialog';

interface ProcessActionsProps {
    process: ProcessDetailView;
    isPending: boolean;
    run: (action: (id: string) => Promise<{ toast: string }>) => void;
    onReject: (kind: RejectKind) => void;
}

function MissingHint({ completeness }: { completeness: ProcessDetailView['completeness'] }) {
    const missing = completeness.checks.filter((check) => !check.ok).map((check) => check.label);

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button type="button" aria-label="Warum ist der Knopf deaktiviert?" className="text-muted-foreground">
                    <Info className="size-4" />
                </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
                <p className="font-medium">Einreichen ist erst bei 100 % möglich.</p>
                <p className="mt-1">Es fehlt noch: {missing.join(', ')}.</p>
            </TooltipContent>
        </Tooltip>
    );
}

function RejectButton({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
    return (
        <Button
            variant="outline"
            className="text-destructive hover:text-destructive gap-2"
            disabled={disabled}
            onClick={onClick}
        >
            <X className="size-4" /> {label}
        </Button>
    );
}

export function ProcessActions({ process, isPending, run, onReject }: ProcessActionsProps) {
    const { permissions, completeness } = process;
    const incomplete = completeness.percent < 100;

    return (
        <div className="flex flex-wrap items-center gap-2">
            {permissions.canAssignAuthor ? <AssignAuthorDialog isPending={isPending} run={run} /> : null}

            {permissions.canSubmit ? (
                <div className="flex items-center gap-1.5">
                    <Button
                        className="gap-2"
                        disabled={isPending || incomplete}
                        onClick={() => run((id) => processRepository.submit(id))}
                    >
                        <Send className="size-4" /> Zur inhaltlichen Prüfung einreichen
                    </Button>
                    {incomplete ? <MissingHint completeness={completeness} /> : null}
                </div>
            ) : null}

            {permissions.canApproveContent ? (
                <>
                    <Button className="gap-2" disabled={isPending} onClick={() => run((id) => processRepository.approveContent(id))}>
                        <CheckCircle2 className="size-4" /> Inhaltlich freigeben
                    </Button>
                    <RejectButton label="Zurückgeben" disabled={isPending} onClick={() => onReject('content')} />
                </>
            ) : null}

            {permissions.canApproveFormal ? (
                <>
                    <Button className="gap-2" disabled={isPending} onClick={() => run((id) => processRepository.approveFormal(id))}>
                        <ShieldCheck className="size-4" /> Formell freigeben
                    </Button>
                    <RejectButton label="Ablehnen" disabled={isPending} onClick={() => onReject('formal')} />
                </>
            ) : null}

            {permissions.canReopen ? (
                <Button variant="outline" className="gap-2" disabled={isPending} onClick={() => run((id) => processRepository.reopen(id, null))}>
                    <RotateCcw className="size-4" /> Überarbeiten
                </Button>
            ) : null}
        </div>
    );
}
