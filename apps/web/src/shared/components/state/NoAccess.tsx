import { ShieldAlert } from 'lucide-react';

export function NoAccess({ displayName }: { displayName?: string }) {
    return (
        <div className="flex min-h-screen items-center justify-center p-6">
            <div className="glass-card w-full max-w-md rounded-3xl p-8 text-center">
                <div className="bg-accent text-accent-foreground mx-auto flex size-12 items-center justify-center rounded-2xl">
                    <ShieldAlert className="size-6" />
                </div>
                <h1 className="mt-5 text-lg font-semibold">Keine Berechtigungen vorhanden</h1>
                <p className="text-muted-foreground mt-2 text-sm">
                    {displayName ? `${displayName}, für Ihr Konto` : 'Für Ihr Konto'} ist in der Prozessdokumentation
                    noch keine Rolle hinterlegt. Bitte wenden Sie sich an das Qualitätsmanagement oder die
                    Administration.
                </p>
            </div>
        </div>
    );
}
