import { AosRestClient } from "./rest-client.js";
import { TextFSMParser } from "./textfsm.js";
import type { SwitchModel } from "./models/switch.js";

let client: AosRestClient | null = null;
let switchModel: SwitchModel | null = null;

export const parser = new TextFSMParser(
  `http://localhost:${process.env.PYTHON_BACKEND_PORT ?? 8001}`,
);

export function getClient(): AosRestClient | null {
  return client;
}

export function setClient(c: AosRestClient | null): void {
  client = c;
}

export function getSwitchModel(): SwitchModel | null {
  return switchModel;
}

export function setSwitchModel(m: SwitchModel | null): void {
  switchModel = m;
}
