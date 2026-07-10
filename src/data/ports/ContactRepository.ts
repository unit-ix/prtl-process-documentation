import type { Contact } from '@/domain/Contact';
import type { Repository } from './Repository';

// Beim Anlegen entfaellt Server-Verantwortetes: id, berechnetes fullName, createdOn.
export type ContactCreate = Omit<Contact, 'id' | 'fullName' | 'createdOn'>;

export type ContactRepository = Repository<Contact, ContactCreate>;
