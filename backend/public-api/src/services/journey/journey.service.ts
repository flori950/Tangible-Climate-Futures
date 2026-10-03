import { PipelineStage, Types } from "mongoose";
import {
  DeleteManyParam,
  FilterSetParams,
  Journey,
  JourneyCreateParams,
  JourneyUpdateParams,
  PaginationResult,
  Visibility,
} from "../../../../../common/types";
import JourneyModel from "../../models/journey.model";
import { CrudService, PipelineOptions } from "../crud.service";
import { ForbiddenError, NotFoundError } from "../../errors";

/** Stage that removes the internal owner field from aggregation results. */
const HIDE_OWNER: PipelineStage = { $unset: "ownerUID" };

/**
 * JourneyService
 *
 * Service class for managing Journey entities.
 *
 * Ownership: journeys created by an authenticated user store the user's Firebase UID in
 * the hidden field `ownerUID`. When a `userId` is given (authentication enabled):
 * - PRIVATE journeys of other users are invisible (404 / filtered out),
 * - journeys of other users cannot be updated or deleted (403).
 * Journeys without `ownerUID` (created before this rule or with auth disabled) stay open to everyone.
 * Without a `userId` (DISABLE_SWAGGER_AUTH=true) no ownership rules apply.
 */
export default class JourneyService extends CrudService<
  Journey,
  JourneyCreateParams,
  JourneyUpdateParams
> {
  constructor(private readonly userId?: string) {
    super(JourneyModel);
  }

  /** Aggregation options restricting results to journeys visible to the user. */
  private visibilityOptions(): PipelineOptions {
    const match: PipelineStage[] = this.userId
      ? [
          {
            $match: {
              $or: [
                { visibility: Visibility.PUBLIC },
                { ownerUID: this.userId },
                { ownerUID: { $exists: false } },
              ],
            },
          },
        ]
      : [];
    return { match, project: [HIDE_OWNER] };
  }

  /** Whether the user may see the journey with the given owner/visibility. */
  private canRead(ownerUID: string | undefined, visibility: string): boolean {
    return (
      !this.userId ||
      !ownerUID ||
      ownerUID === this.userId ||
      visibility === Visibility.PUBLIC
    );
  }

  /** Whether the user may change/delete the journey with the given owner. */
  private canWrite(ownerUID: string | undefined): boolean {
    return !this.userId || !ownerUID || ownerUID === this.userId;
  }

  /**
   * Loads owner and visibility of a journey (ownerUID is not selected by default).
   * @throws NotFoundError if the journey does not exist or is not visible to the user.
   */
  private async loadAccessInfo(
    id: string,
  ): Promise<{ ownerUID?: string; visibility: string }> {
    const info = await this.model
      .findById(id)
      .select("+ownerUID visibility")
      .lean<{ ownerUID?: string; visibility: string }>();
    if (!info || !this.canRead(info.ownerUID, info.visibility)) {
      throw new NotFoundError();
    }
    return info;
  }

  override async create(createEntity: JourneyCreateParams): Promise<Journey> {
    const created = await this.model.create({
      ...createEntity,
      ...(this.userId ? { ownerUID: this.userId } : {}),
    });
    // Never expose the owner (the frontend sends journeys back unchanged on update)
    const { ownerUID: _ownerUID, ...journey } =
      created.toObject() as Journey & {
        ownerUID?: string;
      };
    return journey as Journey;
  }

  override async get(id: string): Promise<Journey> {
    await this.loadAccessInfo(id);
    return super.get(id);
  }

  override async update(
    id: string,
    updateParams: JourneyUpdateParams,
  ): Promise<Journey> {
    const { ownerUID } = await this.loadAccessInfo(id);
    if (!this.canWrite(ownerUID)) {
      throw new ForbiddenError("Only the author can change this journey.");
    }
    return super.update(id, updateParams);
  }

  override async delete(id: string): Promise<Journey> {
    const { ownerUID } = await this.loadAccessInfo(id);
    if (!this.canWrite(ownerUID)) {
      throw new ForbiddenError("Only the author can delete this journey.");
    }
    return super.delete(id);
  }

  override async deleteMany(documentIDs: DeleteManyParam): Promise<Journey[]> {
    if (this.userId) {
      const ids = documentIDs.documentIDs.filter((id) =>
        Types.ObjectId.isValid(id),
      );
      const foreign = await this.model.exists({
        _id: { $in: ids },
        ownerUID: { $exists: true, $ne: this.userId },
      });
      if (foreign) {
        throw new ForbiddenError("Only the author can delete these journeys.");
      }
    }
    return super.deleteMany(documentIDs);
  }

  override async getAll(
    skip: number,
    limit: number,
  ): Promise<PaginationResult<Journey>> {
    return super.getAll(skip, limit, this.visibilityOptions());
  }

  override async getFiltered(
    filterSetParams: FilterSetParams,
    skip: number,
    limit: number,
  ): Promise<PaginationResult<Journey>> {
    return super.getFiltered(
      filterSetParams,
      skip,
      limit,
      this.visibilityOptions(),
    );
  }
}
