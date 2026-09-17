/**
 * Zeilen, die wie ein Link wirken, müssen sich auch wie einer bedienen lassen: mit der Tastatur
 * erreichbar und mit Enter auslösbar. Ohne das ist die halbe Anwendung nur mit der Maus benutzbar.
 */
export const clickableRow = (onOpen: () => void) => ({
    tabIndex: 0,
    role: 'link' as const,
    onClick: onOpen,
    onKeyDown: (event: React.KeyboardEvent) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        onOpen();
    },
});
