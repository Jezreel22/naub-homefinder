import { Router } from "express";
import { db, usersTable, propertiesTable, bookingsTable, propertyPhotosTable, disputesTable } from "@workspace/db";
import { eq, or, and, asc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth-middleware";
import { getTrustScore, recomputeTrustScore } from "../lib/trust-score";

const router = Router();

function generateEscrowRef(): string {
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `NAUB-${year}-${rand}`;
}

function formatDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

async function enrichBooking(b: any) {
  const [prop] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, b.property_id));
  const [student] = await db.select().from(usersTable).where(eq(usersTable.id, b.student_id));
  const [landlord] = await db.select().from(usersTable).where(eq(usersTable.id, b.landlord_id));
  const [heroPhoto] = await db.select().from(propertyPhotosTable)
    .where(eq(propertyPhotosTable.property_id, b.property_id))
    .orderBy(asc(propertyPhotosTable.photo_order)).limit(1);
  const ts = prop ? await getTrustScore(prop.landlord_id) : null;

  return {
    ...b,
    property: prop ? {
      id: prop.id,
      address: prop.address,
      rent_amount_ngn: prop.rent_amount_ngn,
      deposit_amount_ngn: prop.deposit_amount_ngn,
      rooms: prop.rooms,
      listing_status: prop.listing_status,
      amenities: prop.amenities,
      hero_photo_url: heroPhoto?.photo_url ?? null,
      trust_score: ts?.total_score ?? 0,
      landlord: landlord ? {
        id: landlord.id,
        first_name: landlord.first_name,
        last_name: landlord.last_name,
        profile_photo_url: landlord.profile_photo_url,
        role: landlord.role,
        verification_status: landlord.verification_status,
      } : null,
    } : null,
    student: student ? {
      id: student.id,
      first_name: student.first_name,
      last_name: student.last_name,
      profile_photo_url: student.profile_photo_url,
      role: student.role,
      verification_status: student.verification_status,
    } : null,
    landlord: landlord ? {
      id: landlord.id,
      first_name: landlord.first_name,
      last_name: landlord.last_name,
      profile_photo_url: landlord.profile_photo_url,
      role: landlord.role,
      verification_status: landlord.verification_status,
    } : null,
  };
}

// GET /bookings
router.get("/bookings", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { role, id } = req.user!;
    let bookings;
    if (role === "student") {
      bookings = await db.select().from(bookingsTable).where(eq(bookingsTable.student_id, id));
    } else if (["landlord", "agent"].includes(role)) {
      bookings = await db.select().from(bookingsTable).where(eq(bookingsTable.landlord_id, id));
    } else {
      bookings = await db.select().from(bookingsTable);
    }

    const enriched = await Promise.all(bookings.map(enrichBooking));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /bookings
router.post("/bookings", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== "student") {
      res.status(403).json({ error: "Only students can create bookings" }); return;
    }

    const { property_id, payment_method, lease_start_date, lease_duration_days } = req.body;
    if (!property_id || !payment_method) {
      res.status(400).json({ error: "property_id and payment_method are required" }); return;
    }

    const [prop] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, property_id));
    if (!prop) { res.status(404).json({ error: "Property not found" }); return; }
    if (prop.listing_status !== "live") {
      res.status(400).json({ error: "Property is not available for booking" }); return;
    }

    const leaseDays = parseInt(lease_duration_days) || prop.lease_duration_days || 365;
    const totalAmount = prop.rent_amount_ngn * Math.ceil(leaseDays / 30) + prop.deposit_amount_ngn;

    const startDate = lease_start_date ? new Date(lease_start_date) : new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + leaseDays);

    const [booking] = await db.insert(bookingsTable).values({
      student_id: req.user!.id,
      property_id,
      landlord_id: prop.landlord_id,
      lease_start_date: startDate.toISOString().split("T")[0],
      lease_duration_days: leaseDays,
      lease_end_date: endDate.toISOString().split("T")[0],
      rent_amount_ngn: prop.rent_amount_ngn,
      deposit_amount_ngn: prop.deposit_amount_ngn,
      total_amount_ngn: totalAmount,
      payment_method,
      escrow_account_reference: generateEscrowRef(),
      funds_received_at: new Date(),
      booking_status: "pending_occupancy",
    }).returning();

    // Mark property as occupied
    await db.update(propertiesTable)
      .set({ listing_status: "occupied", updated_at: new Date() })
      .where(eq(propertiesTable.id, property_id));

    const enriched = await enrichBooking(booking);
    res.status(201).json(enriched);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /bookings/:id
