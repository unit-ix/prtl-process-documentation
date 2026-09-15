import { Loader2 } from 'lucide-react';

export function LoadingScreen({ label = 'Wird geladen …' }: { label?: string }) {
    return (
        <div className="text-muted-foreground flex min-h-screen items-center justify-center gap-3 text-sm">
            <Loader2 className="size-4 animate-spin" />
            <span>{label}</span>
        </div>
    );
}
