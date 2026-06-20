import { pgTable, text, integer, boolean, timestamp, uuid, jsonb, real } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const propertiesTable = pgTable("properties", {
  id: uuid("id").primaryKey().defaultRandom(),
  landlord_id: uuid("landlord_id").notNull().references(() => usersTable.id),

  address: text("address").notNull(),
  latitude: real("latitude"),
  longitude: real("longitude"),

  rent_amount_ngn: integer("rent_amount_ngn").notNull(),
  deposit_amount_ngn: integer("deposit_amount_ngn").notNull(),
  lease_duration_days: integer("lease_duration_days"),

  rooms: integer("rooms").default(1),
  amenities: jsonb("amenities").$type<Record<string, boolean>>(),
  house_rules: text("house_rules"),
  description: text("description"),

  occupancy_code: text("occupancy_code").notNull().unique(),

  geolocation_verified_at: timestamp("geolocation_verified_at"),
  listing_status: text("listing_status").default("draft"),
  published_at: timestamp("published_at"),

  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export type Property = typeof propertiesTable.$inferSelect;
export type InsertProperty = typeof propertiesTable.$inferInsert;
