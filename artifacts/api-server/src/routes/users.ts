import { Router } from "express";
import { db, usersTable, trustScoresTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth-middleware";
import { getTrustScore, recomputeTrustScore } from "../lib/trust-score";

const router = Router();

router.get("/users/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id));
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    const { password_hash: _, ...safe } = user;
    const trust_score = await getTrustScore(user.id);
    res.json({ ...safe, trust_score });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/users/:id", async (req, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, String(req.params.id)));
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    const { password_hash: _, ...safe } = user;
    const trust_score = await getTrustScore(user.id);
    res.json({ ...safe, trust_score });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/users/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (req.user!.id !== String(req.params.id) && req.user!.role !== "escrow_officer") {
      res.status(403).json({ error: "Cannot update another user's profile" }); return;
    }
    const { first_name, last_name, phone_number, profile_photo_url,
            national_id_type, national_id_document_url, selfie_url, letter_of_agency_url } = req.body;

    const updates: Record<string, any> = {};
    if (first_name !== undefined) updates.first_name = first_name;
    if (last_name !== undefined) updates.last_name = last_name;
    if (phone_number !== undefined) updates.phone_number = phone_number;
    if (profile_photo_url !== undefined) updates.profile_photo_url = profile_photo_url;
    if (national_id_type !== undefined) updates.national_id_type = national_id_type;
    if (national_id_document_url !== undefined) {
      updates.national_id_document_url = national_id_document_url;
      // If selfie is also being submitted together, auto-verify immediately
      if (selfie_url !== undefined) {
        updates.verification_status = "verified";
        updates.national_id_verified_at = new Date();
        updates.selfie_verified_at = new Date();
      } else {
        updates.verification_status = "pending";
      }
    }
    if (selfie_url !== undefined) updates.selfie_url = selfie_url;
    if (letter_of_agency_url !== undefined) updates.letter_of_agency_url = letter_of_agency_url;

    const [updated] = await db.update(usersTable)
      .set({ ...updates, updated_at: new Date() })
      .where(eq(usersTable.id, String(req.params.id)))
      .returning();

    const { password_hash: _, ...safe } = updated;
    res.json(safe);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/users/:id/trust-score", async (req, res) => {
  try {
    await recomputeTrustScore(String(req.params.id));
    const score = await getTrustScore(String(req.params.id));
    if (!score) { res.status(404).json({ error: "Trust score not found" }); return; }
    res.json(score);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
