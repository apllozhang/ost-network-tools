import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./router.js";
import { authMiddleware } from "../auth/middleware.js";
import { db } from "../db/index.js";
import { users } from "../../drizzle/schema.js";
import { eq } from "drizzle-orm";
import { hashPassword } from "../auth/password.js";
import { startSyslogReceiver } from "../syslog/receiver.js";
import { startCollector } from "../scheduler/collector.js";

export type { AppRouter } from "./router.js";

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());
app.use(authMiddleware);

app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext: ({ req, res }) => ({
      req,
      res,
      userId: req.user?.userId,
      username: req.user?.username,
      role: req.user?.role,
    }),
  }),
);

async function seedAdmin() {
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, "admin"))
    .limit(1);

  if (!existing) {
    const { v4: uuid } = await import("uuid");
    const passwordHash = await hashPassword("admin123");
    await db.insert(users).values({
      id: uuid(),
      username: "admin",
      passwordHash,
      displayName: "Administrator",
      role: "admin",
    });
    console.log("Default admin user created (username: admin, password: admin123)");
  }
}

app.listen(port, async () => {
  console.log(`Server running on http://localhost:${port}`);

  try {
    await seedAdmin();
  } catch (err) {
    console.warn("⚠ Database not available — skipping admin seed.");
    console.warn("  Run `mysql -u root -e \"CREATE DATABASE ost_network_tools\"` then `pnpm db:push`");
    console.warn("  Auth and device management will not work until database is configured.");
  }

  startSyslogReceiver();
  startCollector();
});
