import { useEffect, useRef } from 'react';

export function useInfiniteScroll(onReach: () => void, enabled: boolean) {
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    const handler = useRef(onReach);
    handler.current = onReach;

    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel || !enabled) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) handler.current();
            },
            { rootMargin: '200px' },
        );
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [enabled]);

    return sentinelRef;
}
