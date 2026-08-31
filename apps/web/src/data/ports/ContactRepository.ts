import type { Contact } from '@/domain/Contact';
import type { QueryOf, QuerySpec } from './Query';
import type { Repository } from './Repository';

export type ContactCreate = Omit<Contact, 'id' | 'fullName' | 'createdOn'>;

export const contactQuerySpec = {
    searchField: 'fullName',
    equalityFields: ['role', 'isPrimary'],
    sortFields: ['fullName', 'email', 'createdOn'],
} as const satisfies QuerySpec<Contact>;

export type ContactQuery = QueryOf<Contact, typeof contactQuerySpec>;

export type ContactSort = NonNullable<ContactQuery['sort']>;

export type ContactRepository = Repository<Contact, ContactCreate, ContactQuery>;
