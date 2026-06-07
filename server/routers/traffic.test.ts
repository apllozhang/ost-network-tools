import { describe, it, expect } from "vitest";
import { appRouter } from "../_core/router.js";

const mockCtx = { req: {} as any, res: {} as any };

describe("traffic router", () => {
  it("getAllInterfaces throws UNAUTHORIZED when not connected", async () => {
    const caller = appRouter.createCaller(mockCtx);
    await expect(caller.traffic.getAllInterfaces({})).rejects.toThrow(
      "Not connected",
    );
  });

  it("getMacTable throws UNAUTHORIZED when not connected", async () => {
    const caller = appRouter.createCaller(mockCtx);
    await expect(caller.traffic.getMacTable({})).rejects.toThrow(
      "Not connected",
    );
  });

  it("getArpTable throws UNAUTHORIZED when not connected", async () => {
    const caller = appRouter.createCaller(mockCtx);
    await expect(caller.traffic.getArpTable({})).rejects.toThrow(
      "Not connected",
    );
  });
});
