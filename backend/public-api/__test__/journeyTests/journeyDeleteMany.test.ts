import request from "supertest";
import { expect, describe, it, afterAll, beforeAll } from "@jest/globals";
import App from "../../src/app";
import mongoose from "mongoose";
import { connectTestDatabase, disconnectTestDatabase } from "../utils/database";
import { compareSingleJson } from "../utils/helpers";
import { Application } from "express";
import JourneySchema from "../../src/models/journey.model";
import type { Journey } from "../../../../common/types";

describe("Checks if /deleteMany for Journey", () => {
  let app: Application;
  const ids: string[] = [];

  beforeAll(async () => {
    // Create MongoDB
    await connectTestDatabase();
    app = new App().express;
    ids.push(
      (await JourneySchema.create(journeyObject as unknown as Journey))._id,
    );
    ids.push(
      (await JourneySchema.create(otherObject as unknown as Journey))._id,
    );
  });

  afterAll(async () => {
    // Close MongoDB connection and server
    await disconnectTestDatabase();
  });

  it('returns {"status":"200"} for existing IDs', async () => {
    const response = await request(app)
      .post("/api/journey/deleteMany")
      .send({ documentIDs: ids });
    // Check the response status
    expect(response.status).toBe(200);
    // Compare the response object to the posted object
    expect(
      compareSingleJson(
        [journeyObject, otherObject],
        JSON.parse(response.text),
      ),
    ).toBe(true);
  });

  it('returns {"status":"200"} and empty list for non-existing IDs', async () => {
    const differentIDs = [
      mongoose.Types.ObjectId.createFromTime(1),
      mongoose.Types.ObjectId.createFromTime(2),
    ];
    const response = await request(app)
      .post("/api/journey/deleteMany")
      .send({ documentIDs: differentIDs }); // Check the response status
    expect(response.status).toBe(200);
    expect(JSON.parse(response.text)).toEqual([]);
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

const otherObject = { ...journeyObject, title: "other title" };
