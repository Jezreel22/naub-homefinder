import { pgTable, text, integer, boolean, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import { propertiesTable } from "./properties";

export const propertyPhotosTable = pgTable("property_photos", {
  id: uuid("id").primaryKey().defaultRandom(),
  property_id: uuid("property_id").notNull().references(() => propertiesTable.id, { onDelete: "cascade" }),

  photo_url: text("photo_url").notNull(),
  photo_order: integer("photo_order").default(0),
  exif_metadata: jsonb("exif_metadata"),
  flagged_as_stock: boolean("flagged_as_stock").default(false),
  flagged_reason: text("flagged_reason"),

  uploaded_at: timestamp("uploaded_at").defaultNow(),
});

export type PropertyPhoto = typeof propertyPhotosTable.$inferSelect;
export type InsertPropertyPhoto = typeof propertyPhotosTable.$inferInsert;
