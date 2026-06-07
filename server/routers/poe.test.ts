import { describe, it, expect } from "vitest";
import { appRouter } from "../_core/router.js";

const mockCtx = { req: {} as any, res: {} as any };

describe("poe router", () => {
  it("getStatus throws UNAUTHORIZED when not connected", async () => {
    const caller = appRouter.createCaller(mockCtx);
    await expect(caller.poe.getStatus({ slot: 1 })).rejects.toThrow(
      "Not connected",
    );
  });

  it("enablePort throws UNAUTHORIZED when not connected", async () => {
    const caller = appRouter.createCaller(mockCtx);
    await expect(caller.poe.enablePort({ port: "1/1/1" })).rejects.toThrow(
      "Not connected",
    );
  });

  it("disablePort throws UNAUTHORIZED when not connected", async () => {
    const caller = appRouter.createCaller(mockCtx);
    await expect(caller.poe.disablePort({ port: "1/1/1" })).rejects.toThrow(
      "Not connected",
    );
  });
});
