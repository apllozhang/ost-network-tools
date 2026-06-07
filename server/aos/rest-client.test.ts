import { describe, it, expect, vi, beforeEach } from "vitest";
import { AosRestClient } from "./rest-client.js";

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("AosRestClient", () => {
  let client: AosRestClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new AosRestClient("192.168.1.1");
  });

  describe("login", () => {
    it("sends auth request and stores token", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () =>
          Promise.resolve(
            "<nodes><result><data><token>test-token-123</token></data></result></nodes>"
          ),
      });
      await client.login("admin", "switch");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("domain=authv2"),
        expect.any(Object)
      );
      expect(client.connected).toBe(true);
    });

    it("throws on auth failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve("Unauthorized"),
      });
      await expect(client.login("admin", "wrong")).rejects.toThrow(
        "Authentication failed"
      );
    });
  });

  describe("executeCli", () => {
    it("sends CLI command and returns output", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () =>
          Promise.resolve(
            "<nodes><result><data><token>t</token></data></result></nodes>"
          ),
      });
      await client.login("admin", "switch");

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () =>
          Promise.resolve(
            "<nodes><result><data><output>System: OS6860</output></data></result></nodes>"
          ),
      });
      const result = await client.executeCli("show system");
      expect(result).toBe("System: OS6860");
    });
  });
});
