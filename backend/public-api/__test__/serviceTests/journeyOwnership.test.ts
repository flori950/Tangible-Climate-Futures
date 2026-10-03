import {
  expect,
  describe,
  it,
  afterAll,
  beforeAll,
  beforeEach,
} from "@jest/globals";
import JourneyService from "../../src/services/journey/journey.service";
import JourneyModel from "../../src/models/journey.model";
import { ForbiddenError, NotFoundError } from "../../src/errors";
import {
  FilterOperations,
  Journey,
  JourneyCreateParams,
  Visibility,
} from "../../../../common/types";
import { connectTestDatabase, disconnectTestDatabase } from "../utils/database";

const journey = (
  title: string,
  visibility = Visibility.PUBLIC,
): JourneyCreateParams => ({
  title,
  tags: [],
  author: "someone@example.org",
  visibility,
  collections: [],
  excludedIDs: [],
});

const id = (j: Journey) => String(j._id);
/** What the client receives (Express serialises the documents with JSON.stringify). */
const asJson = (value: unknown) => JSON.parse(JSON.stringify(value));

describe("JourneyService ownership rules", () => {
  const alice = new JourneyService("alice");
  const bob = new JourneyService("bob");
  const noAuth = new JourneyService(undefined);

  beforeAll(async () => {
    await connectTestDatabase();
  });

  beforeEach(async () => {
    await JourneyModel.deleteMany({});
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("stores the owner but never returns it", async () => {
    const created = await alice.create(journey("A"));
    expect(asJson(created)).not.toHaveProperty("ownerUID");
    const raw = await JourneyModel.findById(created._id)
      .select("+ownerUID")
      .lean();
    expect((raw as { ownerUID?: string }).ownerUID).toBe("alice");
    expect(asJson(await alice.get(id(created)))).not.toHaveProperty("ownerUID");
    const list = await alice.getAll(0, 10);
    expect(asJson(list.results[0])).not.toHaveProperty("ownerUID");
    const updated = await alice.update(id(created), journey("A2"));
    expect(asJson(updated)).not.toHaveProperty("ownerUID");
  });

  it("hides PRIVATE journeys of other users", async () => {
    const privateJourney = await alice.create(
      journey("secret", Visibility.PRIVATE),
    );
    const publicJourney = await alice.create(journey("open"));

    await expect(bob.get(id(privateJourney))).rejects.toBeInstanceOf(
      NotFoundError,
    );
    await expect(bob.get(id(publicJourney))).resolves.toMatchObject({
      title: "open",
    });
    const bobList = await bob.getAll(0, 10);
    expect(bobList.totalCount).toBe(1);
    expect(bobList.results.map((j) => j.title)).toEqual(["open"]);
    const bobFiltered = await bob.getFiltered(
      {
        filterSet: [
          {
            key: "title",
            operation: FilterOperations.CONTAINS,
            value: "e",
            negate: false,
          },
        ],
      },
      0,
      10,
    );
    expect(bobFiltered.results.map((j) => j.title)).toEqual(["open"]);
    // The owner sees both
    expect((await alice.getAll(0, 10)).totalCount).toBe(2);
  });

  it("only lets the owner update and delete", async () => {
    const created = await alice.create(journey("A"));
    await expect(
      bob.update(id(created), journey("hacked")),
    ).rejects.toBeInstanceOf(ForbiddenError);
    await expect(bob.delete(id(created))).rejects.toBeInstanceOf(
      ForbiddenError,
    );
    await expect(
      bob.deleteMany({ documentIDs: [id(created)] }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(await JourneyModel.countDocuments({})).toBe(1);

    await expect(
      alice.update(id(created), journey("A2")),
    ).resolves.toMatchObject({ title: "A2" });
    await expect(
      alice.deleteMany({ documentIDs: [id(created)] }),
    ).resolves.toHaveLength(1);
  });

  it("keeps journeys without owner open to everyone", async () => {
    const legacy = await noAuth.create(journey("legacy", Visibility.PRIVATE));
    await expect(bob.get(id(legacy))).resolves.toMatchObject({
      title: "legacy",
    });
    await expect(bob.delete(id(legacy))).resolves.toMatchObject({
      title: "legacy",
    });
  });

  it("applies no rules when authentication is disabled", async () => {
    const created = await alice.create(journey("A", Visibility.PRIVATE));
    await expect(noAuth.get(id(created))).resolves.toBeDefined();
    await expect(noAuth.delete(id(created))).resolves.toBeDefined();
  });
});
