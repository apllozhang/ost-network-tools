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

export const tdrRouter = router({
  runTest: publicProcedure
    .input(z.object({ port: z.string(), deviceId: z.string().optional() }))
    .mutation(async ({ input }) => {
      const client = resolveClient(input.deviceId);
      try {
        const enableCmd = buildCommand("ENABLE_TDR", input.port);
        await client.executeCli(enableCmd);

        // TDR test takes ~10 seconds to complete
        await new Promise((resolve) => setTimeout(resolve, 10000));

        const statsCmd = buildCommand("SHOW_TDR_STATISTICS", input.port);
        const raw = await client.executeCli(statsCmd);
        const parsed = await parser.parse("ale_aos8", "show tdr statistics", raw);
        return parsed;
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to run TDR test: ${err}`,
        });
      }
    }),

  getResults: publicProcedure
    .input(z.object({ port: z.string(), deviceId: z.string().optional() }))
    .query(async ({ input }) => {
      const client = resolveClient(input.deviceId);
      try {
        const cmd = buildCommand("SHOW_TDR_STATISTICS", input.port);
        const raw = await client.executeCli(cmd);
        const parsed = await parser.parse("ale_aos8", "show tdr statistics", raw);
        return parsed;
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get TDR results: ${err}`,
        });
      }
    }),

  clearStats: publicProcedure
    .input(z.object({ port: z.string(), deviceId: z.string().optional() }))
    .mutation(async ({ input }) => {
      const client = resolveClient(input.deviceId);
      try {
        const cmd = buildCommand("CLEAR_TDR_STATISTICS", input.port);
        const raw = await client.executeCli(cmd);
        return { success: true, output: raw };
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to clear TDR stats: ${err}`,
        });
      }
    }),
});
