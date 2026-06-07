import { router, publicProcedure } from "./trpc.js";
import { switchRouter } from "../routers/switch.js";
import { systemRouter } from "../routers/system.js";
import { poeRouter } from "../routers/poe.js";
import { tdrRouter } from "../routers/tdr.js";
import { vlanRouter } from "../routers/vlan.js";
import { snmpRouter } from "../routers/snmp.js";
import { trafficRouter } from "../routers/traffic.js";
import { logRouter } from "../routers/log.js";
import { firmwareRouter } from "../routers/firmware.js";
import { searchRouter } from "../routers/search.js";
import { authRouter } from "../routers/auth.js";
import { toolsRouter } from "../routers/tools.js";
import { monitorRouter } from "../routers/monitor.js";
import { deviceRouter } from "../routers/device.js";
import { alertRouter } from "../routers/alert.js";
import { eventRouter } from "../routers/event.js";
import { dashboardRouter } from "../routers/dashboard.js";
import { auditRouter } from "../routers/audit.js";

export const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: "ok", timestamp: new Date().toISOString() };
  }),
  switch: switchRouter,
  system: systemRouter,
  poe: poeRouter,
  tdr: tdrRouter,
  vlan: vlanRouter,
  snmp: snmpRouter,
  traffic: trafficRouter,
  log: logRouter,
  firmware: firmwareRouter,
  search: searchRouter,
  auth: authRouter,
  tools: toolsRouter,
  monitor: monitorRouter,
  device: deviceRouter,
  alert: alertRouter,
  event: eventRouter,
  dashboard: dashboardRouter,
  audit: auditRouter,
});

export type AppRouter = typeof appRouter;
