import request from "supertest";
import { expect, describe, it, afterAll, beforeAll } from "@jest/globals";
import App from "../../src/app";
import { connectTestDatabase, disconnectTestDatabase } from "../utils/database";
import { compareSingleJson } from "../utils/helpers";
import { Application } from "express";

describe("Checks if simple GET for DataFile works", () => {
  let app: Application;
  let docID: string;

  beforeAll(async () => {
    // Create MongoDB
    await connectTestDatabase();
    app = new App().express;
    // Post a single document
    const response = await request(app).post("/api/datafile").send(document1);
    // Get the document id
    docID = JSON.parse(response.text)["_id"];
  });

  afterAll(async () => {
    // Close MongoDB connection and server
    await disconnectTestDatabase();
  });

  it("Should return a single document with given ID", async () => {
    // Set GET request
    const response = await request(app).get(`/api/datafile/${docID}`);
    // Check the response status
    expect(response.status).toBe(200);
    // Compare the response object to the posted object
    expect(compareSingleJson(document1, JSON.parse(response.text))).toBe(true);
  });
});

const document1 = {
  title: "CatPicture",
  description: "Some pretty cat!",
  dataType: "REFERENCED",
  tags: ["pic", "new", "photo"],
  dataSet: "NONE",
  content: {
    url: "someUrl",
    mediaType: "VIDEO",
    location: {
      type: "Point",
      coordinates: [0, 0],
    },
  },
};
