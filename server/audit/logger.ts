import { db } from "../db/index.js";
import { auditLogs } from "../../drizzle/schema.js";
import { v4 as uuidv4 } from "uuid";

interface AuditLogInput {
  userId: string;
  username: string;
  action: string;
  objectType: string;
  objectId?: string;
  beforeValue?: Record<string, unknown>;
  afterValue?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function logAudit(input: AuditLogInput): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      id: uuidv4(),
      userId: input.userId,
      username: input.username,
      action: input.action,
      objectType: input.objectType,
      objectId: input.objectId ?? null,
      beforeValue: input.beforeValue ?? null,
      afterValue: input.afterValue ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    });
  } catch {
    // Audit logging must never break the main operation
  }
}
