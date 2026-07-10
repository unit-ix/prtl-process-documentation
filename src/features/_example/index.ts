// _example — das kanonische Referenz-Feature. „Mirror this, then delete."
// Kopiere die Struktur (hooks/ um den Port, pages/ mit AsyncBoundary + fuenf DoD-Zustaenden
// + canSee/canEdit), benenne pro echtem PRD-Feature um und loesche dieses Verzeichnis,
// sobald das erste echte Feature steht.
export { ContactsPage } from './pages/ContactsPage';
export {
    contactKeys,
    useContact,
    useContacts,
    useCreateContact,
    useDeleteContact,
    useUpdateContact,
} from './hooks/useContacts';
