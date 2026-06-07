import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc.js";
import { getClient } from "../aos/store.js";
import { TRPCError } from "@trpc/server";
import * as pool from "../aos/connection-pool.js";

const PYTHON_BACKEND = `http://localhost:${process.env.PYTHON_BACKEND_PORT ?? 8001}`;

function resolveClient(deviceId?: string) {
  const client = deviceId ? pool.getClient(deviceId) : getClient();
  if (!client?.connected)
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not connected" });
  return client;
}

export const firmwareRouter = router({
  getCurrentVersion: publicProcedure
    .input(z.object({ deviceId: z.string().optional() }))
    .query(async ({ input }) => {
      const client = resolveClient(input.deviceId);
      try {
        const raw = await client.executeCli("show microcode");
        return { success: true, raw };
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to query microcode: ${err}`,
        });
      }
    }),

  getChassisInfo: publicProcedure
    .input(z.object({ deviceId: z.string().optional() }))
    .query(async ({ input }) => {
      const client = resolveClient(input.deviceId);
      try {
        const raw = await client.executeCli("show chassis");
        return { success: true, raw };
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to query chassis: ${err}`,
        });
      }
    }),

  getGaVersion: publicProcedure
    .input(z.object({ model: z.string(), deviceId: z.string().optional() }))
    .query(async ({ input }) => {
      try {
        const response = await fetch(
          `${PYTHON_BACKEND}/api/firmware/ga?model=${encodeURIComponent(input.model)}`,
          { signal: AbortSignal.timeout(5000) },
        );
        if (!response.ok)
          return { success: false, model: input.model, ga_version: "", note: "Request failed" };
        return (await response.json()) as {
          success: boolean;
          model: string;
          ga_version: string;
          note: string;
        };
      } catch (e) {
        return {
          success: false,
          model: input.model,
          ga_version: "",
          note: e instanceof Error ? e.message : "Unknown error",
        };
      }
    }),
});