router.get("/bookings/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, String(req.params.id)));
    if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }

    const { id, role } = req.user!;
    if (booking.student_id !== id && booking.landlord_id !== id && role !== "escrow_officer") {
      res.status(403).json({ error: "Access denied" }); return;
    }

    const enriched = await enrichBooking(booking);
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /bookings/:id/confirm-occupancy
router.post("/bookings/:id/confirm-occupancy", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, String(req.params.id)));
    if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }
    if (booking.student_id !== req.user!.id) {
      res.status(403).json({ error: "Only the booked student can confirm occupancy" }); return;
    }
    if (booking.booking_status !== "pending_occupancy") {
      res.status(400).json({ error: "Booking is not awaiting occupancy" }); return;
    }

    const { occupancy_code, latitude, longitude } = req.body;
    if (!occupancy_code) { res.status(400).json({ error: "occupancy_code is required" }); return; }

    // Get property to check occupancy code
    const [prop] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, booking.property_id));
    if (!prop) { res.status(404).json({ error: "Property not found" }); return; }

    // Check attempts
    const attempts = (booking.occupancy_attempts ?? 0) + 1;
    if (attempts > 3) {
      res.status(400).json({ error: "Maximum attempts reached. Contact your landlord." }); return;
    }

    if (prop.occupancy_code !== occupancy_code.toUpperCase()) {
      await db.update(bookingsTable).set({ occupancy_attempts: attempts }).where(eq(bookingsTable.id, booking.id));
      res.status(400).json({ error: `Invalid code. ${3 - attempts} attempts remaining.` }); return;
    }

    // Optionally validate GPS (500m radius)
    if (latitude && longitude && prop.latitude && prop.longitude) {
      const dist = formatDistance(parseFloat(latitude), parseFloat(longitude), prop.latitude, prop.longitude);
      if (dist > 500) {
        res.status(400).json({ error: `You are ${Math.round(dist)}m away. Move within 500m to verify.` }); return;
      }
    }

    const [updated] = await db.update(bookingsTable).set({
      occupancy_verified_at: new Date(),
      occupancy_confirmed_by_student_at: new Date(),
      occupancy_gps_latitude: latitude ? parseFloat(latitude) : null,
      occupancy_gps_longitude: longitude ? parseFloat(longitude) : null,
      occupancy_code_entered: occupancy_code,
      occupancy_attempts: attempts,
      booking_status: "pending_review",
      updated_at: new Date(),
    }).where(eq(bookingsTable.id, booking.id)).returning();

    const enriched = await enrichBooking(updated);
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /bookings/:id/dispute
router.post("/bookings/:id/dispute", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, String(req.params.id)));
    if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }
    if (booking.student_id !== req.user!.id) {
      res.status(403).json({ error: "Only the student can file a dispute" }); return;
    }

    const { reason, description } = req.body;
    if (!reason || !description) {
      res.status(400).json({ error: "reason and description are required" }); return;
    }

    await db.insert(disputesTable).values({
      booking_id: booking.id,
      student_id: booking.student_id,
      landlord_id: booking.landlord_id,
      reason,
      description,
      dispute_status: "open",
    });

    await db.update(bookingsTable).set({
      booking_status: "disputed",
      dispute_status: "under_investigation",
      dispute_filed_at: new Date(),
      updated_at: new Date(),
    }).where(eq(bookingsTable.id, booking.id));

    res.status(201).json({ message: "Dispute filed. Escrow Officer will review within 5 business days." });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
