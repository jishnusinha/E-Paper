import bcrypt from "bcryptjs";
import { connectDb } from "../config/db.js";
import { env } from "../config/env.js";
import { AdminUser } from "../models/AdminUser.js";

async function seedAdmin() {
  if (!env.ADMIN_PASSWORD) {
    throw new Error("ADMIN_PASSWORD is required to seed an admin user");
  }

  await connectDb();

  const email = env.ADMIN_EMAIL.toLowerCase();
  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 12);

  const existing = await AdminUser.findOne({ email });
  if (existing) {
    existing.name = env.ADMIN_NAME;
    existing.passwordHash = passwordHash;
    await existing.save();
    console.log(`[seed] updated admin ${email}`);
  } else {
    await AdminUser.create({
      name: env.ADMIN_NAME,
      email,
      passwordHash,
      role: "admin",
    });
    console.log(`[seed] created admin ${email}`);
  }

  process.exit(0);
}

seedAdmin().catch((error) => {
  console.error(error);
  process.exit(1);
});
