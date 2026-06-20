import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function resolveJwtSecret(): string {
  const s = process.env.JWT_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET environment variable is required in production");
  }
  // Dev: random per-startup (tokens are invalidated on server restart — acceptable in dev)
  const { randomBytes } = require("crypto");
  return randomBytes(48).toString("hex");
}
const JWT_SECRET = resolveJwtSecret();

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
      res.status(409).json({ error: "Email or Matriculation Number already in use" });
      return;
    }

    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const [newUser] = await db
      .insert(usersTable)
      .values({
        email,
        password_hash,
        role,
        first_name: first_name ?? null,
        last_name: last_name ?? null,
        matriculation_number: matriculation_number ?? null,
        verification_status: "pending",
      })
      .returning({
        id: usersTable.id,
        email: usersTable.email,
        role: usersTable.role,
        first_name: usersTable.first_name,
        last_name: usersTable.last_name,
        matriculation_number: usersTable.matriculation_number,
        verification_status: usersTable.verification_status,
        created_at: usersTable.created_at,
      });

    const token = jwt.sign(
      { id: newUser.id, role: newUser.role },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(201).json({
      message: "User registered successfully",
      user: newUser,
      token,
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

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    const { password_hash: _, ...userWithoutPassword } = user;

    res.status(200).json({
      message: "Login successful",
      user: userWithoutPassword,
      token,
    });
  } catch (error: unknown) {
    logger.error({ err: error }, "Login error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
