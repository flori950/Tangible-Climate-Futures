import { expect, describe, it, afterAll, beforeAll, jest } from "@jest/globals";
import request from "supertest";
import { Application } from "express";
import { connectTestDatabase, disconnectTestDatabase } from "../utils/database";

// Authentication ENABLED for this file, Firebase mocked: the token is the user ID.
jest.mock("../../src/config/config", () => {
  const actual = jest.requireActual<typeof import("../../src/config/config")>(
    "../../src/config/config",
  );
  return {
    __esModule: true,
    ...actual,
    default: { ...actual.default, DISABLE_SWAGGER_AUTH: false },
  };
});
jest.mock("firebase-admin/app", () => ({
  getApps: () => [{ name: "mock" }],
  initializeApp: jest.fn(),
}));
jest.mock("firebase-admin/auth", () => ({
  getAuth: () => ({
    verifyIdToken: async (token: string) => ({ uid: token }),
  }),
}));

import App from "../../src/app";

const journey = {
  title: "Mine",
  tags: [],
  author: "alice@example.org",
  visibility: "PRIVATE",
  collections: [],
  excludedIDs: [],
};

describe("Journey ownership over HTTP (auth enabled, Firebase mocked)", () => {
  let app: Application;

  beforeAll(async () => {
    await connectTestDatabase();
    app = new App().express;
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("enforces the owner from the verified token", async () => {
    const created = await request(app)
      .post("/api/journey")
      .set("Authorization", "Bearer alice")
      .send(journey);
    expect(created.status).toBe(200);
    expect(created.body).not.toHaveProperty("ownerUID");
    const journeyId = created.body._id;

    // The frontend sends the loaded journey back unchanged: must not fail with 422
    const { _id, createdAt, updatedAt, __v, ...roundTrip } = created.body;
    void [_id, createdAt, updatedAt, __v];
    const ownUpdate = await request(app)
      .put(`/api/journey/${journeyId}`)
      .set("Authorization", "Bearer alice")
      .send({ ...roundTrip, title: "Mine 2" });
    expect(ownUpdate.status).toBe(200);

    const foreignGet = await request(app)
      .get(`/api/journey/${journeyId}`)
      .set("Authorization", "Bearer bob");
    expect(foreignGet.status).toBe(404);

    const foreignList = await request(app)
      .get("/api/journey/limit=10&skip=0")
      .set("Authorization", "Bearer bob");
    expect(foreignList.body.totalCount).toBe(0);

    await request(app)
      .put(`/api/journey/${journeyId}`)
      .set("Authorization", "Bearer alice")
      .send({ ...roundTrip, visibility: "PUBLIC" });
    const foreignDelete = await request(app)
      .delete(`/api/journey/${journeyId}`)
      .set("Authorization", "Bearer bob");
    expect(foreignDelete.status).toBe(403);

    const clientSetsOwner = await request(app)
      .post("/api/journey")
      .set("Authorization", "Bearer bob")
      .send({ ...journey, ownerUID: "alice" });
    expect(clientSetsOwner.status).toBe(422);
  });
});
