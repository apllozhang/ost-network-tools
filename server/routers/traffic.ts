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

export const trafficRouter = router({
  getInterfaceStats: publicProcedure
    .input(z.object({ port: z.string(), deviceId: z.string().optional() }))
    .query(async ({ input }) => {
      const client = resolveClient(input.deviceId);
      try {
        const cmd = buildCommand("SHOW_INTERFACE_PORT", input.port);
        const raw = await client.executeCli(cmd);
        const parsed = await parser.parse("ale_aos8", "show interfaces", raw);
        return parsed;
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get interface stats: ${err}`,
        });
      }
    }),

  getAllInterfaces: publicProcedure
    .input(z.object({ deviceId: z.string().optional() }))
    .query(async ({ input }) => {
      const client = resolveClient(input.deviceId);
      try {
        const cmd = buildCommand("SHOW_INTERFACES");
        const raw = await client.executeCli(cmd);
        const parsed = await parser.parse("ale_aos8", "show interfaces", raw);
        return parsed;
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get interfaces: ${err}`,
        });
      }
    }),

  getMacTable: publicProcedure
    .input(z.object({ deviceId: z.string().optional() }))
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
        return parsed;
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get MAC table: ${err}`,
        });
      }
    }),

  getArpTable: publicProcedure
    .input(z.object({ deviceId: z.string().optional() }))
    .query(async ({ input }) => {
      const client = resolveClient(input.deviceId);
      try {
        const cmd = buildCommand("SHOW_ARP");
        const raw = await client.executeCli(cmd);
        const parsed = await parser.parse("ale_aos8", "show arp", raw);
        return parsed;
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get ARP table: ${err}`,
        });
      }
    }),
});
