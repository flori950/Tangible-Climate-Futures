import { expect, describe, it, jest } from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";
import { parseCorsOrigins, parsePositiveNumber } from "../../src/config/config";

// Small limits and a fixed CORS origin for this file
jest.mock("../../src/config/config", () => {
  const actual = jest.requireActual<typeof import("../../src/config/config")>(
    "../../src/config/config",
  );
  return {
    __esModule: true,
    ...actual,
    default: {
      ...actual.default,
      CORS_ORIGINS: ["https://tcf.example.org"],
      MAX_UPLOAD_SIZE_MB: 0.001, // ~1 kB
      JSON_BODY_LIMIT: "1kb",
    },
  };
});

import App from "../../src/app";

describe("config parsers", () => {
  it("parseCorsOrigins", () => {
    expect(parseCorsOrigins(undefined)).toBe("*");
    expect(parseCorsOrigins("*")).toBe("*");
    expect(parseCorsOrigins(" ")).toBe("*");
    expect(parseCorsOrigins("https://a.org, http://localhost:4200")).toEqual([
      "https://a.org",
      "http://localhost:4200",
    ]);
    expect(parseCorsOrigins("https://a.org,*")).toBe("*");
  });

  it("parsePositiveNumber", () => {
    expect(parsePositiveNumber(undefined, 5)).toBe(5);
    expect(parsePositiveNumber("abc", 5)).toBe(5);
    expect(parsePositiveNumber("-1", 5)).toBe(5);
    expect(parsePositiveNumber("0", 5)).toBe(5);
    expect(parsePositiveNumber("12.5", 5)).toBe(12.5);
  });
});

describe("App settings", () => {
  const app = new App();

  it("only allows the configured CORS origins", async () => {
    const allowed = await request(app.express)
      .get("/health")
      .set("Origin", "https://tcf.example.org");
    expect(allowed.headers["access-control-allow-origin"]).toBe(
      "https://tcf.example.org",
    );
    const other = await request(app.express)
      .get("/health")
      .set("Origin", "https://evil.example");
    expect(other.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("rejects uploads above MAX_UPLOAD_SIZE_MB with 413", async () => {
    const response = await request(app.express)
      .post("/api/datafile/fromFile")
      .field("dataset", "CSV")
      .attach("file", Buffer.alloc(5000, "a"), "big.csv");
    expect(response.status).toBe(413);
  });

  it("rejects JSON bodies above JSON_BODY_LIMIT with 413", async () => {
    const response = await request(app.express)
      .post("/api/datafile")
      .send({ title: "x".repeat(5000) });
    expect(response.status).toBe(413);
  });

  it("reports not ready without a database connection", async () => {
    const response = await request(app.express).get("/ready");
    expect(response.status).toBe(503);
  });

  it("shuts down gracefully", async () => {
    const exit = jest
      .spyOn(process, "exit")
      .mockImplementation((() => undefined) as never);
    const close = jest
      .spyOn(mongoose.connection, "close")
      .mockResolvedValue(undefined);
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    await app.shutdown("SIGTERM");
    expect(close).toHaveBeenCalled();
    expect(exit).toHaveBeenCalledWith(0);
  });
});
