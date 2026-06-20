import { pgTable, text, boolean, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique().notNull(),
  password_hash: text("password_hash"),
  google_id: text("google_id").unique(),
  role: text("role").notNull(),

  first_name: text("first_name"),
  last_name: text("last_name"),
  phone_number: text("phone_number"),
  profile_photo_url: text("profile_photo_url"),

  matriculation_number: text("matriculation_number").unique(),
  naub_verified_at: timestamp("naub_verified_at"),

  national_id_type: text("national_id_type"),
  national_id_document_url: text("national_id_document_url"),
  national_id_verified_at: timestamp("national_id_verified_at"),
  selfie_url: text("selfie_url"),
  selfie_verified_at: timestamp("selfie_verified_at"),
  property_document_url: text("property_document_url"),
  kyc_submitted_at: timestamp("kyc_submitted_at"),

  letter_of_agency_url: text("letter_of_agency_url"),
  letter_of_agency_verified_at: timestamp("letter_of_agency_verified_at"),
  sponsoring_landlord_id: uuid("sponsoring_landlord_id"),

  verification_status: text("verification_status").default("pending"),
  account_suspended: boolean("account_suspended").default(false),
  suspension_reason: text("suspension_reason"),

  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
