import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/shared/components/layout/AppShell';
import { NotFound } from '@/shared/components/state/NotFound';
import { Toaster } from '@/shared/components/ui/sonner';
import { RoleProvider } from '@/shared/lib/role/RoleContext';
import { ContactsPage } from '@/features/_example';

const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
});

export function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <RoleProvider>
                <HashRouter>
                    <AppShell>
                        <Routes>
                            <Route path="/" element={<ContactsPage />} />
                            <Route path="*" element={<NotFound />} />
                        </Routes>
                    </AppShell>
                    <Toaster richColors position="bottom-right" />
                </HashRouter>
            </RoleProvider>
        </QueryClientProvider>
    );
}
