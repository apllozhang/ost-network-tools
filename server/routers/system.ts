import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc.js";
import { getClient, parser } from "../aos/store.js";
import { TRPCError } from "@trpc/server";
import { buildTemperatureFromParsed } from "../aos/models/builder.js";
import * as pool from "../aos/connection-pool.js";

function resolveClient(deviceId?: string) {
  const client = deviceId ? pool.getClient(deviceId) : getClient();
  if (!client?.connected)
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not connected" });
  return client;
}

export const systemRouter = router({
  showSystem: publicProcedure
    .input(z.object({ deviceId: z.string().optional() }))
    .query(async ({ input }) => {
      const client = resolveClient(input.deviceId);
      try {
        const raw = await client.executeCli("show system");
        const parsed = await parser.parse("ale_aos8", "show system", raw);
        return parsed[0] ?? {};
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to query system: ${err}`,
        });
      }
    }),

  showHealth: publicProcedure
    .input(z.object({ deviceId: z.string().optional() }))
    .query(async ({ input }) => {
      const client = resolveClient(input.deviceId);
      try {
        const raw = await client.executeCli("show health all cpu");
        const parsed = await parser.parse("ale_aos8", "show health", raw);
        return parsed[0] ?? {};
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to query health: ${err}`,
        });
      }
    }),

  showTemperature: publicProcedure
    .input(z.object({ deviceId: z.string().optional() }))
    .query(async ({ input }) => {
      const client = resolveClient(input.deviceId);
      try {
        const raw = await client.executeCli("show temperature");
        const parsed = await parser.parse("ale_aos8", "show temperature", raw);
        return buildTemperatureFromParsed(parsed);
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to query temperature: ${err}`,
        });
      }
    }),
});
