// PROTOTYPE-ONLY — am Fork ersetzt durch AzureRepository('contacts') bzw. den dataverse-Adapter.
import type { Contact } from '@/domain/Contact';
import { contactQuerySpec, type ContactCreate, type ContactQuery, type ContactRepository } from '../../ports/ContactRepository';
import type { Page } from '../../ports/Query';
import { applyQuery } from './query';
import { db, nextId } from './store';

const clone = (contact: Contact): Contact => ({ ...contact, company: { ...contact.company } });

const fullNameOf = (firstName: string, lastName: string): string => `${firstName} ${lastName}`;

export class MockContactRepository implements ContactRepository {
    async list(query?: ContactQuery): Promise<Page<Contact>> {
        return applyQuery(db().contacts, query, contactQuerySpec, clone);
    }

    async get(id: string): Promise<Contact | null> {
        const found = db().contacts.find((contact) => contact.id === id);
        return found ? clone(found) : null;
    }

    async create(input: ContactCreate): Promise<Contact> {
        const contact: Contact = {
            ...input,
            id: nextId('contact'),
            fullName: fullNameOf(input.firstName, input.lastName),
            createdOn: new Date().toISOString(),
        };
        db().contacts.push(contact);
        return clone(contact);
    }

    async update(id: string, patch: Partial<ContactCreate>): Promise<Contact> {
        const index = db().contacts.findIndex((contact) => contact.id === id);
        if (index === -1) throw new Error(`Contact ${id} not found`);
        const merged = { ...db().contacts[index], ...patch };
        const next: Contact = { ...merged, fullName: fullNameOf(merged.firstName, merged.lastName) };
        db().contacts[index] = next;
        return clone(next);
    }

    async remove(id: string): Promise<void> {
        const index = db().contacts.findIndex((contact) => contact.id === id);
        if (index === -1) throw new Error(`Contact ${id} not found`);
        db().contacts.splice(index, 1);
    }
}
