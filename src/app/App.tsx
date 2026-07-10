import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/shared/components/layout/AppShell';
import { NotFound } from '@/shared/components/state/NotFound';
import { Toaster } from '@/shared/components/ui/sonner';
import { RoleProvider } from '@/shared/lib/role/RoleContext';
import { ContactsPage } from '@/features/_example';

// EIN QueryClient pro App-Instanz (Modul-Scope, nicht pro Render) → stabile Cache-Identitaet.
// retry: false → der DoD-Error-Zustand erscheint sofort statt nach stillen Retries.
const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
});

// HashRouter (nicht BrowserRouter): der Code-App-/Static-Host serviert keine SPA-Rewrites,
// #-Routing funktioniert ohne Server-Config. Reihenfolge der Provider ist bewusst:
// Query außen (Daten), Role darunter (UI-Sicht), Router innen (Navigation).
export function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <RoleProvider>
                <HashRouter>
                    <AppShell>
                        <Routes>
                            <Route path="/" element={<ContactsPage />} />
                            {/* catch-all → DoD-Pflichtzustand 404 (per falschem Hash erreichbar). */}
                            <Route path="*" element={<NotFound />} />
                        </Routes>
                    </AppShell>
                    {/* Toasts global: immer sonner, nie die alte toast-Komponente. */}
                    <Toaster richColors position="bottom-right" />
                </HashRouter>
            </RoleProvider>
        </QueryClientProvider>
    );
}
