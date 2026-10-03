import request from "supertest";
import { expect, describe, it, afterAll, beforeAll } from "@jest/globals";
import App from "../../src/app";
import mongoose from "mongoose";
import { connectTestDatabase, disconnectTestDatabase } from "../utils/database";
import { compareSingleJson } from "../utils/helpers";
import { Application } from "express";
import JourneySchema from "../../src/models/journey.model";
import type { Journey } from "../../../../common/types";

describe("Checks if simple PUT for Journey", () => {
  let app: Application;
  let id: string;

  beforeAll(async () => {
    // Create MongoDB
    await connectTestDatabase();
    app = new App().express;
    const response = await JourneySchema.create(
      journeyObject as unknown as Journey,
    );
    id = response._id;
  });

  afterAll(async () => {
    // Close MongoDB connection and server
    await disconnectTestDatabase();
  });

  it('returns {"status":"200"} and updated Document for existing ID', async () => {
    const response = await request(app)
      .put(`/api/journey/${id}`)
      .send(newJourneyObject);
    // Check the response status
    expect(response.status).toBe(200);
    // Compare the response object to the posted object
    expect(compareSingleJson(newJourneyObject, JSON.parse(response.text))).toBe(
      true,
    );
  });

  it('returns {"status":"404"} for non-existing ID', async () => {
    const differentID = mongoose.Types.ObjectId.createFromTime(1);
    const response = await request(app)
      .delete(`/api/journey/${differentID}`)
      .send(newJourneyObject);
    // Check the response status
    expect(response.status).toBe(404);
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

const newJourneyObject = { ...journeyObject, title: "New Title" };
