import { db, usersTable, bookingsTable, ratingsTable, disputesTable, trustScoresTable } from "@workspace/db";
import { eq, and, count, avg, sum } from "drizzle-orm";

export async function recomputeTrustScore(userId: string): Promise<void> {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) return;

  let identityPoints = 0;
  let propertyPoints = 0;
  let completionPoints = 0;
  let ratingPoints = 0;
  let fraudDeduction = 0;
  let tenurePoints = 0;

  // Identity Verification: +10 if national ID verified
  if (user.national_id_verified_at) identityPoints = 10;

  // Tenure bonus
  const monthsActive = user.created_at
    ? Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30))
    : 0;
  if (monthsActive >= 12) tenurePoints = 15;
  else if (monthsActive >= 6) tenurePoints = 10;
  else if (monthsActive >= 3) tenurePoints = 5;

  // Transaction completion rate
  const landlordBookings = await db
    .select()
    .from(bookingsTable)
    .where(eq(bookingsTable.landlord_id, userId));

  const total = landlordBookings.length;
  const completed = landlordBookings.filter(b => b.booking_status === "completed").length;

  if (total > 0) {
    const rate = completed / total;
    if (rate >= 0.9) completionPoints = 20;
    else if (rate >= 0.75) completionPoints = 15;
    else if (rate >= 0.5) completionPoints = 10;
  }

  // Average rating
  const userRatings = await db
    .select()
    .from(ratingsTable)
    .where(eq(ratingsTable.ratee_id, userId));

  const avgRating = userRatings.length
    ? userRatings.reduce((s, r) => s + r.stars, 0) / userRatings.length
    : 0;

  if (avgRating >= 4.5) ratingPoints = 15;
  else if (avgRating >= 4.0) ratingPoints = 12;
  else if (avgRating >= 3.5) ratingPoints = 9;
  else if (avgRating >= 3.0) ratingPoints = 6;

  // Fraud reports
  const substantiatedDisputes = await db
    .select()
    .from(disputesTable)
    .where(and(
      eq(disputesTable.landlord_id, userId),
      eq(disputesTable.adjudication_decision, "fraud_substantiated")
    ));
  fraudDeduction = substantiatedDisputes.length * 20;

  const total_score = Math.max(0, Math.min(100,
    identityPoints + propertyPoints + completionPoints + ratingPoints + tenurePoints - fraudDeduction
  ));

  const existing = await db.select().from(trustScoresTable).where(eq(trustScoresTable.user_id, userId));

  const scoreData = {
    total_score,
    identity_verification_points: identityPoints,
    property_verification_points: propertyPoints,
    transaction_completion_points: completionPoints,
    ratings_average_points: ratingPoints,
    fraud_report_deduction: fraudDeduction,
    tenure_bonus_points: tenurePoints,
    total_transactions: total,
    completed_transactions: completed,
    average_rating: parseFloat(avgRating.toFixed(2)),
    fraud_reports_count: substantiatedDisputes.length,
    last_recomputed_at: new Date(),
  };

  if (existing.length > 0) {
    await db.update(trustScoresTable).set(scoreData).where(eq(trustScoresTable.user_id, userId));
  } else {
    await db.insert(trustScoresTable).values({ user_id: userId, ...scoreData });
  }
}

export async function getTrustScore(userId: string) {
  const [score] = await db.select().from(trustScoresTable).where(eq(trustScoresTable.user_id, userId));
  return score ?? null;
}
