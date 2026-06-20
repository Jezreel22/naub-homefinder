import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function resolveJwtSecret(): string {
  const s = process.env.JWT_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET environment variable is required in production");
  }
  const { randomBytes } = require("crypto");
  return randomBytes(48).toString("hex");
}
const JWT_SECRET = resolveJwtSecret();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

function makeToken(id: string, role: string) {
  return jwt.sign({ id, role }, JWT_SECRET, { expiresIn: "7d" });
}

function safeUser(user: typeof usersTable.$inferSelect) {
  const { password_hash: _, ...rest } = user;
  return rest;
}

router.post("/auth/register", async (req, res) => {
  try {
    const parsed = RegisterBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }

    const { email, password, role, first_name, last_name, matriculation_number } = parsed.data;

    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (existing.length > 0) {
      res.status(409).json({ error: "Email already in use" });
      return;
    }

    const password_hash = await bcrypt.hash(password, 12);

    const [newUser] = await db
      .insert(usersTable)
      .values({
        email,
        password_hash,
        role,
        first_name: first_name ?? null,
        last_name: last_name ?? null,
        matriculation_number: matriculation_number ?? null,
        verification_status: role === "student" ? "verified" : "pending",
      })
      .returning();

    res.status(201).json({
      message: "User registered successfully",
      user: safeUser(newUser),
      token: makeToken(newUser.id, newUser.role),
    });
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.code === "23505") {
      res.status(409).json({ error: "Email or Matriculation Number already in use" });
      return;
    }
    logger.error({ err: error }, "Registration error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/login", async (req, res) => {
  try {
    const parsed = LoginBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }

    const { email, password } = parsed.data;

    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    if (!user.password_hash) {
      res.status(401).json({ error: "This account uses Google sign-in. Please use the Google button to log in." });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    res.status(200).json({
      message: "Login successful",
      user: safeUser(user),
      token: makeToken(user.id, user.role),
    });
  } catch (error: unknown) {
    logger.error({ err: error }, "Login error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/google", async (req, res) => {
  try {
    const { credential, role } = req.body as { credential?: string; role?: string };

    if (!credential) {
      res.status(400).json({ error: "Missing Google credential" });
      return;
    }

    if (!GOOGLE_CLIENT_ID) {
      res.status(503).json({ error: "Google sign-in is not configured on this server" });
      return;
    }

    let payload: any;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch {
      res.status(401).json({ error: "Invalid Google token" });
      return;
    }

    if (!payload?.email) {
      res.status(400).json({ error: "Google account has no email" });
      return;
    }

    const googleId = payload.sub as string;
    const email = payload.email as string;
    const firstName = (payload.given_name as string | undefined) ?? null;
    const lastName = (payload.family_name as string | undefined) ?? null;
    const profilePhotoUrl = (payload.picture as string | undefined) ?? null;

    const [existing] = await db
      .select()
      .from(usersTable)
      .where(or(eq(usersTable.google_id, googleId), eq(usersTable.email, email)));

    if (existing) {
      if (!existing.google_id) {
        await db.update(usersTable).set({ google_id: googleId }).where(eq(usersTable.id, existing.id));
      }
      res.status(200).json({
        message: "Login successful",
        user: safeUser(existing),
        token: makeToken(existing.id, existing.role),
      });
      return;
    }

    const assignedRole = (["student", "landlord", "agent"].includes(role ?? "") ? role : "student") as string;

    const [newUser] = await db
      .insert(usersTable)
      .values({
        email,
        google_id: googleId,
        role: assignedRole,
        first_name: firstName,
        last_name: lastName,
        profile_photo_url: profilePhotoUrl,
        verification_status: assignedRole === "student" ? "verified" : "pending",
      })
      .returning();

    res.status(201).json({
      message: "Account created",
      user: safeUser(newUser),
      token: makeToken(newUser.id, newUser.role),
    });
  } catch (error: unknown) {
    logger.error({ err: error }, "Google auth error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/kyc/submit", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const token = authHeader.slice(7);
    let decoded: { id: string; role: string };
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: string };
    } catch {
      res.status(401).json({ error: "Invalid token" });
      return;
    }

    const { national_id_type, national_id_document_url, selfie_url, property_document_url } = req.body as {
      national_id_type?: string;
      national_id_document_url?: string;
      selfie_url?: string;
      property_document_url?: string;
    };

    if (!national_id_type || !national_id_document_url || !selfie_url) {
      res.status(400).json({ error: "national_id_type, national_id_document_url, and selfie_url are required" });
      return;
    }

    await db.update(usersTable)
      .set({
        national_id_type,
        national_id_document_url,
        selfie_url,
        property_document_url: property_document_url ?? null,
        kyc_submitted_at: new Date(),
        verification_status: "under_review",
        updated_at: new Date(),
      })
      .where(eq(usersTable.id, decoded.id));

    res.status(200).json({ message: "KYC submitted for review" });
  } catch (error: unknown) {
    logger.error({ err: error }, "KYC submit error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
