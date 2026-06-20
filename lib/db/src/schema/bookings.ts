import { pgTable, text, integer, timestamp, uuid, real, date } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { propertiesTable } from "./properties";

export const bookingsTable = pgTable("bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  student_id: uuid("student_id").notNull().references(() => usersTable.id),
  property_id: uuid("property_id").notNull().references(() => propertiesTable.id),
  landlord_id: uuid("landlord_id").notNull().references(() => usersTable.id),

  lease_start_date: date("lease_start_date"),
  lease_duration_days: integer("lease_duration_days"),
  lease_end_date: date("lease_end_date"),

  rent_amount_ngn: integer("rent_amount_ngn").notNull(),
  deposit_amount_ngn: integer("deposit_amount_ngn").notNull(),
  total_amount_ngn: integer("total_amount_ngn").notNull(),

  escrow_account_reference: text("escrow_account_reference"),
  payment_method: text("payment_method"),
  payment_transaction_id: text("payment_transaction_id"),
  funds_received_at: timestamp("funds_received_at"),

  occupancy_verified_at: timestamp("occupancy_verified_at"),
  occupancy_confirmed_by_student_at: timestamp("occupancy_confirmed_by_student_at"),
  occupancy_gps_latitude: real("occupancy_gps_latitude"),
  occupancy_gps_longitude: real("occupancy_gps_longitude"),
  occupancy_code_entered: text("occupancy_code_entered"),
  occupancy_verification_photo_url: text("occupancy_verification_photo_url"),
  occupancy_attempts: integer("occupancy_attempts").default(0),

  escrow_released_at: timestamp("escrow_released_at"),
  escrow_release_reason: text("escrow_release_reason"),

  dispute_filed_at: timestamp("dispute_filed_at"),
  dispute_status: text("dispute_status").default("no_dispute"),
  dispute_adjudication_date: timestamp("dispute_adjudication_date"),
  dispute_outcome: text("dispute_outcome"),

  booking_status: text("booking_status").default("pending_payment"),

  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export type Booking = typeof bookingsTable.$inferSelect;
export type InsertBooking = typeof bookingsTable.$inferInsert;
