import { db } from "../../db/index.js";
import { contacts, users } from "../../db/schema/index.js";
import { eq, and, or, sql } from "drizzle-orm";

export async function findUserContacts(userId) {
    return db
        .select({
            id: contacts.id,
            userId: contacts.userId,
            contactId: contacts.contactId,
            status: contacts.status,
            createdAt: contacts.createdAt,
            contactUsername: users.username,
            contactDisplayName: users.displayName,
            contactAvatarUrl: users.avatarUrl,
            contactLastSeenAt: users.lastSeenAt,
        })
        .from(contacts)
        .innerJoin(
            users,
            sql`${users.id} = CASE WHEN ${contacts.userId} = ${userId} THEN ${contacts.contactId} ELSE ${contacts.userId} END`
        )
        .where(or(eq(contacts.userId, userId), eq(contacts.contactId, userId)));
}

export async function findContactPair(userId, contactId) {
    const [contact] = await db
        .select()
        .from(contacts)
        .where(
            and(eq(contacts.userId, userId), eq(contacts.contactId, contactId)),
        )
        .limit(1);
    return contact;
}

export async function findContactById(id) {
    const [contact] = await db
        .select()
        .from(contacts)
        .where(eq(contacts.id, id))
        .limit(1);
    return contact;
}

export async function createContact(data) {
    const [contact] = await db.insert(contacts).values(data).returning();
    return contact;
}

export async function updateContactStatus(id, status) {
    const [contact] = await db
        .update(contacts)
        .set({ status, updatedAt: new Date() })
        .where(eq(contacts.id, id))
        .returning();
    return contact;
}

// A contact is two rows, one per direction, which must always change together.
export async function acceptContact(contact) {
    return db.transaction(async (tx) => {
        const now = new Date();
        const [updated] = await tx
            .update(contacts)
            .set({ status: "accepted", updatedAt: now })
            .where(eq(contacts.id, contact.id))
            .returning();

        await tx
            .insert(contacts)
            .values({
                userId: contact.contactId,
                contactId: contact.userId,
                status: "accepted",
            })
            .onConflictDoUpdate({
                target: [contacts.userId, contacts.contactId],
                set: { status: "accepted", updatedAt: now },
            });

        return updated;
    });
}

export async function deleteContactPair(userA, userB) {
    await db
        .delete(contacts)
        .where(
            or(
                and(eq(contacts.userId, userA), eq(contacts.contactId, userB)),
                and(eq(contacts.userId, userB), eq(contacts.contactId, userA)),
            ),
        );
}
