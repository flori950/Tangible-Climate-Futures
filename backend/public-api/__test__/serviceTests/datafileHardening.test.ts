import {
  expect,
  describe,
  it,
  afterAll,
  beforeAll,
  beforeEach,
  jest,
} from "@jest/globals";
import mongoose from "mongoose";
import request from "supertest";
import { Application } from "express";
import App from "../../src/app";
import DatafileService, {
  toWritablePath,
} from "../../src/services/datafile/datafile.service";
import DatafileModel from "../../src/models/datafile.model";
import NetcdfApi from "../../src/services/netcdfApi.service";
import { MAX_PAGE_SIZE } from "../../src/services/crud.service";
import {
  DataType,
  FilterOperations,
  SupportedDatasetFileTypes,
  SupportedRawFileTypes,
} from "../../../../common/types";
import {
  NotFoundError,
  OperationNotSupportedError,
  WrongObjectTypeError,
} from "../../src/errors";
import { connectTestDatabase, disconnectTestDatabase } from "../utils/database";

const multerFile = (name: string, content: string) =>
  ({
    originalname: name,
    mimetype: "application/octet-stream",
    buffer: Buffer.from(content),
  }) as Express.Multer.File;

const doc = (title: string, data: Record<string, unknown> = {}) => ({
  title,
  dataType: DataType.NOTREFERENCED,
  tags: ["t"],
  dataSet: SupportedDatasetFileTypes.NONE,
  content: { data, location: { type: "Point" as const, coordinates: [1, 2] } },
});

const gridFsFileCount = () =>
  mongoose.connection.db!.collection("netcdf.files").countDocuments({});

