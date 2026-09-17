import { useEffect, useState } from 'react';

export function useDebounced<TValue>(value: TValue, delayMs = 300): TValue {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delayMs);
        return () => clearTimeout(timer);
    }, [value, delayMs]);

    return debounced;
}
