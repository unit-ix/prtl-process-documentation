import { type ReactNode } from 'react';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';

interface AsyncBoundaryProps {
    isLoading: boolean;
    error?: unknown;
    /** true, wenn erfolgreich geladen wurde, das Ergebnis aber leer ist. */
    isEmpty?: boolean;
    onRetry?: () => void;
    /** Überschreibt den Default-Skeleton bzw. den Default-EmptyState. */
    loadingFallback?: ReactNode;
    emptyFallback?: ReactNode;
    children: ReactNode;
}

function DefaultLoading() {
    return (
        <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-2/3" />
        </div>
    );
}

// Orchestriert die vier Lade-abhängigen DoD-Zustände um ein TanStack-Query-Ergebnis:
// Loading → Error → Empty → Inhalt. Feature-Hooks reichen `isLoading/error/isEmpty`
// durch, statt die Reihenfolge in jeder Page neu zu erfinden.
export function AsyncBoundary({
    isLoading,
    error,
    isEmpty,
    onRetry,
    loadingFallback,
    emptyFallback,
    children,
}: AsyncBoundaryProps) {
    if (isLoading) return <>{loadingFallback ?? <DefaultLoading />}</>;
    if (error) return <ErrorState error={error} onRetry={onRetry} />;
    if (isEmpty) return <>{emptyFallback ?? <EmptyState />}</>;
    return <>{children}</>;
}
