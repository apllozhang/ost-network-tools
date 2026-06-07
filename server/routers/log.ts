import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc.js";

const PYTHON_BACKEND = `http://localhost:${process.env.PYTHON_BACKEND_PORT ?? 8001}`;

export const logRouter = router({
  parseSection: publicProcedure
    .input(
      z.object({
        section: z.string(),
        rawOutput: z.string(),
        deviceId: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const response = await fetch(`${PYTHON_BACKEND}/api/log/parse`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            section: input.section,
            raw_output: input.rawOutput,
          }),
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) return { success: false, data: [], error: "Request failed" };
        const data = (await response.json()) as {
          success: boolean;
          data: Record<string, string>[];
          error?: string;
        };
        return data;
      } catch (e) {
        return {
          success: false,
          data: [],
          error: e instanceof Error ? e.message : "Unknown error",
        };
      }
    }),

  extractSections: publicProcedure
    .input(
      z.object({
        rawOutput: z.string(),
        deviceId: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const response = await fetch(`${PYTHON_BACKEND}/api/log/sections`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ raw_output: input.rawOutput }),
          signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) return { success: false, data: [], error: "Request failed" };
        const data = (await response.json()) as {
          success: boolean;
          data: string[];
          error?: string;
        };
        return data;
      } catch (e) {
        return {
          success: false,
          data: [],
          error: e instanceof Error ? e.message : "Unknown error",
        };
      }
    }),
});
