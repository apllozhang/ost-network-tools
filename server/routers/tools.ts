import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc.js";

const PYTHON_BACKEND = `http://localhost:${process.env.PYTHON_BACKEND_PORT ?? 8001}`;

async function postToPython<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${PYTHON_BACKEND}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120000),
  });
  if (!response.ok) {
    throw new Error(`Python backend error: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const toolsRouter = router({
  ping: publicProcedure
    .input(
      z.object({
        target: z.string(),
        count: z.number().optional(),
        timeout: z.number().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return postToPython("/api/tools/ping", {
        target: input.target,
        count: input.count ?? 4,
        timeout: input.timeout ?? 5,
      });
    }),

  tcpCheck: publicProcedure
    .input(
      z.object({
        target: z.string(),
        port: z.number(),
        timeout: z.number().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return postToPython("/api/tools/tcp", {
        target: input.target,
        port: input.port,
        timeout: input.timeout ?? 5,
      });
    }),

  httpCheck: publicProcedure
    .input(
      z.object({
        url: z.string(),
        timeout: z.number().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return postToPython("/api/tools/http", {
        url: input.url,
        timeout: input.timeout ?? 10,
      });
    }),

  dnsLookup: publicProcedure
    .input(
      z.object({
        hostname: z.string(),
        recordType: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return postToPython("/api/tools/dns", {
        hostname: input.hostname,
        record_type: input.recordType ?? "A",
      });
    }),

  traceroute: publicProcedure
    .input(
      z.object({
        target: z.string(),
        maxHops: z.number().optional(),
        timeout: z.number().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return postToPython("/api/tools/traceroute", {
        target: input.target,
        max_hops: input.maxHops ?? 30,
        timeout: input.timeout ?? 5,
      });
    }),
});
