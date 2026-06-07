import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc.js";
import { AosRestClient } from "../aos/rest-client.js";
import { buildSwitchFromSystem } from "../aos/models/builder.js";
import { getClient, setClient, parser, getSwitchModel, setSwitchModel } from "../aos/store.js";
import * as pool from "../aos/connection-pool.js";
import * as modelCache from "../aos/model-cache.js";

export const switchRouter = router({
  connect: publicProcedure
    .input(
      z.object({
        ip: z.string(),
        username: z.string(),
        password: z.string(),
        deviceId: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { deviceId, ip, username, password } = input;
      const newClient = new AosRestClient(ip);
      await newClient.login(username, password);
      const raw = await newClient.executeCli("show system");
      const parsed = await parser.parse("ale_aos8", "show system", raw);
      const model = buildSwitchFromSystem(parsed, ip);

      if (deviceId) {
        pool.setClient(deviceId, newClient);
        modelCache.setModel(deviceId, model);
      } else {
        getClient()?.disconnect();
        setClient(newClient);
        setSwitchModel(model);
      }

      return { connected: true, switch: model };
    }),

  disconnect: publicProcedure
    .input(z.object({ deviceId: z.string().optional() }))
    .mutation(({ input }) => {
      if (input.deviceId) {
        pool.removeClient(input.deviceId);
        modelCache.removeModel(input.deviceId);
      } else {
        getClient()?.disconnect();
        setClient(null);
        setSwitchModel(null);
      }
      return { connected: false };
    }),

  getInfo: publicProcedure
    .input(z.object({ deviceId: z.string().optional() }))
    .query(({ input }) => {
      let c: AosRestClient | null;
      let sw: import("../aos/models/switch.js").SwitchModel | null;

      if (input.deviceId) {
        c = pool.getClient(input.deviceId);
        sw = modelCache.getModel(input.deviceId);
      } else {
        c = getClient();
        sw = getSwitchModel();
      }

      if (!c?.connected) return { connected: false, switch: null };
      return { connected: true, switch: sw };
    }),
});