describe("Datafile hardening (MongoDB in memory)", () => {
  let service: DatafileService;
  let app: Application;

  beforeAll(async () => {
    await connectTestDatabase();
    await DatafileModel.syncIndexes();
    service = new DatafileService();
    app = new App().express;
  });

  beforeEach(async () => {
    await DatafileModel.deleteMany({});
    await mongoose.connection.db!.collection("netcdf.files").deleteMany({});
    jest.restoreAllMocks();
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    jest.spyOn(NetcdfApi, "getMetaData").mockResolvedValue({ m: 1 });
    jest.spyOn(NetcdfApi, "getFileData").mockResolvedValue({ big: [1, 2] });
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  const attachNetCdf = async (id: string) =>
    service.attachFile(
      multerFile("a.nc", "x"),
      id,
      SupportedRawFileTypes.NETCDF,
    );

  describe("GridFS cleanup", () => {
    it("delete removes the NetCDF file", async () => {
      const created = await service.create(doc("a"));
      await attachNetCdf(String(created._id));
      expect(await gridFsFileCount()).toBe(1);
      await service.delete(String(created._id));
      expect(await gridFsFileCount()).toBe(0);
    });

    it("deleteMany removes the NetCDF files", async () => {
      const a = await service.create(doc("a"));
      const b = await service.create(doc("b"));
      await attachNetCdf(String(a._id));
      await attachNetCdf(String(b._id));
      await service.deleteMany({ documentIDs: [String(a._id), String(b._id)] });
      expect(await gridFsFileCount()).toBe(0);
    });

    it("attaching another file type replaces the NetCDF file", async () => {
      const a = await service.create(doc("a"));
      await attachNetCdf(String(a._id));
      await service.attachFile(
        multerFile("a.json", '{"x":1}'),
        String(a._id),
        SupportedRawFileTypes.JSON,
      );
      expect(await gridFsFileCount()).toBe(0);
    });
  });

  describe("nested values", () => {
    it.each(["content.data.x", "tags[2]", "title", "content.data.a[0].b"])(
      "allows writing %s",
      (path) => {
        expect(() => toWritablePath(path)).not.toThrow();
      },
    );

    it.each([
      "_id",
      "dataType",
      "uploadID",
      "dataSet",
      "createdAt",
      "content.$where",
      "content..x",
      "$set",
      "",
    ])("rejects writing %p", (path) => {
      expect(() => toWritablePath(path)).toThrow(OperationNotSupportedError);
    });

    it("changes either all documents or none", async () => {
      const a = await service.create(doc("a"));
      const missing = new mongoose.Types.ObjectId().toHexString();
      await expect(
        service.updateNestedValue(`${a._id},${missing}`, "content.data.x", 1),
      ).rejects.toBeInstanceOf(NotFoundError);
      const unchanged = await DatafileModel.findById(a._id).lean();
      expect(unchanged?.content).not.toHaveProperty("data.x");
    });

    it("rejects malformed IDs", async () => {
      await expect(
        service.deleteNestedValue("nope", "content.data.x"),
      ).rejects.toBeInstanceOf(WrongObjectTypeError);
    });

    it("returns the documents in request order, duplicates once", async () => {
      const a = await service.create(doc("a"));
      const b = await service.create(doc("b"));
      const result = await service.updateNestedValue(
        `${b._id}, ${a._id}, ${b._id}`,
        "content.data.x",
        "v",
      );
      expect(result.map((d) => d.title)).toEqual(["b", "a"]);
    });

    it("answers forbidden paths with 400 over HTTP", async () => {
      const a = await service.create(doc("a"));
      const response = await request(app)
        .put("/api/datafile/nestedValue/put")
        .send({ IDs: String(a._id), path: "dataType", value: "REFERENCED" });
      expect(response.status).toBe(400);
    });
  });

  describe("filters, pagination and geo index", () => {
    it("CONTAINS matches the value literally", async () => {
      await service.create(doc("a.b"));
      await service.create(doc("axb"));
      const result = await service.getFilteredExtended(
        {
          filterSet: [
            {
              key: "title",
              operation: FilterOperations.CONTAINS,
              value: "a.b",
              negate: false,
            },
          ],
        },
        0,
        10,
        true,
      );
      expect(result.results.map((d) => d.title)).toEqual(["a.b"]);
    });

    it("caps the page size and normalises skip", async () => {
      await service.create(doc("a"));
      const page = await service.getAllExtended(true, -5, 1_000_000);
      expect(page).toMatchObject({
        skip: 0,
        limit: MAX_PAGE_SIZE,
        totalCount: 1,
      });
    });

    it("creates the 2dsphere index", async () => {
      const indexes = await DatafileModel.listIndexes();
      expect(
        indexes.some((index) => index.key["content.location"] === "2dsphere"),
      ).toBe(true);
    });

    it("answers invalid locations with 400", async () => {
      const response = await request(app)
        .post("/api/datafile")
        .send({
          ...doc("bad"),
          content: {
            data: {},
            location: { type: "Point", coordinates: [500, 500] },
          },
        });
      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/Invalid location/);
    });
  });

  describe("CERv2 uploads", () => {
    it("returns the created datafiles without content.data and without empty tags", async () => {
      jest.spyOn(NetcdfApi, "getMetaData").mockResolvedValue({
        variables_metadata: {
          T2: { dimensions: ["south_north", "west_east"] },
        },
      });
      jest
        .spyOn(NetcdfApi, "getCERv2DataChunks")
        .mockImplementation(async function* () {
          yield { vars: { lon: 13, lat: 52, T2: 1 }, timeVars: {} };
        });
      const created = await service.createFromFile(
        multerFile("c.nc", "x"),
        SupportedDatasetFileTypes.CERV2,
      );
      expect(created).toHaveLength(1);
      expect(created[0].content).not.toHaveProperty("data");
      expect(created[0].tags).toEqual(["CERv2", "T2"]);
      expect(await DatafileModel.countDocuments({})).toBe(1);
    });
  });

  describe("readiness", () => {
    it("reports ready while MongoDB is connected", async () => {
      const response = await request(app).get("/ready");
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: "ready" });
    });
  });
});
