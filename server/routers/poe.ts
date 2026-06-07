import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc.js";
import { TRPCError } from "@trpc/server";
import { getClient, parser } from "../aos/store.js";
import { buildCommand } from "../aos/command-table.js";
import * as pool from "../aos/connection-pool.js";

function resolveClient(deviceId?: string) {
  const client = deviceId ? pool.getClient(deviceId) : getClient();
  if (!client?.connected)
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not connected" });
  return client;
}

export const poeRouter = router({
  getStatus: publicProcedure
    .input(z.object({ slot: z.number(), deviceId: z.string().optional() }))
    .query(async ({ input }) => {
      const client = resolveClient(input.deviceId);
      try {
        const cmd = buildCommand("SHOW_LAN_POWER", String(input.slot));
        const raw = await client.executeCli(cmd);
        const parsed = await parser.parse("ale_aos8", "show lanpower", raw);
        return parsed;
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get PoE status: ${err}`,
        });
      }
    }),

  enablePort: publicProcedure
    .input(z.object({ port: z.string(), deviceId: z.string().optional() }))
    .mutation(async ({ input }) => {
      const client = resolveClient(input.deviceId);
      try {
        const cmd = buildCommand("POWER_UP_PORT", input.port);
        const raw = await client.executeCli(cmd);
        return { success: true, output: raw };
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to enable PoE port: ${err}`,
        });
      }
    }),

  disablePort: publicProcedure
    .input(z.object({ port: z.string(), deviceId: z.string().optional() }))
    .mutation(async ({ input }) => {
      const client = resolveClient(input.deviceId);
      try {
        const cmd = buildCommand("POWER_DOWN_PORT", input.port);
        const raw = await client.executeCli(cmd);
        return { success: true, output: raw };
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to disable PoE port: ${err}`,
        });
      }
    }),

  setPriority: publicProcedure
    .input(z.object({ port: z.string(), priority: z.string(), deviceId: z.string().optional() }))
    .mutation(async ({ input }) => {
      const client = resolveClient(input.deviceId);
      try {
        const cmd = buildCommand("POWER_PRIORITY_PORT", input.port, input.priority);
        const raw = await client.executeCli(cmd);
        return { success: true, output: raw };
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to set PoE priority: ${err}`,
        });
      }
    }),

  setMaxPower: publicProcedure
    .input(z.object({ port: z.string(), power: z.string(), deviceId: z.string().optional() }))
    .mutation(async ({ input }) => {
      const client = resolveClient(input.deviceId);
      try {
        const cmd = buildCommand("SET_MAX_POWER_PORT", input.port, input.power);
        const raw = await client.executeCli(cmd);
        return { success: true, output: raw };
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to set max power: ${err}`,
        });
      }
    }),
});
