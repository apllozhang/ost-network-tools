import { describe, it, expect } from "vitest";
import { appRouter } from "../_core/router.js";

const mockCtx = { req: {} as any, res: {} as any };

describe("switch router", () => {
  it("getInfo returns disconnected when no client", async () => {
    const caller = appRouter.createCaller(mockCtx);
    const result = await caller.switch.getInfo({});
    expect(result.connected).toBe(false);
    expect(result.switch).toBeNull();
  });

  it("disconnect returns disconnected state", async () => {
    const caller = appRouter.createCaller(mockCtx);
    const result = await caller.switch.disconnect({});
    expect(result.connected).toBe(false);
  });
});
