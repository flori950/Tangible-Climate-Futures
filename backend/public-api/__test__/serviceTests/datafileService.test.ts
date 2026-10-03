import {
  expect,
  describe,
  it,
  afterAll,
  beforeAll,
  beforeEach,
  jest,
} from "@jest/globals";
import path from "node:path";
import { readFileSync } from "node:fs";
import mongoose from "mongoose";
import request from "supertest";
import { Application } from "express";
import App from "../../src/app";
import DatafileService from "../../src/services/datafile/datafile.service";
import DatafileModel from "../../src/models/datafile.model";
import NetcdfApi from "../../src/services/netcdfApi.service";
import NetCDFJsonBucketService from "../../src/services/bucket/netcdfBucket.service";
import {
  DataType,
  SupportedDatasetFileTypes,
  SupportedRawFileTypes,
} from "../../../../common/types";
import {
  FailedToParseError,
  NotFoundError,
  OperationNotSupportedError,
} from "../../src/errors";
import { connectTestDatabase, disconnectTestDatabase } from "../utils/database";

const multerFile = (name: string, content: string | Buffer) =>
  ({
    originalname: name,
    mimetype: "application/octet-stream",
    buffer: Buffer.isBuffer(content) ? content : Buffer.from(content),
  }) as Express.Multer.File;

const notRefDoc = (data: Record<string, unknown>) => ({
  title: "Doc",
  dataType: DataType.NOTREFERENCED,
  tags: ["t"],
  dataSet: SupportedDatasetFileTypes.NONE,
  content: { data, location: { type: "Point" as const, coordinates: [1, 2] } },
});

