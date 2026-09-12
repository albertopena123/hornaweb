import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

declare global {
  var __prisma: PrismaClient | undefined;
}

function build(): PrismaClient {
  const raw =
    process.env.DATABASE_URL ||
    "postgresql://placeholder:placeholder@localhost:5432/placeholder";

  // Parse the URL so percent-encoded chars (e.g. %23 → #) in the password are
  // decoded properly. Passing the raw string can fail when the password contains
  // characters that are special in URLs (like #).
  const url = new URL(raw);
  const adapter = new PrismaPg({
    host: url.hostname,
    port: parseInt(url.port || "5432", 10),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
  });
  return new PrismaClient({ adapter });
}

// Force re-instantiating PrismaClient so newly generated schema fields (like coordinatorDni) are recognized
export const prisma: PrismaClient =
  process.env.NODE_ENV !== "production"
    ? (global.__prisma = build())
    : (global.__prisma ?? build());

