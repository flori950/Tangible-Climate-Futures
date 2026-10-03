import request from "supertest";
import { expect, describe, it, afterAll, beforeAll } from "@jest/globals";
import App from "../../src/app";
import { connectTestDatabase, disconnectTestDatabase } from "../utils/database";
import { checkArrayContainsObjects } from "../utils/helpers";
import { Application } from "express";
import JourneySchema from "../../src/models/journey.model";
import type { Journey } from "../../../../common/types";

let app: Application;

beforeAll(async () => {
  // Create MongoDB
  await connectTestDatabase();
  app = new App().express;
  // Post documents
  await JourneySchema.create(journeyObject as unknown as Journey);
});

afterAll(async () => {
  // Close MongoDB
  await disconnectTestDatabase();
});

describe("Checks if simple CONTAINS works", () => {
  it('Should return {"status":"200"}', async () => {
    const filter = {
      filterSet: [
        {
          key: "tags",
          operation: "CONTAINS",
          value: "these",
          negate: false,
        },
      ],
    };
    // Send filter
    const response = await request(app)
      .post("/api/journey/filter/limit=15&skip=0")
      .send(filter);
    const results = JSON.parse(response.text)["results"];
    // Check the response status
    expect(response.status).toBe(200);
    // Compare the response object to the posted object
    expect(checkArrayContainsObjects([journeyObject], results)).toBe(true);
  });
});

const journeyObject = {
  title: "Journey",
  description: "This is a journey",
  tags: ["these", "are", "tags"],
  author: "John Doe",
  parentID: "646365496740ded7a396f5d0",
  visibility: "PUBLIC",
  collections: [
    {
      title: "sample",
      filterSet: [
        {
          key: "tags",
          operation: "CONTAINS",
          value: "pic",
          negate: false,
        },
      ],
    },
  ],
  excludedIDs: ["646365496740ded7a396f5d1"],
};
