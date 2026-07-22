// PROTOTYPE-ONLY — In-Memory-Implementierung des ContactRepository-Ports.
// Am Fork ersetzt durch SupabaseContactRepository (R4) bzw. DataverseContactRepository (R5).
import type { Contact } from '@/domain/Contact';
import type { ContactCreate, ContactRepository } from '../../ports/ContactRepository';
import { db, nextId } from './store';

// company ist ein Lookup-Objekt → mitkopieren, damit der Store isoliert bleibt.
const clone = (contact: Contact): Contact => ({ ...contact, company: { ...contact.company } });

// fullName ist berechnet/read-only → immer aus dem finalen Namen ableiten, nie durchreichen.
const fullNameOf = (firstName: string, lastName: string): string => `${firstName} ${lastName}`;

export class MockContactRepository implements ContactRepository {
    async list(): Promise<Contact[]> {
        return db.contacts.map(clone);
    }

    async get(id: string): Promise<Contact | null> {
        const found = db.contacts.find((contact) => contact.id === id);
        return found ? clone(found) : null;
    }

    async create(input: ContactCreate): Promise<Contact> {
        const contact: Contact = {
            ...input,
            id: nextId('contact'),
            fullName: fullNameOf(input.firstName, input.lastName),
            createdOn: new Date().toISOString(),
        };
        db.contacts.push(contact);
        return clone(contact);
    }

    async update(id: string, patch: Partial<ContactCreate>): Promise<Contact> {
        const index = db.contacts.findIndex((contact) => contact.id === id);
        if (index === -1) throw new Error(`Contact ${id} not found`);
        const merged = { ...db.contacts[index], ...patch };
        const next: Contact = { ...merged, fullName: fullNameOf(merged.firstName, merged.lastName) };
        db.contacts[index] = next;
        return clone(next);
    }

    async remove(id: string): Promise<void> {
        const index = db.contacts.findIndex((contact) => contact.id === id);
        if (index === -1) throw new Error(`Contact ${id} not found`);
        db.contacts.splice(index, 1);
    }
}