describe("DatafileService (MongoDB in memory)", () => {
  let service: DatafileService;
  let app: Application;
  const missingId = new mongoose.Types.ObjectId().toHexString();

  beforeAll(async () => {
    await connectTestDatabase();
    service = new DatafileService();
    app = new App().express;
  });

  beforeEach(async () => {
    await DatafileModel.deleteMany({});
    jest.restoreAllMocks();
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  describe("nested values", () => {
    it("returns falsy values such as 0 and false (not 404)", async () => {
      const doc = await service.create(notRefDoc({ zero: 0, no: false }));
      await expect(
        service.getNestedValue(String(doc._id), "content.data.zero"),
      ).resolves.toBe(0);
      await expect(
        service.getNestedValue(String(doc._id), "content.data.no"),
      ).resolves.toBe(false);
      await expect(
        service.getNestedValue(String(doc._id), "content.data.missing"),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("updateNestedValue updates several comma-separated IDs", async () => {
      const a = await service.create(notRefDoc({}));
      const b = await service.create(notRefDoc({}));
      const updated = await service.updateNestedValue(
        `${a._id}, ${b._id}`,
        "content.data.list[0]",
        "v",
      );
      expect(updated).toHaveLength(2);
      const fresh = await DatafileModel.findById(b._id).lean();
      expect(fresh?.content).toMatchObject({ data: { list: { 0: "v" } } });
    });

    it("does not upsert documents for unknown IDs", async () => {
      await expect(
        service.updateNestedValue(missingId, "content.data.x", 1),
      ).rejects.toBeInstanceOf(NotFoundError);
      await expect(
        service.deleteNestedValue(missingId, "content.data.x"),
      ).rejects.toBeInstanceOf(NotFoundError);
      expect(await DatafileModel.countDocuments({})).toBe(0);
    });
  });

  describe("dataset uploads", () => {
    it("CSV dataset creates CSV datafiles with numeric locations", async () => {
      const csv = "name,lon,lat\nA,13.4,52.5\nB,,\n";
      const docs = await service.createFromFile(
        multerFile("points.csv", csv),
        SupportedDatasetFileTypes.CSV,
        " extra , tags ",
      );
      expect(docs).toHaveLength(2);
      const stored = await DatafileModel.find({}).sort({ title: 1 }).lean();
      expect(stored.map((d) => d.dataSet)).toEqual(["CSV", "CSV"]);
      expect(stored[0].tags).toEqual([
        "CSV",
        "datapoint",
        "points.csv",
        "extra",
        "tags",
      ]);
      expect(stored[0].description).toContain("no.0");
      expect(stored[1].description).toContain("no.1");
      expect(stored[0].content).toMatchObject({
        location: { type: "Point", coordinates: [13.4, 52.5] },
      });
      // Rows without coordinates are stored without a bogus location
      expect(
        (stored[1].content as { location?: unknown }).location,
      ).toBeUndefined();
      expect(stored[0].uploadID).toBe(stored[1].uploadID);
    });

    it("CSV dataset rejects malformed CSV with FailedToParseError", async () => {
      await expect(
        service.createFromFile(
          multerFile("bad.csv", 'a,b\n"unterminated,1\n'),
          SupportedDatasetFileTypes.CSV,
        ),
      ).rejects.toBeInstanceOf(FailedToParseError);
    });

    it("SimRa dataset creates header and datapoint documents linked by headersRefs", async () => {
      const simra = readFileSync(path.join(__dirname, "../testFiles/simra"));
      const docs = await service.createFromFile(
        multerFile("ride", simra),
        SupportedDatasetFileTypes.SIMRA,
        undefined,
        "custom",
      );
      const headers = await DatafileModel.find({ tags: "header" }).lean();
      const points = await DatafileModel.find({ tags: "datapoint" }).lean();
      expect(docs).toHaveLength(3);
      expect(headers).toHaveLength(1);
      expect(points).toHaveLength(2);
      const pointData = (points[0].content as { data: Record<string, unknown> })
        .data;
      expect(pointData.versionInfo).toBe("01#1");
      expect(pointData.headersRefs).toEqual([String(headers[0]._id)]);
      expect(points[0].description).toBe("custom");
    });

    it("SimRa dataset without separator line is rejected", async () => {
      await expect(
        service.createFromFile(
          multerFile("ride", "01#1\na,b\n1,2\n"),
          SupportedDatasetFileTypes.SIMRA,
        ),
      ).rejects.toBeInstanceOf(FailedToParseError);
    });

    it("CERv2 dataset creates one datafile per chunk from the (mocked) Python service", async () => {
      jest.spyOn(NetcdfApi, "getMetaData").mockResolvedValue({
        variables_metadata: {
          T2: { dimensions: ["time", "south_north", "west_east"] },
          time: { dimensions: ["time"] },
        },
      });
      jest
        .spyOn(NetcdfApi, "getCERv2DataChunks")
        .mockImplementation(async function* (_file, options) {
          expect(options).toEqual({ filter: ["T2"], stepSize: 3 });
          yield { vars: { lon: 13, lat: 52, T2: 280 }, timeVars: { t: [1] } };
          yield { vars: { lon: 14, lat: 53, T2: 281 }, timeVars: { t: [1] } };
        });
      await service.createFromFile(
        multerFile("cerv2.nc", "x"),
        SupportedDatasetFileTypes.CERV2,
        "a,b",
        undefined,
        "3",
      );
      const stored = await DatafileModel.find({}).sort({ title: 1 }).lean();
      expect(stored).toHaveLength(2);
      expect(stored[0].tags).toEqual(["CERv2", "a", "b", "T2"]);
      expect(stored[0].content).toMatchObject({
        data: { vars: { T2: 280 } },
        location: { coordinates: [13, 52] },
      });
      expect(stored[1].description).toContain("no.1");
    });

    it("rejects unsupported datasets", async () => {
      await expect(
        service.createFromFile(multerFile("x", "x"), "FOO" as never),
      ).rejects.toBeInstanceOf(OperationNotSupportedError);
    });
  });

  describe("attach NETCDF + GridFS bucket", () => {
    it("stores large NetCDF data in GridFS and resolves it on get()", async () => {
      const doc = await service.create(notRefDoc({}));
      const id = String(doc._id);
      jest
        .spyOn(NetcdfApi, "getMetaData")
        .mockResolvedValue({ dims: { time: 2 } });
      jest
        .spyOn(NetcdfApi, "getFileData")
        .mockResolvedValue({ T2: [280, 281] });

      const attached = await service.attachFile(
        multerFile("a.nc", "x"),
        id,
        SupportedRawFileTypes.NETCDF,
      );
      const attachedData = (
        attached.content as { data: { dataObject: Record<string, unknown> } }
      ).data.dataObject;
      expect(attachedData.data).toEqual({ T2: [280, 281] });
      expect(attachedData.dataId).toBeUndefined();

      // In MongoDB only the GridFS reference is stored
      const raw = await DatafileModel.findById(id).lean();
      const rawData = (
        raw?.content as { data: { dataObject: Record<string, unknown> } }
      ).data.dataObject;
      expect(rawData.netCdfInfo).toEqual({ dims: { time: 2 } });
      expect(typeof rawData.dataId).toBe("string");

      // get() and getAllExtended() resolve the data from GridFS again
      const fetched = await service.get(id);
      expect(
        (fetched.content as { data: { dataObject: { data: unknown } } }).data
          .dataObject.data,
      ).toEqual({ T2: [280, 281] });
      const all = await service.getAllExtended(false, 0, 10);
      expect(all.totalCount).toBe(1);
      expect(all.results[0].content).toMatchObject({
        data: { dataObject: { data: { T2: [280, 281] } } },
      });
    });

    it("bucket upload replaces files with the same name", async () => {
      const bucket = new NetCDFJsonBucketService();
      await bucket.uploadFile("same", { v: 1 });
      await bucket.uploadFile("same", { v: 2 });
      await expect(bucket.downloadFile("same")).resolves.toEqual({ v: 2 });
      const files = await mongoose.connection
        .db!.collection("netcdf.files")
        .countDocuments({ filename: "same.netcdf.json" });
      expect(files).toBe(1);
    });

    it("attachFile throws NotFoundError for unknown documents", async () => {
      await expect(
        service.attachFile(
          multerFile("a.json", "{}"),
          missingId,
          SupportedRawFileTypes.JSON,
        ),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("attachFile rejects invalid JSON files", async () => {
      const doc = await service.create(notRefDoc({}));
      await expect(
        service.attachFile(
          multerFile("a.json", "{not json"),
          String(doc._id),
          SupportedRawFileTypes.JSON,
        ),
      ).rejects.toBeInstanceOf(FailedToParseError);
    });
  });

  describe("HTTP validation", () => {
    it("rejects malformed ObjectIds in the path with 422", async () => {
      const response = await request(app).get(
        "/api/datafile/646365496740ded7a396f5d0EXTRA",
      );
      expect(response.status).toBe(422);
    });

    it("rejects invalid _id filter values with 400", async () => {
      const response = await request(app)
        .post("/api/datafile/filter/limit=10&skip=0&onlyMetadata=true")
        .send({
          filterSet: [
            { key: "_id", operation: "MATCHES", value: "nope", negate: false },
          ],
        });
      expect(response.status).toBe(400);
    });

    it("rejects malformed JSON bodies with 400", async () => {
      const response = await request(app)
        .post("/api/datafile")
        .set("Content-Type", "application/json")
        .send('{"title": ');
      expect(response.status).toBe(400);
    });
  });
});
