export const config = {
  env: process.env.NODE_ENV || "development",
  port: process.env.PORT ? Number(process.env.PORT) : 8080,
  // Provide placeholders for external integrations. Do NOT commit secrets here.
  smsProvider: process.env.SMS_PROVIDER || "disabled",
  databaseUrl: process.env.DATABASE_URL || undefined,
};
