export type PathParams = Readonly<Record<string, string>>;

export function matchPath(pattern: string, path: string): PathParams | null {
    const expected = pattern.split('/').filter(Boolean);
    const actual = path.split('/').filter(Boolean);
    if (expected.length !== actual.length) return null;

    const params: Record<string, string> = {};
    for (const [index, segment] of expected.entries()) {
        const value = actual[index];
        if (segment.startsWith(':')) {
            if (value === '') return null;
            params[segment.slice(1)] = decodeURIComponent(value);
            continue;
        }
        if (segment !== value) return null;
    }
    return params;
}
