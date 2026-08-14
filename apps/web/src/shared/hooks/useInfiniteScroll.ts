import { useEffect, useRef } from 'react';

/** Calls `onReach` when the returned sentinel scrolls into view. Pass `hasNextPage && !isFetchingNextPage` as `enabled`. */
export function useInfiniteScroll(onReach: () => void, enabled: boolean) {
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    // Latest-ref, otherwise every render would tear down and rebuild the observer.
    const handler = useRef(onReach);
    handler.current = onReach;

    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel || !enabled) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) handler.current();
            },
            // Load slightly before the sentinel is visible so scrolling does not stutter.
            { rootMargin: '200px' },
        );
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [enabled]);

    return sentinelRef;
}
