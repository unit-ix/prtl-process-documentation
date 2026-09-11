import { AlertTriangle } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

interface ErrorStateProps {
    title?: string;
    error?: unknown;
    onRetry?: () => void;
}

function messageOf(error: unknown): string | undefined {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return undefined;
}

export function ErrorState({ title = 'Etwas ist schiefgelaufen', error, onRetry }: ErrorStateProps) {
    const detail = messageOf(error);
    return (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-8 text-center">
            <AlertTriangle className="text-destructive size-8" />
            <div className="space-y-1">
                <p className="text-sm font-medium">{title}</p>
                {detail ? <p className="text-muted-foreground text-sm">{detail}</p> : null}
            </div>
            {onRetry ? (
                <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                    Erneut versuchen
                </Button>
            ) : null}
        </div>
    );
}
