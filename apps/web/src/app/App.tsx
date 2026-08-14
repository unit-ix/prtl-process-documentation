import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/shared/components/layout/AppShell';
import { NotFound } from '@/shared/components/state/NotFound';
import { Toaster } from '@/shared/components/ui/sonner';
import { RoleProvider } from '@/shared/lib/role/RoleContext';
import { ContactsPage } from '@/features/_example';

// retry: false surfaces the error state immediately instead of after silent retries.
const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
});

// HashRouter, never BrowserRouter: static hosts serve no SPA rewrites and the later Dataverse
// iframe needs hash routing.
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
