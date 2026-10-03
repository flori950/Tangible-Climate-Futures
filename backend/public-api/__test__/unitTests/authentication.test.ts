import {
  expect,
  describe,
  it,
  jest,
  beforeEach,
  afterAll,
} from "@jest/globals";
import type { Request } from "express";
import request from "supertest";

// firebase-admin is mocked: no network calls and no real project needed.
const verifyIdToken = jest.fn<(token: string) => Promise<unknown>>();
const initializeApp = jest.fn(() => ({ name: "mock-app" }));
const getApps = jest.fn((): unknown[] => []);
jest.mock("firebase-admin/app", () => ({
  initializeApp: (...args: unknown[]) => initializeApp(...(args as [])),
  getApps: () => getApps(),
}));
jest.mock("firebase-admin/auth", () => ({
  getAuth: () => ({ verifyIdToken }),
}));

type AuthModule = typeof import("../../src/authentication");

/** Loads a fresh copy of the auth module (config is read at import time). */
function loadAuth(disableAuth: string | undefined): AuthModule {
  if (disableAuth === undefined) {
    delete process.env.DISABLE_SWAGGER_AUTH;
  } else {
    process.env.DISABLE_SWAGGER_AUTH = disableAuth;
  }
  let mod: AuthModule | undefined;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require("../../src/authentication");
  });
  return mod as AuthModule;
}

const requestWith = (authorization?: string) =>
  ({ headers: authorization ? { authorization } : {} }) as Request;

describe("expressAuthentication", () => {
  const originalFlag = process.env.DISABLE_SWAGGER_AUTH;

  beforeEach(() => {
    verifyIdToken.mockReset();
    initializeApp.mockClear();
    getApps.mockReset();
    getApps.mockReturnValue([]);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterAll(() => {
    process.env.DISABLE_SWAGGER_AUTH = originalFlag;
  });

  it("bypasses authentication only when DISABLE_SWAGGER_AUTH is 'true'", async () => {
    const { expressAuthentication } = loadAuth("true");
    await expect(
      expressAuthentication(requestWith(), "firebase"),
    ).resolves.toEqual({});
    expect(verifyIdToken).not.toHaveBeenCalled();
  });

  it.each([undefined, "false", "", "1"])(
    "enforces authentication when DISABLE_SWAGGER_AUTH=%p",
    async (flag) => {
      const { expressAuthentication } = loadAuth(flag);
      await expect(
        expressAuthentication(requestWith(), "firebase"),
      ).rejects.toHaveProperty("constructor.name", "UnauthorizedError");
    },
  );

  it("rejects requests without a Bearer token", async () => {
    const { expressAuthentication } = loadAuth("false");
    await expect(
      expressAuthentication(requestWith("Basic abc"), "firebase"),
    ).rejects.toHaveProperty("constructor.name", "UnauthorizedError");
    await expect(
      expressAuthentication(requestWith("Bearer "), "firebase"),
    ).rejects.toHaveProperty("constructor.name", "UnauthorizedError");
    expect(verifyIdToken).not.toHaveBeenCalled();
  });

  it("rejects unknown security schemes", async () => {
    const { expressAuthentication } = loadAuth("false");
    await expect(
      expressAuthentication(requestWith("Bearer token"), "apiKey"),
    ).rejects.toHaveProperty("constructor.name", "UnauthorizedError");
  });

  it("returns the decoded token for a valid Firebase ID token", async () => {
    const { expressAuthentication } = loadAuth("false");
    verifyIdToken.mockResolvedValue({ uid: "user-1" });
    await expect(
      expressAuthentication(requestWith("Bearer good-token"), "firebase"),
    ).resolves.toEqual({ uid: "user-1" });
    expect(verifyIdToken).toHaveBeenCalledWith("good-token");
    expect(initializeApp).toHaveBeenCalledTimes(1);
  });

  it("reuses an already initialized Firebase app", async () => {
    const { expressAuthentication } = loadAuth("false");
    getApps.mockReturnValue([{ name: "existing" }]);
    verifyIdToken.mockResolvedValue({ uid: "user-1" });
    await expressAuthentication(requestWith("Bearer t"), "firebase");
    expect(initializeApp).not.toHaveBeenCalled();
  });

  it("maps verification failures to UnauthorizedError (401, not 500)", async () => {
    const { expressAuthentication } = loadAuth("false");
    verifyIdToken.mockRejectedValue(new Error("auth/id-token-expired"));
    await expect(
      expressAuthentication(requestWith("Bearer expired"), "firebase"),
    ).rejects.toHaveProperty("constructor.name", "UnauthorizedError");
  });

  it("protects the API routes end-to-end when auth is enabled", async () => {
    process.env.DISABLE_SWAGGER_AUTH = "false";
    let app: import("express").Application | undefined;
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const App = require("../../src/app").default;
      app = new App().express;
    });
    const noToken = await request(app!).get("/api/journey/limit=1&skip=0");
    expect(noToken.status).toBe(401);
    expect(noToken.body).toEqual({
      message: "Access denied. Please provide valid credentials.",
    });

    verifyIdToken.mockRejectedValue(new Error("invalid"));
    const badToken = await request(app!)
      .get("/api/journey/limit=1&skip=0")
      .set("Authorization", "Bearer bad");
    expect(badToken.status).toBe(401);

    // Health check and Swagger docs stay public
    expect((await request(app!).get("/health")).status).toBe(200);
    expect((await request(app!).get("/docs/")).status).toBe(200);
  });
});
