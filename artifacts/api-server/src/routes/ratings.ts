import { Router } from "express";
import { db, usersTable, ratingsTable, bookingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth-middleware";
import { recomputeTrustScore } from "../lib/trust-score";

const router = Router();

router.post("/ratings", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { booking_id, ratee_id, stars, rating_type, review_text } = req.body;
    if (!booking_id || !ratee_id || !stars || !rating_type) {
      res.status(400).json({ error: "booking_id, ratee_id, stars, rating_type are required" }); return;
    }
    if (stars < 1 || stars > 5) {
      res.status(400).json({ error: "Stars must be between 1 and 5" }); return;
    }

    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, booking_id));
    if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }
    if (!["completed", "pending_review"].includes(booking.booking_status ?? "")) {
      res.status(400).json({ error: "Can only rate after occupancy is confirmed" }); return;
    }

    const [rating] = await db.insert(ratingsTable).values({
      booking_id,
      rater_id: req.user!.id,
      ratee_id,
      rating_type,
      stars: parseInt(stars),
      review_text: review_text ?? null,
    }).returning();

    await recomputeTrustScore(ratee_id);

    const [rater] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id));
    res.status(201).json({
      ...rating,
      rater: rater ? { id: rater.id, first_name: rater.first_name, last_name: rater.last_name, profile_photo_url: rater.profile_photo_url, role: rater.role } : null,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/ratings", async (req, res) => {
  try {
    const { ratee_id } = req.query;
    if (!ratee_id) { res.status(400).json({ error: "ratee_id is required" }); return; }

    const ratings = await db.select().from(ratingsTable).where(eq(ratingsTable.ratee_id, ratee_id as string));

    const enriched = await Promise.all(ratings.map(async (r) => {
      const [rater] = await db.select().from(usersTable).where(eq(usersTable.id, r.rater_id));
      return {
        ...r,
        rater: rater ? { id: rater.id, first_name: rater.first_name, last_name: rater.last_name, profile_photo_url: rater.profile_photo_url, role: rater.role } : null,
      };
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
