import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { bookingsTable } from "./bookings";

export const messagesTable = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  sender_id: uuid("sender_id").notNull().references(() => usersTable.id),
  recipient_id: uuid("recipient_id").notNull().references(() => usersTable.id),
  booking_id: uuid("booking_id").references(() => bookingsTable.id),

  message_text: text("message_text").notNull(),
  message_type: text("message_type").default("text"),
  attachment_url: text("attachment_url"),

  read_at: timestamp("read_at"),
  created_at: timestamp("created_at").defaultNow(),
});

export type Message = typeof messagesTable.$inferSelect;
export type InsertMessage = typeof messagesTable.$inferInsert;
