import { Router } from "express";
import { db, usersTable, propertiesTable, propertyPhotosTable, trustScoresTable } from "@workspace/db";
import { eq, and, gte, lte, sql, desc, asc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth-middleware";
import { recomputeTrustScore, getTrustScore } from "../lib/trust-score";

const router = Router();

function generateOccupancyCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function buildPropertySummary(prop: any, landlord: any, trustScore: any, heroPhoto: any) {
  return {
    id: prop.id,
    landlord_id: prop.landlord_id,
    address: prop.address,
    rent_amount_ngn: prop.rent_amount_ngn,
    deposit_amount_ngn: prop.deposit_amount_ngn,
    rooms: prop.rooms,
    listing_status: prop.listing_status,
    amenities: prop.amenities,
    created_at: prop.created_at,
    hero_photo_url: heroPhoto?.photo_url ?? null,
    trust_score: trustScore?.total_score ?? 0,
    landlord: landlord ? {
      id: landlord.id,
      first_name: landlord.first_name,
      last_name: landlord.last_name,
      profile_photo_url: landlord.profile_photo_url,
      role: landlord.role,
      verification_status: landlord.verification_status,
      average_rating: trustScore?.average_rating ?? null,
    } : null,
  };
}

// GET /properties — search
router.get("/properties/my", requireAuth, async (req: AuthRequest, res) => {
  try {
    const props = await db.select().from(propertiesTable)
      .where(eq(propertiesTable.landlord_id, req.user!.id))
      .orderBy(desc(propertiesTable.created_at));

    const result = await Promise.all(props.map(async (p) => {
      const [landlord] = await db.select().from(usersTable).where(eq(usersTable.id, p.landlord_id));
      const [heroPhoto] = await db.select().from(propertyPhotosTable)
        .where(eq(propertyPhotosTable.property_id, p.id))
        .orderBy(asc(propertyPhotosTable.photo_order)).limit(1);
      const ts = await getTrustScore(p.landlord_id);
      return buildPropertySummary(p, landlord, ts, heroPhoto);
    }));

    res.json({ data: result, total: result.length, page: 1, page_size: result.length });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/properties", async (req, res) => {
  try {
    const { rent_min, rent_max, rooms, sort = "newest", page = "1", page_size = "20", q } = req.query as Record<string, string>;
    const pageNum = parseInt(page) || 1;
    const pageSize = Math.min(parseInt(page_size) || 20, 50);

    const conditions: any[] = [eq(propertiesTable.listing_status, "live")];
    if (rent_min) conditions.push(gte(propertiesTable.rent_amount_ngn, parseInt(rent_min)));
    if (rent_max) conditions.push(lte(propertiesTable.rent_amount_ngn, parseInt(rent_max)));
    if (rooms) conditions.push(eq(propertiesTable.rooms, parseInt(rooms)));

    const orderBy = sort === "cheapest"
      ? asc(propertiesTable.rent_amount_ngn)
      : desc(propertiesTable.published_at);

    const props = await db.select().from(propertiesTable)
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(pageSize)
      .offset((pageNum - 1) * pageSize);

    const [{ cnt }] = await db.select({ cnt: sql<number>`count(*)::int` })
      .from(propertiesTable).where(and(...conditions));

    const result = await Promise.all(props.map(async (p) => {
      const [landlord] = await db.select().from(usersTable).where(eq(usersTable.id, p.landlord_id));
      const [heroPhoto] = await db.select().from(propertyPhotosTable)
        .where(eq(propertyPhotosTable.property_id, p.id))
        .orderBy(asc(propertyPhotosTable.photo_order)).limit(1);
      const ts = await getTrustScore(p.landlord_id);
      return buildPropertySummary(p, landlord, ts, heroPhoto);
    }));

    res.json({ data: result, total: cnt, page: pageNum, page_size: pageSize });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /properties — create
router.post("/properties", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { role } = req.user!;
    if (!["landlord", "agent", "escrow_officer"].includes(role)) {
      res.status(403).json({ error: "Only landlords and agents can list properties" }); return;
    }

    const { address, rent_amount_ngn, deposit_amount_ngn, rooms = 1, amenities,
            house_rules, description, latitude, longitude, lease_duration_days } = req.body;

    if (!address || !rent_amount_ngn || !deposit_amount_ngn) {
      res.status(400).json({ error: "address, rent_amount_ngn, and deposit_amount_ngn are required" }); return;
    }

    let occupancy_code = generateOccupancyCode();
    // Ensure uniqueness
    const existing = await db.select({ id: propertiesTable.id })
      .from(propertiesTable).where(eq(propertiesTable.occupancy_code, occupancy_code));
    if (existing.length > 0) occupancy_code = generateOccupancyCode() + "X";

    const [prop] = await db.insert(propertiesTable).values({
      landlord_id: req.user!.id,
      address,
      rent_amount_ngn: parseInt(rent_amount_ngn),
      deposit_amount_ngn: parseInt(deposit_amount_ngn),
      rooms: parseInt(rooms) || 1,
      amenities: amenities ?? {},
      house_rules: house_rules ?? null,
      description: description ?? null,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      lease_duration_days: lease_duration_days ? parseInt(lease_duration_days) : null,
      occupancy_code,
      listing_status: "draft",
      geolocation_verified_at: latitude && longitude ? new Date() : null,
    }).returning();

    await recomputeTrustScore(req.user!.id);
    res.status(201).json({ ...prop, photos: [], ratings: [], landlord: null, trust_score: 0 });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /properties/:id
router.get("/properties/:id", async (req, res) => {
  try {
    const [prop] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, String(req.params.id)));
    if (!prop) { res.status(404).json({ error: "Property not found" }); return; }

    const [landlord] = await db.select().from(usersTable).where(eq(usersTable.id, prop.landlord_id));
    const { password_hash: _, ...safeLandlord } = landlord ?? { password_hash: "" } as any;
    const ts = await getTrustScore(prop.landlord_id);
    const photos = await db.select().from(propertyPhotosTable)
      .where(eq(propertyPhotosTable.property_id, prop.id))
      .orderBy(asc(propertyPhotosTable.photo_order));

    res.json({
      ...prop,
      photos,
      ratings: [],
      landlord: { ...safeLandlord, trust_score: ts },
      trust_score: ts?.total_score ?? 0,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /properties/:id
router.put("/properties/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [prop] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, String(req.params.id)));
    if (!prop) { res.status(404).json({ error: "Property not found" }); return; }
    if (prop.landlord_id !== req.user!.id && req.user!.role !== "escrow_officer") {
      res.status(403).json({ error: "Not your property" }); return;
    }

    const updates = req.body;
    delete updates.id; delete updates.landlord_id; delete updates.occupancy_code;

    const [updated] = await db.update(propertiesTable)
      .set({ ...updates, updated_at: new Date() })
      .where(eq(propertiesTable.id, String(req.params.id)))
      .returning();

    res.json({ ...updated, photos: [], landlord: null, trust_score: 0 });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /properties/:id
router.delete("/properties/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [prop] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, String(req.params.id)));
    if (!prop) { res.status(404).json({ error: "Property not found" }); return; }
    if (prop.landlord_id !== req.user!.id && req.user!.role !== "escrow_officer") {
      res.status(403).json({ error: "Not your property" }); return;
    }
    await db.update(propertiesTable)
      .set({ listing_status: "deleted", updated_at: new Date() })
      .where(eq(propertiesTable.id, String(req.params.id)));
    res.json({ message: "Property deleted" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /properties/:id/photos
router.post("/properties/:id/photos", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [prop] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, String(req.params.id)));
    if (!prop) { res.status(404).json({ error: "Property not found" }); return; }
    if (prop.landlord_id !== req.user!.id && req.user!.role !== "escrow_officer") {
      res.status(403).json({ error: "Not your property" }); return;
    }

    const { photos } = req.body;
    if (!Array.isArray(photos) || photos.length === 0) {
      res.status(400).json({ error: "photos array required" }); return;
    }

    await db.insert(propertyPhotosTable).values(
      photos.map((p: any) => ({
        property_id: prop.id,
        photo_url: p.photo_url,
        photo_order: p.photo_order ?? 0,
      }))
    );

    res.status(201).json({ message: "Photos added" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /properties/:id/publish
router.post("/properties/:id/publish", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [prop] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, String(req.params.id)));
    if (!prop) { res.status(404).json({ error: "Property not found" }); return; }
    if (prop.landlord_id !== req.user!.id && req.user!.role !== "escrow_officer") {
      res.status(403).json({ error: "Not your property" }); return;
    }

    const newStatus = req.user!.role === "escrow_officer" ? "live" : "pending_review";
    const [updated] = await db.update(propertiesTable)
      .set({ listing_status: newStatus, published_at: newStatus === "live" ? new Date() : prop.published_at, updated_at: new Date() })
      .where(eq(propertiesTable.id, String(req.params.id)))
      .returning();

    res.json({ ...updated, photos: [], landlord: null, trust_score: 0 });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
