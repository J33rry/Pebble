import { AppError } from "../../lib/AppError.js";
import * as repo from "./contacts.repository.js";

export async function listContacts(userId) {
    const rawContacts = await repo.findUserContacts(userId);
    return rawContacts.map(c => ({
        id: c.id,
        userId: c.userId,
        contactId: c.contactId,
        status: c.status,
        createdAt: c.createdAt,
        contactUser: {
            id: c.userId === userId ? c.contactId : c.userId,
            username: c.contactUsername,
            displayName: c.contactDisplayName,
            avatarUrl: c.contactAvatarUrl,
            lastSeenAt: c.contactLastSeenAt,
        }
    }));
}

export async function addContact(userId, contactId) {
    if (userId === contactId) {
        throw new AppError(400, "Cannot add yourself as a contact", "SELF_CONTACT");
    }

    const existing = await repo.findContactPair(userId, contactId);
    if (existing) {
        throw new AppError(409, "Contact request already exists", "DUPLICATE_CONTACT");
    }

    return repo.createContact({ userId, contactId, status: "pending" });
}

export async function updateContact(userId, contactId, status) {
    const contact = await repo.findContactById(contactId);
    if (!contact) throw new AppError(404, "Contact not found", "NOT_FOUND");

    // Only the recipient of the request can accept/reject
    if (contact.contactId !== userId) {
        throw new AppError(403, "Only the recipient can respond to a contact request", "FORBIDDEN");
    }

    if (contact.status !== "pending") {
        throw new AppError(409, "This request has already been answered", "ALREADY_ANSWERED");
    }

    return status === "accepted"
        ? repo.acceptContact(contact)
        : repo.updateContactStatus(contactId, status);
}

export async function removeContact(userId, contactId) {
    const contact = await repo.findContactById(contactId);
    if (!contact) throw new AppError(404, "Contact not found", "NOT_FOUND");

    if (contact.userId !== userId && contact.contactId !== userId) {
        throw new AppError(403, "Forbidden", "FORBIDDEN");
    }

    await repo.deleteContactPair(contact.userId, contact.contactId);
}
