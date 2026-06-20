import { pgTable, text, integer, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { bookingsTable } from "./bookings";

export const disputesTable = pgTable("disputes", {
  id: uuid("id").primaryKey().defaultRandom(),
  booking_id: uuid("booking_id").notNull().references(() => bookingsTable.id),
  student_id: uuid("student_id").notNull().references(() => usersTable.id),
  landlord_id: uuid("landlord_id").notNull().references(() => usersTable.id),

  reason: text("reason").notNull(),
  description: text("description").notNull(),

  student_evidence: jsonb("student_evidence"),
  landlord_response: text("landlord_response"),
  landlord_response_evidence: jsonb("landlord_response_evidence"),

  escrow_officer_id: uuid("escrow_officer_id").references(() => usersTable.id),
  adjudication_notes: text("adjudication_notes"),
  adjudication_decision: text("adjudication_decision"),
  refund_percentage_to_student: integer("refund_percentage_to_student"),

  dispute_status: text("dispute_status").default("open"),

  created_at: timestamp("created_at").defaultNow(),
  resolved_at: timestamp("resolved_at"),
});

export type Dispute = typeof disputesTable.$inferSelect;
export type InsertDispute = typeof disputesTable.$inferInsert;
