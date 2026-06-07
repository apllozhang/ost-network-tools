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

export const vlanRouter = router({
  list: publicProcedure
    .input(z.object({ deviceId: z.string().optional() }))
    .query(async ({ input }) => {
      const client = resolveClient(input.deviceId);
      try {
        const cmd = buildCommand("SHOW_VLAN");
        const raw = await client.executeCli(cmd);
        const parsed = await parser.parse("ale_aos8", "show vlan", raw);
        return parsed;
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to list VLANs: ${err}`,
        });
      }
    }),

  getMembers: publicProcedure
    .input(z.object({ vlanId: z.number(), deviceId: z.string().optional() }))
    .query(async ({ input }) => {
      const client = resolveClient(input.deviceId);
      try {
        const cmd = buildCommand("SHOW_VLAN_MEMBERS", String(input.vlanId));
        const raw = await client.executeCli(cmd);
        const parsed = await parser.parse(
          "ale_aos8",
          "show vlan members",
          raw,
        );
        return parsed;
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get VLAN members: ${err}`,
        });
      }
    }),

  create: publicProcedure
    .input(z.object({ vlanId: z.number(), name: z.string(), deviceId: z.string().optional() }))
    .mutation(async ({ input }) => {
      const client = resolveClient(input.deviceId);
      try {
        const vlanIdStr = String(input.vlanId);
        // Step 1: create VLAN
        const createCmd = buildCommand("CREATE_VLAN", vlanIdStr);
        await client.executeCli(createCmd);
        // Step 2: set name
        const nameCmd = buildCommand("SET_VLAN_NAME", vlanIdStr, input.name);
        await client.executeCli(nameCmd);
        // Step 3: enable admin state
        const adminCmd = buildCommand("SET_VLAN_ADMIN_STATE", vlanIdStr);
        await client.executeCli(adminCmd);
        return { success: true };
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to create VLAN: ${err}`,
        });
      }
    }),

  delete: publicProcedure
    .input(z.object({ vlanId: z.number(), deviceId: z.string().optional() }))
    .mutation(async ({ input }) => {
      const client = resolveClient(input.deviceId);
      try {
        const cmd = buildCommand("DELETE_VLAN", String(input.vlanId));
        const raw = await client.executeCli(cmd);
        return { success: true, output: raw };
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to delete VLAN: ${err}`,
        });
      }
    }),

  addMember: publicProcedure
    .input(
      z.object({
        vlanId: z.number(),
        port: z.string(),
        mode: z.enum(["tagged", "untagged"]),
        deviceId: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const client = resolveClient(input.deviceId);
      try {
        const cmd =
          input.mode === "tagged"
            ? buildCommand(
                "VLAN_PORT_TAGGED",
                String(input.vlanId),
                input.port,
              )
            : buildCommand(
                "VLAN_PORT_UNTAGGED",
                String(input.vlanId),
                input.port,
              );
        const raw = await client.executeCli(cmd);
        return { success: true, output: raw };
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to add VLAN member: ${err}`,
        });
      }
    }),
});
