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

export const snmpRouter = router({
  listCommunities: publicProcedure
    .input(z.object({ deviceId: z.string().optional() }))
    .query(async ({ input }) => {
      const client = resolveClient(input.deviceId);
      try {
        const cmd = buildCommand("SHOW_SNMP_COMMUNITY");
        const raw = await client.executeCli(cmd);
        const parsed = await parser.parse(
          "ale_aos8",
          "show snmp community-map",
          raw,
        );
        return parsed;
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to list SNMP communities: ${err}`,
        });
      }
    }),

  listStations: publicProcedure
    .input(z.object({ deviceId: z.string().optional() }))
    .query(async ({ input }) => {
      const client = resolveClient(input.deviceId);
      try {
        const cmd = buildCommand("SHOW_SNMP_STATION");
        const raw = await client.executeCli(cmd);
        const parsed = await parser.parse(
          "ale_aos8",
          "show snmp station",
          raw,
        );
        return parsed;
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to list SNMP stations: ${err}`,
        });
      }
    }),

  addCommunity: publicProcedure
    .input(z.object({ name: z.string(), user: z.string(), deviceId: z.string().optional() }))
    .mutation(async ({ input }) => {
      const client = resolveClient(input.deviceId);
      try {
        const cmd = buildCommand(
          "SNMP_COMMUNITY_MAP",
          input.name,
          input.user,
        );
        const raw = await client.executeCli(cmd);
        return { success: true, output: raw };
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to add SNMP community: ${err}`,
        });
      }
    }),

  deleteCommunity: publicProcedure
    .input(z.object({ name: z.string(), deviceId: z.string().optional() }))
    .mutation(async ({ input }) => {
      const client = resolveClient(input.deviceId);
      try {
        const cmd = buildCommand("DELETE_COMMUNITY", input.name);
        const raw = await client.executeCli(cmd);
        return { success: true, output: raw };
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to delete SNMP community: ${err}`,
        });
      }
    }),

  addStation: publicProcedure
    .input(
      z.object({ ip: z.string(), version: z.string(), user: z.string(), deviceId: z.string().optional() }),
    )
    .mutation(async ({ input }) => {
      const client = resolveClient(input.deviceId);
      try {
        const cmd = buildCommand(
          "SNMP_STATION",
          input.ip,
          input.version,
          input.user,
        );
        const raw = await client.executeCli(cmd);
        return { success: true, output: raw };
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to add SNMP station: ${err}`,
        });
      }
    }),

  deleteStation: publicProcedure
    .input(z.object({ ip: z.string(), deviceId: z.string().optional() }))
    .mutation(async ({ input }) => {
      const client = resolveClient(input.deviceId);
      try {
        const cmd = buildCommand("DELETE_STATION", input.ip);
        const raw = await client.executeCli(cmd);
        return { success: true, output: raw };
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to delete SNMP station: ${err}`,
        });
      }
    }),

  setupV2c: publicProcedure
    .input(
      z.object({
        username: z.string(),
        password: z.string(),
        stationIp: z.string(),
        deviceId: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const client = resolveClient(input.deviceId);
      const results: Array<{ step: string; output: string }> = [];

      const steps = [
        { name: "AAA auth SNMP local", cmd: buildCommand("AAA_AUTH_SNMP_LOCAL") },
        { name: "Create SNMP user", cmd: buildCommand("SNMP_USER_NO_AUTH", input.username, input.password) },
        { name: "Disable SNMP security", cmd: buildCommand("SNMP_SECURITY_NO_SECURITY") },
        { name: "Enable community-map mode", cmd: buildCommand("SNMP_COMMUNITY_MAP_MODE") },
        { name: "Add SNMP v2c station", cmd: buildCommand("SNMP_STATION_V2", input.stationIp, input.username) },
      ];

      for (const step of steps) {
        try {
          const output = await client.executeCli(step.cmd);
          results.push({ step: step.name, output });
        } catch (err) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed at "${step.name}": ${err}`,
          });
        }
      }

      return { success: true, steps: results };
    }),
});
