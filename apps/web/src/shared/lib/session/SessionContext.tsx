import type { SessionUser } from '@app/domain';
import { useQuery } from '@tanstack/react-query';
import { createContext, useContext, type ReactNode } from 'react';
import { sessionRepository } from '@/data';
import type { Session } from '@/data/ports/SessionRepository';

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({
    children,
    fallback,
}: {
    children: ReactNode;
    fallback: (state: { isPending: boolean; error: Error | null; session: Session | undefined }) => ReactNode;
}) {
    const { data, isPending, error } = useQuery({
        queryKey: ['session'],
        queryFn: () => sessionRepository.me(),
        staleTime: Infinity,
        retry: false,
    });

    if (isPending || error || !data?.hasAccess) {
        return <>{fallback({ isPending, error, session: data })}</>;
    }

    return <SessionContext.Provider value={data}>{children}</SessionContext.Provider>;
}

export function useSessionUser(): SessionUser {
    const session = useContext(SessionContext);
    if (!session?.user) throw new Error('useSessionUser ausserhalb des SessionProvider-Gates aufgerufen.');
    return session.user;
}
