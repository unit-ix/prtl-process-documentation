import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { InstructionDetailPage, InstructionsPage } from '@/features/unterweisungen';
import {
    ProcessDescriptionPage,
    ProcessDetailPage,
    ProcessEditPage,
    ProcessesPage,
} from '@/features/prozesse';
import { AppShell } from '@/shared/components/layout/AppShell';
import { ErrorState } from '@/shared/components/state/ErrorState';
import { LoadingScreen } from '@/shared/components/state/LoadingScreen';
import { NoAccess } from '@/shared/components/state/NoAccess';
import { NotFound } from '@/shared/components/state/NotFound';
import { Toaster } from '@/shared/components/ui/sonner';
import { SessionProvider } from '@/shared/lib/session/SessionContext';
import type { Session } from '@/data/ports/SessionRepository';

const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
});

function SessionGate({
    isPending,
    error,
    session,
}: {
    isPending: boolean;
    error: Error | null;
    session: Session | undefined;
}) {
    if (isPending) return <LoadingScreen label="Anmeldung wird geprüft …" />;
    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center p-6">
                <ErrorState title="Die Anwendung konnte nicht geladen werden" error={error} />
            </div>
        );
    }
    return <NoAccess displayName={session?.user?.displayName} />;
}

export function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <HashRouter>
                <SessionProvider fallback={SessionGate}>
                    <AppShell>
                        <Routes>
                            <Route path="/" element={<Navigate to="/processes" replace />} />
                            <Route path="/processes" element={<ProcessesPage />} />
                            <Route path="/processes/:id" element={<ProcessDetailPage />} />
                            <Route path="/processes/:id/description" element={<ProcessDescriptionPage />} />
                            <Route path="/processes/:id/edit" element={<ProcessEditPage />} />
                            <Route path="/instructions" element={<InstructionsPage />} />
                            <Route path="/instructions/:id" element={<InstructionDetailPage />} />
                            <Route path="*" element={<NotFound />} />
                        </Routes>
                    </AppShell>
                </SessionProvider>
                <Toaster richColors position="bottom-right" />
            </HashRouter>
        </QueryClientProvider>
    );
}
