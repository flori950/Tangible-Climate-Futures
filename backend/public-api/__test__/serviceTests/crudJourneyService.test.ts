import {
  expect,
  describe,
  it,
  afterAll,
  beforeAll,
  beforeEach,
} from "@jest/globals";
import mongoose from "mongoose";
import JourneyService from "../../src/services/journey/journey.service";
import JourneyModel from "../../src/models/journey.model";
import { NotFoundError, OperationNotSupportedError } from "../../src/errors";
import {
  BooleanOperation,
  FilterOperations,
  JourneyCreateParams,
  Visibility,
} from "../../../../common/types";
import { connectTestDatabase, disconnectTestDatabase } from "../utils/database";

const journey = (title: string, tags: string[]): JourneyCreateParams => ({
  title,
  description: `${title} description`,
  tags,
  author: "Tester",
  visibility: Visibility.PUBLIC,
  collections: [],
  excludedIDs: [],
});

describe("CrudService / JourneyService (MongoDB in memory)", () => {
  const service = new JourneyService();
  const missingId = new mongoose.Types.ObjectId().toHexString();

  beforeAll(async () => {
    await connectTestDatabase();
  });

  beforeEach(async () => {
    await JourneyModel.deleteMany({});
    for (let i = 0; i < 5; i++) {
      await service.create(journey(`J${i}`, i % 2 === 0 ? ["even"] : ["odd"]));
    }
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("create + get round-trip the document", async () => {
    const created = await service.create(journey("Created", ["x"]));
    const fetched = await service.get(String(created._id));
    expect(fetched.title).toBe("Created");
    expect(fetched.tags).toEqual(["x"]);
  });

  it("getAll paginates and reports the total count", async () => {
    const page = await service.getAll(2, 2);
    expect(page).toMatchObject({ skip: 2, limit: 2, totalCount: 5 });
    expect(page.results).toHaveLength(2);
    const last = await service.getAll(4, 10);
    expect(last.results).toHaveLength(1);
  });

  it("update returns the updated document", async () => {
    const created = await service.create(journey("Old", []));
    const updated = await service.update(String(created._id), {
      ...journey("New", ["changed"]),
    });
    expect(updated.title).toBe("New");
    expect(updated.tags).toEqual(["changed"]);
  });

  it("get/update/delete throw NotFoundError for unknown IDs", async () => {
    await expect(service.get(missingId)).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      service.update(missingId, journey("x", [])),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.delete(missingId)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("delete removes the document and returns it", async () => {
    const created = await service.create(journey("ToDelete", []));
    const deleted = await service.delete(String(created._id));
    expect(deleted.title).toBe("ToDelete");
    await expect(service.get(String(created._id))).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("deleteMany returns only the documents that existed", async () => {
    const a = await service.create(journey("A", []));
    const deleted = await service.deleteMany({
      documentIDs: [String(a._id), missingId],
    });
    expect(deleted.map((d) => d.title)).toEqual(["A"]);
    expect(await JourneyModel.countDocuments({})).toBe(5);
  });

  it("getFiltered applies filters, counts before pagination and paginates", async () => {
    const result = await service.getFiltered(
      {
        filterSet: [
          {
            key: "tags",
            operation: FilterOperations.MATCHES,
            value: "even",
            negate: false,
          },
        ],
      },
      1,
      1,
    );
    expect(result.totalCount).toBe(3);
    expect(result.results).toHaveLength(1);
  });

  it("getFiltered supports concatenation filters", async () => {
    const result = await service.getFiltered(
      {
        filterSet: [
          {
            booleanOperation: BooleanOperation.OR,
            filters: [
              {
                key: "title",
                operation: FilterOperations.MATCHES,
                value: "J0",
                negate: false,
              },
              {
                key: "title",
                operation: FilterOperations.MATCHES,
                value: "J1",
                negate: false,
              },
            ],
          },
        ],
      },
      0,
      10,
    );
    expect(result.results.map((j) => j.title).sort()).toEqual(["J0", "J1"]);
  });

  it("getFiltered rejects unsupported operations", async () => {
    await expect(
      service.getFiltered(
        {
          filterSet: [
            { key: "x", operation: "NOPE", value: 1, negate: false } as never,
          ],
        },
        0,
        10,
      ),
    ).rejects.toBeInstanceOf(OperationNotSupportedError);
  });
});
