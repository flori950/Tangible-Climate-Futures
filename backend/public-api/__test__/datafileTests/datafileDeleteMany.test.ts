import request from "supertest";
import { expect, describe, it, afterAll, beforeAll } from "@jest/globals";
import App from "../../src/app";
import mongoose from "mongoose";
import { connectTestDatabase, disconnectTestDatabase } from "../utils/database";
import { compareSingleJson } from "../utils/helpers";
import { Application } from "express";
import DatafileSchema from "../../src/models/datafile.model";
import type { Datafile } from "../../../../common/types";

describe("Checks if /deleteMany for Datafile", () => {
  let app: Application;
  const ids: string[] = [];

  beforeAll(async () => {
    // Create MongoDB
    await connectTestDatabase();
    app = new App().express;
    ids.push(
      (await DatafileSchema.create(datafileObject as unknown as Datafile))._id,
    );
    ids.push(
      (await DatafileSchema.create(otherObject as unknown as Datafile))._id,
    );
  });

  afterAll(async () => {
    // Close MongoDB connection and server
    await disconnectTestDatabase();
  });

  it('returns {"status":"200"} for existing IDs', async () => {
    const response = await request(app)
      .post("/api/datafile/deleteMany")
      .send({ documentIDs: ids });
    // Check the response status
    expect(response.status).toBe(200);
    // Compare the response object to the posted object
    expect(
      compareSingleJson(
        [datafileObject, otherObject],
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

const datafileObject = {
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

const otherObject = { ...datafileObject, title: "other title" };
