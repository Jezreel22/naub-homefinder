import { Router } from "express";
import { db, usersTable, messagesTable } from "@workspace/db";
import { eq, or, and, desc } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth-middleware";

const router = Router();

router.get("/messages", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    // Get all messages involving this user
    const msgs = await db.select().from(messagesTable)
      .where(or(eq(messagesTable.sender_id, userId), eq(messagesTable.recipient_id, userId)))
      .orderBy(desc(messagesTable.created_at));

    // Group by conversation partner
    const conversationMap = new Map<string, any>();
    for (const msg of msgs) {
      const otherId = msg.sender_id === userId ? msg.recipient_id : msg.sender_id;
      if (!conversationMap.has(otherId)) {
        conversationMap.set(otherId, msg);
      }
    }

    const conversations = await Promise.all(
      Array.from(conversationMap.entries()).map(async ([otherId, lastMsg]) => {
        const [other] = await db.select().from(usersTable).where(eq(usersTable.id, otherId));
        const unreadCount = msgs.filter(m =>
          m.sender_id === otherId && m.recipient_id === userId && !m.read_at
        ).length;

        return {
          other_user: other ? {
            id: other.id,
            first_name: other.first_name,
            last_name: other.last_name,
            profile_photo_url: other.profile_photo_url,
            role: other.role,
            verification_status: other.verification_status,
          } : null,
          last_message: lastMsg.message_text,
          last_message_at: lastMsg.created_at,
          unread_count: unreadCount,
        };
      })
    );

    res.json(conversations);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/messages/:userId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const myId = req.user!.id;
    const otherId = String(req.params.userId);

    const msgs = await db.select().from(messagesTable)
      .where(or(
        and(eq(messagesTable.sender_id, myId), eq(messagesTable.recipient_id, otherId)),
        and(eq(messagesTable.sender_id, otherId), eq(messagesTable.recipient_id, myId))
      ))
      .orderBy(messagesTable.created_at);

    // Mark received messages as read
    await db.update(messagesTable).set({ read_at: new Date() })
      .where(and(eq(messagesTable.sender_id, otherId), eq(messagesTable.recipient_id, myId)));

    const enriched = await Promise.all(msgs.map(async (m) => {
      const [sender] = await db.select().from(usersTable).where(eq(usersTable.id, m.sender_id));
      return {
        ...m,
        sender: sender ? {
          id: sender.id, first_name: sender.first_name, last_name: sender.last_name,
          profile_photo_url: sender.profile_photo_url, role: sender.role,
        } : null,
      };
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/messages", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { recipient_id, message_text, booking_id } = req.body;
    if (!recipient_id || !message_text) {
      res.status(400).json({ error: "recipient_id and message_text are required" }); return;
    }

    const [msg] = await db.insert(messagesTable).values({
      sender_id: req.user!.id,
      recipient_id,
      message_text,
      booking_id: booking_id ?? null,
      message_type: "text",
    }).returning();

    const [sender] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id));
    res.status(201).json({
      ...msg,
      sender: sender ? { id: sender.id, first_name: sender.first_name, last_name: sender.last_name, profile_photo_url: sender.profile_photo_url, role: sender.role } : null,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
