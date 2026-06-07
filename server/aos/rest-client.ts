import { parseAosXml } from "./xml-parser.js";
import { AOS_REST_ACCEPT, AOS_CONTEXT } from "../../shared/const.js";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 3000;

// AOS switches use self-signed certificates.
// NODE_TLS_REJECT_UNAUTHORIZED=0 is set in .env to allow HTTPS without verification.

export class AosRestClient {
  private ip: string;
  private token: string | null = null;
  private _connected = false;

  constructor(ip: string) {
    this.ip = ip;
  }

  get connected(): boolean {
    return this._connected;
  }

  async login(username: string, password: string): Promise<void> {
    const url = `https://${this.ip}/?domain=authv2&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
    const response = await this.fetchWithRetry(url, {});

    if (!response.ok) {
      throw new Error("Authentication failed");
    }

    const xml = await response.text();
    const data = parseAosXml(xml);

    if (!data.token) {
      throw new Error("Authentication failed");
    }

    this.token = data.token;
    this._connected = true;
  }

  async executeCli(command: string): Promise<string> {
    this.ensureConnected();

    const url = `https://${this.ip}/cli/aos?cmd=${encodeURIComponent(command)}`;
    const response = await this.fetchWithAuth(url);
    const xml = await response.text();
    const data = parseAosXml(xml);

    return data.output ?? "";
  }

  async executeMib(urn: string): Promise<Record<string, string>> {
    this.ensureConnected();

    const url = `https://${this.ip}/?domain=mib&${urn}`;
    const response = await this.fetchWithAuth(url);
    const xml = await response.text();
    const data = parseAosXml(xml);

    return data as Record<string, string>;
  }

  async executeMibSet(
    urn: string,
    data: Record<string, string>,
  ): Promise<Record<string, string>> {
    this.ensureConnected();

    const url = `https://${this.ip}/?domain=mib&${urn}`;
    const body = new URLSearchParams(data).toString();

    const response = await this.fetchWithRetry(url, {
      method: "POST",
      headers: this.getHeaders(),
      body,
    });

    if (response.status === 401) {
      this.token = null;
      this._connected = false;
      throw new Error("Session expired");
    }

    const xml = await response.text();
    const result = parseAosXml(xml);

    return result as Record<string, string>;
  }

  disconnect(): void {
    this.token = null;
    this._connected = false;
  }

  private ensureConnected(): void {
    if (!this._connected || !this.token) {
      throw new Error("Not connected");
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: AOS_REST_ACCEPT,
      Alu_context: AOS_CONTEXT,
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    return headers;
  }

  private async fetchWithAuth(url: string): Promise<Response> {
    const response = await this.fetchWithRetry(url, {
      headers: this.getHeaders(),
    });

    if (response.status === 401) {
      this.token = null;
      this._connected = false;
      throw new Error("Session expired");
    }

    return response;
  }

  private async fetchWithRetry(
    url: string,
    init?: RequestInit,
  ): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(url, init);

        if (response.ok) {
          return response;
        }

        // Don't retry on auth failures
        if (response.status === 401) {
          return response;
        }

        if (attempt === MAX_RETRIES - 1) {
          return response;
        }

        lastError = new Error(`HTTP ${response.status}`);
      } catch (error) {
        lastError =
          error instanceof Error ? error : new Error(String(error));
      }

      if (attempt < MAX_RETRIES - 1) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }

    throw lastError ?? new Error("Request failed");
  }
}
