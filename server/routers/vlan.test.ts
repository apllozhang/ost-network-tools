import { describe, it, expect } from "vitest";
import { appRouter } from "../_core/router.js";

const mockCtx = { req: {} as any, res: {} as any };

describe("vlan router", () => {
  it("list throws UNAUTHORIZED when not connected", async () => {
    const caller = appRouter.createCaller(mockCtx);
    await expect(caller.vlan.list({})).rejects.toThrow("Not connected");
  });

  it("create throws UNAUTHORIZED when not connected", async () => {
    const caller = appRouter.createCaller(mockCtx);
    await expect(
      caller.vlan.create({ vlanId: 100, name: "test" }),
    ).rejects.toThrow("Not connected");
  });
});
