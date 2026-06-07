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

function matchesQuery(row: Record<string, unknown>, query: string): boolean {
  const q = query.toLowerCase();
  return Object.values(row).some(
    (v) => typeof v === "string" && v.toLowerCase().includes(q),
  );
}

export const searchRouter = router({
  searchByMac: publicProcedure
    .input(z.object({ mac: z.string().min(1), deviceId: z.string().optional() }))
    .query(async ({ input }) => {
      const client = resolveClient(input.deviceId);
      try {
        const cmd = buildCommand("SHOW_MAC_LEARNING");
        const raw = await client.executeCli(cmd);
        const parsed = await parser.parse(
          "ale_aos8",
          "show mac-learning",
          raw,
        );
        return parsed.filter((row) => matchesQuery(row, input.mac));
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `MAC search failed: ${err}`,
        });
      }
    }),

  searchByIp: publicProcedure
    .input(z.object({ ip: z.string().min(1), deviceId: z.string().optional() }))
    .query(async ({ input }) => {
      const client = resolveClient(input.deviceId);
      try {
        const cmd = buildCommand("SHOW_ARP");
        const raw = await client.executeCli(cmd);
        const parsed = await parser.parse("ale_aos8", "show arp", raw);
        return parsed.filter((row) => matchesQuery(row, input.ip));
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `IP search failed: ${err}`,
        });
      }
    }),

  searchByPort: publicProcedure
    .input(z.object({ port: z.string().min(1), deviceId: z.string().optional() }))
    .query(async ({ input }) => {
      const client = resolveClient(input.deviceId);
      try {
        const cmd = buildCommand("SHOW_PORT_MAC_ADDRESS", input.port);
        const raw = await client.executeCli(cmd);
        const parsed = await parser.parse(
          "ale_aos8",
          "show mac-learning",
          raw,
        );
        return parsed;
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Port search failed: ${err}`,
        });
      }
    }),
});
