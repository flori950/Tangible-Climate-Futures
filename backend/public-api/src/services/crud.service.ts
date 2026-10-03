import { Model, UpdateQuery } from "mongoose";
import { NotFoundError } from "../errors";
import { DeleteManyParam, PaginationResult } from "../../../../common/types";

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
  constructor(protected readonly model: Readonly<Model<T>>) {
    this.model = model;
  }

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
    // Delete them
    await this.model.deleteMany(filter);
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
   * @param limit Pagination, number of documents to return (page size)
   * @returns A PaginationResult object, containing results
   */
  async getAll(skip: number, limit: number): Promise<PaginationResult<T>> {
    const results = await this.model
      .aggregate([{ $match: {} }, { $skip: skip }, { $limit: limit }])
      .exec();
    const totalCount = await this.model.countDocuments({}).exec();
    return {
      skip: skip,
      limit: limit,
      totalCount: totalCount,
      results: results,
    };
  }
}
