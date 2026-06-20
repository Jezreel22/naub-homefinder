import { Router } from "express";
import { db, usersTable, propertiesTable, propertyPhotosTable } from "@workspace/db";
import { eq, and, asc, desc } from "drizzle-orm";
import { requireAuth, requireRole, type AuthRequest } from "../lib/auth-middleware";
import { recomputeTrustScore, getTrustScore } from "../lib/trust-score";

const router = Router();

const adminOnly = [requireAuth, requireRole("escrow_officer")];

// GET /admin/verifications — users pending verification
router.get("/admin/verifications", ...adminOnly, async (req, res) => {
  try {
    const users = await db.select().from(usersTable)
      .where(eq(usersTable.verification_status, "pending"));
    const safe = users.map(({ password_hash: _, ...u }) => u);
    res.json(safe);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /admin/verifications/:id/approve
router.post("/admin/verifications/:id/approve", ...adminOnly, async (req: AuthRequest, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, String(req.params.id)));
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    await db.update(usersTable).set({
      verification_status: "verified",
      national_id_verified_at: new Date(),
      updated_at: new Date(),
    }).where(eq(usersTable.id, String(req.params.id)));

    await recomputeTrustScore(String(req.params.id));
    res.json({ message: "User verification approved" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /admin/verifications/:id/reject
router.post("/admin/verifications/:id/reject", ...adminOnly, async (req: AuthRequest, res) => {
  try {
    const { reason } = req.body;
    await db.update(usersTable).set({
      verification_status: "rejected",
      suspension_reason: reason,
      updated_at: new Date(),
    }).where(eq(usersTable.id, String(req.params.id)));
    res.json({ message: "User verification rejected" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /admin/users/:id/suspend
router.post("/admin/users/:id/suspend", ...adminOnly, async (req: AuthRequest, res) => {
  try {
    const { reason } = req.body;
    await db.update(usersTable).set({
      account_suspended: true,
      suspension_reason: reason,
      updated_at: new Date(),
    }).where(eq(usersTable.id, String(req.params.id)));
    res.json({ message: "User suspended" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /admin/pending-properties
router.get("/admin/pending-properties", ...adminOnly, async (req, res) => {
  try {
    const props = await db.select().from(propertiesTable)
      .where(eq(propertiesTable.listing_status, "pending_review"))
      .orderBy(asc(propertiesTable.created_at));

    const result = await Promise.all(props.map(async (p) => {
      const [landlord] = await db.select().from(usersTable).where(eq(usersTable.id, p.landlord_id));
      const [heroPhoto] = await db.select().from(propertyPhotosTable)
        .where(eq(propertyPhotosTable.property_id, p.id))
        .orderBy(asc(propertyPhotosTable.photo_order)).limit(1);
      const { password_hash: _, ...safeLandlord } = landlord ?? { password_hash: "" } as any;
      const ts = await getTrustScore(p.landlord_id);
      return {
        id: p.id, address: p.address, rent_amount_ngn: p.rent_amount_ngn,
        deposit_amount_ngn: p.deposit_amount_ngn, rooms: p.rooms,
        listing_status: p.listing_status, amenities: p.amenities, created_at: p.created_at,
        hero_photo_url: heroPhoto?.photo_url ?? null,
        trust_score: ts?.total_score ?? 0,
        landlord: { ...safeLandlord, trust_score: ts },
      };
    }));

    res.json({ data: result, total: result.length, page: 1, page_size: result.length });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /admin/properties/:id/approve
router.post("/admin/properties/:id/approve", ...adminOnly, async (req: AuthRequest, res) => {
  try {
    const [prop] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, String(req.params.id)));
    if (!prop) { res.status(404).json({ error: "Property not found" }); return; }

    await db.update(propertiesTable).set({
      listing_status: "live",
      published_at: new Date(),
      geolocation_verified_at: new Date(),
      updated_at: new Date(),
    }).where(eq(propertiesTable.id, String(req.params.id)));

    await recomputeTrustScore(prop.landlord_id);
    res.json({ message: "Property approved and now live" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /admin/properties/:id/reject
router.post("/admin/properties/:id/reject", ...adminOnly, async (req: AuthRequest, res) => {
  try {
    const { reason } = req.body;
    await db.update(propertiesTable).set({
      listing_status: "hidden",
      house_rules: reason ? `REJECTED: ${reason}` : undefined,
      updated_at: new Date(),
    }).where(eq(propertiesTable.id, String(req.params.id)));
    res.json({ message: "Property rejected" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
