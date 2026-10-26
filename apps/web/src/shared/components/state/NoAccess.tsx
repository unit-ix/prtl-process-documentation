import { ShieldAlert } from 'lucide-react';

export function NoAccess({ displayName }: { displayName?: string }) {
    return (
        <div className="flex min-h-screen items-center justify-center p-6">
            <div className="glass-card w-full max-w-md rounded-3xl p-8 text-center">
                <div className="bg-accent text-accent-foreground mx-auto flex size-12 items-center justify-center rounded-2xl">
                    <ShieldAlert className="size-6" />
                </div>
                <h1 className="mt-5 text-lg font-semibold">Kein Zugang</h1>
                <p className="text-muted-foreground mt-2 text-sm">
                    {displayName ? `${displayName}, Ihr Konto` : 'Ihr Konto'} ist für die Prozessdokumentation nicht
                    freigeschaltet. Zugang erhält, wer in der Benutzergruppe der Anwendung ist. Bitte wenden Sie sich
                    an die IT oder die Administration.
                </p>
            </div>
        </div>
    );
}
