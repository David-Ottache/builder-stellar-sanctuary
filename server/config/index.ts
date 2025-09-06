import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

export const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || "5432", 10),
});

pool.on("connect", () => {
  console.log("✅ Connected to PostgreSQL");
});

export const config = {
  env: process.env.NODE_ENV || "development",
  port: process.env.PORT ? Number(process.env.PORT) : 8080,
  // Provide placeholders for external integrations. Do NOT commit secrets here.
  smsProvider: process.env.SMS_PROVIDER || "disabled",
  databaseUrl: process.env.DATABASE_URL || undefined,
};
