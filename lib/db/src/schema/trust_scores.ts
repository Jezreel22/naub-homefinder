import { pgTable, integer, timestamp, uuid, real } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const trustScoresTable = pgTable("trust_scores", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull().unique().references(() => usersTable.id, { onDelete: "cascade" }),

  total_score: integer("total_score").default(0),

  identity_verification_points: integer("identity_verification_points").default(0),
  property_verification_points: integer("property_verification_points").default(0),
  transaction_completion_points: integer("transaction_completion_points").default(0),
  ratings_average_points: integer("ratings_average_points").default(0),
  fraud_report_deduction: integer("fraud_report_deduction").default(0),
  tenure_bonus_points: integer("tenure_bonus_points").default(0),

  total_transactions: integer("total_transactions").default(0),
  completed_transactions: integer("completed_transactions").default(0),
  average_rating: real("average_rating").default(0),
  fraud_reports_count: integer("fraud_reports_count").default(0),

  last_recomputed_at: timestamp("last_recomputed_at").defaultNow(),
});

export type TrustScore = typeof trustScoresTable.$inferSelect;
export type InsertTrustScore = typeof trustScoresTable.$inferInsert;
