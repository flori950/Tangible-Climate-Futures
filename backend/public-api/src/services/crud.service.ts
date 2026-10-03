import { Model, PipelineStage, UpdateQuery } from "mongoose";
import { NotFoundError } from "../errors";
import {
  AnyFilter,
  DeleteManyParam,
  FilterSetParams,
  PaginationResult,
} from "../../../../common/types";
import {
  createBasicFilterQuery,
  createConcatenationFilterQuery,
} from "./filter/filter.service";

/** Upper bound for the page size of list and filter endpoints. */
export const MAX_PAGE_SIZE = 1000;

/**
 * Additional aggregation stages for paginated queries.
 * `match` stages run before pagination (and are included in `totalCount`),
 * `project` stages run on the returned page only.
 */
export interface PipelineOptions {
  match?: PipelineStage[];
  project?: PipelineStage[];
}

/**
 * CrudService
 *
 * Abstract crud service class providing common CRUD operations for a Mongoose model.
 *
 * @typeparam T - The type of the Mongoose document.
 * @typeparam C - The type of the entity params used for creation.
 * @typeparam U - The type of the entity params used for update.
 */
export abstract class CrudService<T, C, U> {
  /**
   * Constructs the CrudService instance.
   *
   * @param model - The Mongoose model associated with the service.
   */
  constructor(protected readonly model: Readonly<Model<T>>) {}

  /**
   * Creates a new entity.
   *
   * @param createEntity - The entity to create.
   * @returns A promise that resolves to the created entity.
   */
  async create(createEntity: C): Promise<T> {
    // Mongoose's `create` typing is stricter than the generic create params
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entity = await this.model.create(createEntity as any);
    return entity as T;
  }

  /**
   * Deletes an entity by ID.
   *
   * @param id - The ID of the entity to delete.
   * @returns A promise that resolves to the deleted entity.
   * @throws NotFoundError if the entity is not found.
   */
  async delete(id: string): Promise<T> {
    const entity = await this.model.findByIdAndDelete(id);

    if (!entity) {
      throw new NotFoundError();
    }

    return entity;
  }

  /**
   * Deletes all documents with ids given in a list.
   *
   * @param documentIDs - A list of documents' IDs to delete
   * @returns A promise that resolves to a list of deleted entities.
   */
  async deleteMany(documentIDs: DeleteManyParam): Promise<T[]> {
    // Get the entities to delete
    const filter = { _id: { $in: documentIDs.documentIDs } };
    const deletedEntities = await this.model.find(filter);
    // Delete exactly those (not documents created in the meantime)
    await this.model.deleteMany({
      _id: { $in: deletedEntities.map((entity) => entity._id) },
    });
    // Return the deleted documents
    return deletedEntities;
  }

  /**
   * Updates an entity by ID.
   *
   * @param id - The ID of the entity to update.
   * @param updateParams - The parameters to update.
   * @returns A promise that resolves to the updated entity.
   * @throws NotFoundError if the entity is not found.
   */
  async update(id: string, updateParams: U): Promise<T> {
    const entity = await this.model.findByIdAndUpdate(
      id,
      updateParams as UpdateQuery<T>,
      {
        returnDocument: "after",
      },
    );

    if (!entity) {
      throw new NotFoundError();
    }

    return entity;
  }

  /**
   * Retrieves an entity by ID.
   *
   * @param id - The ID of the entity to retrieve.
   * @returns A promise that resolves to the retrieved entity.
   * @throws NotFoundError if the entity is not found.
   */
  async get(id: string): Promise<T> {
    const entity = await this.model.findById(id);

    if (!entity) {
      throw new NotFoundError();
    }

    return entity;
  }

  /**
   * Retrieves all entities.
   * @param skip Pagination, number of documents to skip (no. page)
   * @param limit Pagination, number of documents to return (page size, capped at MAX_PAGE_SIZE)
   * @param options Additional aggregation stages
   * @returns A PaginationResult object, containing results
   */
  async getAll(
    skip: number,
    limit: number,
    options: PipelineOptions = {},
  ): Promise<PaginationResult<T>> {
    return this.paginate([], skip, limit, options);
  }

  /**
   * Retrieves the list of all matching entities.
   * Every entry of the filter set becomes one `$match` stage (entries are AND-ed).
   *
   * @param filterSetParams - Object containing an array of filters to be executed.
   * @param skip Pagination, number of documents to skip (no. page)
   * @param limit Pagination, number of documents to return (page size, capped at MAX_PAGE_SIZE)
   * @param options Additional aggregation stages
   * @returns A PaginationResult object, containing results
   * @throws OperationNotSupportedError if a filter operation is not supported.
   */
  async getFiltered(
    filterSetParams: FilterSetParams,
    skip: number,
    limit: number,
    options: PipelineOptions = {},
  ): Promise<PaginationResult<T>> {
    const filterStages: PipelineStage[] = filterSetParams.filterSet.map(
      (filter: AnyFilter) =>
        "booleanOperation" in filter
          ? { $match: createConcatenationFilterQuery(filter) }
          : { $match: createBasicFilterQuery(filter) },
    );
    return this.paginate(filterStages, skip, limit, options);
  }

  /**
   * Runs `match stages -> count` and `match stages -> skip -> limit -> project stages`.
   */
  protected async paginate(
    matchStages: PipelineStage[],
    skip: number,
    limit: number,
    options: PipelineOptions,
  ): Promise<PaginationResult<T>> {
    const safeSkip = Math.max(0, Math.floor(skip));
    const safeLimit = Math.min(Math.max(1, Math.floor(limit)), MAX_PAGE_SIZE);
    const match = [...(options.match ?? []), ...matchStages];

    const [countResult] = await this.model
      .aggregate<{ count: number }>([...match, { $count: "count" }])
      .exec();
    const results = await this.model
      .aggregate([
        ...match,
        { $skip: safeSkip },
        { $limit: safeLimit },
        ...(options.project ?? []),
      ] as PipelineStage[])
      .exec();

    return {
      skip: safeSkip,
      limit: safeLimit,
      totalCount: countResult?.count ?? 0,
      results: results as T[],
    };
  }
}
