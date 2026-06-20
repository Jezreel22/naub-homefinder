import { Router } from "express";
import { db, usersTable, disputesTable, bookingsTable, propertiesTable, propertyPhotosTable } from "@workspace/db";
import { eq, or, asc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth-middleware";
import { recomputeTrustScore, getTrustScore } from "../lib/trust-score";

const router = Router();

async function enrichDispute(d: any) {
  const [student] = await db.select().from(usersTable).where(eq(usersTable.id, d.student_id));
  const [landlord] = await db.select().from(usersTable).where(eq(usersTable.id, d.landlord_id));
  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, d.booking_id));

  let propertyData = null;
  if (booking) {
    const [prop] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, booking.property_id));
    const [heroPhoto] = prop ? await db.select().from(propertyPhotosTable)
      .where(eq(propertyPhotosTable.property_id, prop.id))
      .orderBy(asc(propertyPhotosTable.photo_order)).limit(1) : [null];
    const ts = prop ? await getTrustScore(prop.landlord_id) : null;
    propertyData = prop ? {
      id: prop.id, address: prop.address, rent_amount_ngn: prop.rent_amount_ngn,
      deposit_amount_ngn: prop.deposit_amount_ngn, rooms: prop.rooms,
      listing_status: prop.listing_status, amenities: prop.amenities,
      hero_photo_url: heroPhoto?.photo_url ?? null, trust_score: ts?.total_score ?? 0, landlord: null,
    } : null;
  }

  return {
    ...d,
    student: student ? { id: student.id, first_name: student.first_name, last_name: student.last_name, profile_photo_url: student.profile_photo_url, role: student.role, verification_status: student.verification_status } : null,
    landlord: landlord ? { id: landlord.id, first_name: landlord.first_name, last_name: landlord.last_name, profile_photo_url: landlord.profile_photo_url, role: landlord.role, verification_status: landlord.verification_status } : null,
    booking: booking ? { ...booking, property: propertyData, student: null, landlord: null } : null,
  };
}

router.get("/disputes", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id, role } = req.user!;
    let disputes;
    if (role === "escrow_officer") {
      disputes = await db.select().from(disputesTable);
    } else {
      disputes = await db.select().from(disputesTable).where(
        or(eq(disputesTable.student_id, id), eq(disputesTable.landlord_id, id))
      );
    }
    const enriched = await Promise.all(disputes.map(enrichDispute));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/disputes/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [dispute] = await db.select().from(disputesTable).where(eq(disputesTable.id, String(req.params.id)));
    if (!dispute) { res.status(404).json({ error: "Dispute not found" }); return; }
    const { id, role } = req.user!;
    if (dispute.student_id !== id && dispute.landlord_id !== id && role !== "escrow_officer") {
      res.status(403).json({ error: "Access denied" }); return;
    }
    res.json(await enrichDispute(dispute));
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/disputes/:id/adjudicate", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== "escrow_officer") {
      res.status(403).json({ error: "Only Escrow Officers can adjudicate disputes" }); return;
    }

    const [dispute] = await db.select().from(disputesTable).where(eq(disputesTable.id, String(req.params.id)));
    if (!dispute) { res.status(404).json({ error: "Dispute not found" }); return; }

    const { decision, adjudication_notes, refund_percentage_to_student } = req.body;
    if (!decision || !adjudication_notes) {
      res.status(400).json({ error: "decision and adjudication_notes are required" }); return;
    }

    const [updated] = await db.update(disputesTable).set({
      adjudication_decision: decision,
      adjudication_notes,
      refund_percentage_to_student: refund_percentage_to_student ?? null,
      escrow_officer_id: req.user!.id,
      dispute_status: "resolved",
      resolved_at: new Date(),
    }).where(eq(disputesTable.id, dispute.id)).returning();

    // Update booking status
    const bookingStatus = decision === "fraud_substantiated" ? "cancelled"
      : decision === "full_refund" ? "cancelled"
      : "completed";

    await db.update(bookingsTable).set({
      booking_status: bookingStatus,
      dispute_adjudication_date: new Date(),
      dispute_outcome: decision,
      escrow_released_at: new Date(),
      escrow_release_reason: "dispute_resolved",
      updated_at: new Date(),
    }).where(eq(bookingsTable.id, dispute.booking_id));

    // Recompute trust score for landlord
    await recomputeTrustScore(dispute.landlord_id);

    res.json(await enrichDispute(updated));
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
