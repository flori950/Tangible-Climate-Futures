import request from "supertest";
import { expect, describe, it, afterAll, beforeAll } from "@jest/globals";
import App from "../../src/app";
import { connectTestDatabase, disconnectTestDatabase } from "../utils/database";
import { compareSingleJson } from "../utils/helpers";
import { Application } from "express";

describe("Checks if simple PUT for DataFile works", () => {
  let app: Application;

  beforeAll(async () => {
    // Create MongoDB
    await connectTestDatabase();
    app = new App().express;
  });

  afterAll(async () => {
    // Close MongoDB connection and server
    await disconnectTestDatabase();
  });

  it("Should update the document", async () => {
    // Post a single document
    let response = await request(app).post("/api/datafile").send(document1);
    // Get the document id
    const docID = JSON.parse(response.text)["_id"];
    // Set GET request
    response = await request(app).get(`/api/datafile/${docID}`);
    // Check the response status
    expect(response.status).toBe(200);
    // Compare the response object to the posted object
    expect(compareSingleJson(document1, JSON.parse(response.text))).toBe(true);
    // Update the file
    response = await request(app).put(`/api/datafile/${docID}`).send(document2);
    // Check the response status
    expect(response.status).toBe(200);
    // Compare the response object to the posted object
    expect(compareSingleJson(document2, JSON.parse(response.text))).toBe(true);
    // Get the new file
    response = await request(app).get(`/api/datafile/${docID}`);
    // Check the response status
    expect(response.status).toBe(200);
    // Compare the response object to the posted object
    expect(compareSingleJson(document2, JSON.parse(response.text))).toBe(true);
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
const document2 = {
  title: "CatPicture",
  description: "Some pretty cat and dog!",
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
