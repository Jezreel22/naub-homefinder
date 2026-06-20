import { pgTable, text, integer, timestamp, uuid, check } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { bookingsTable } from "./bookings";
import { sql } from "drizzle-orm";

export const ratingsTable = pgTable("ratings", {
  id: uuid("id").primaryKey().defaultRandom(),
  booking_id: uuid("booking_id").notNull().references(() => bookingsTable.id, { onDelete: "cascade" }),
  rater_id: uuid("rater_id").notNull().references(() => usersTable.id),
  ratee_id: uuid("ratee_id").notNull().references(() => usersTable.id),

  rating_type: text("rating_type").notNull(),
  stars: integer("stars").notNull(),
  review_text: text("review_text"),

  created_at: timestamp("created_at").defaultNow(),
});

export type Rating = typeof ratingsTable.$inferSelect;
export type InsertRating = typeof ratingsTable.$inferInsert;
