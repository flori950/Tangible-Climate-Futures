import {
  Body,
  Controller,
  Delete,
  Get,
  Path,
  Post,
  Put,
  Route,
  Response,
  SuccessResponse,
  Tags,
  Security,
  Request,
} from "tsoa";
import type { Request as ExRequest } from "express";

import type {
  FilterSetParams,
  MongooseObjectId,
  Journey,
  JourneyCreateParams,
  JourneyUpdateParams,
  PaginationResult,
  DeleteManyParam,
} from "../../../../common/types";
import {
  ForbiddenError,
  NotFoundError,
  OperationNotSupportedError,
} from "../errors";
import { getRequestUserId } from "../authentication";
import JourneyService from "../services/journey/journey.service";

/**
 * JourneyController
 *
 * Controller class for handling Journey related endpoints.
 */
@Route("journey")
@Tags("Journey")
@Security("firebase")
export class JourneyController extends Controller {
  /** Creates the service for the authenticated user of this request. */
  private service(request: ExRequest): JourneyService {
    return new JourneyService(getRequestUserId(request));
  }

  /**
   * Retrieves the list of existing Journeys.
   * @param skip Pagination, number of documents to skip (no. of page)
   * @param limit Pagination, number of documents to return (page size)
   * @returns A promise that resolves to an array of Journeys objects.
   */
  @Get("limit={limit}&skip={skip}")
  @SuccessResponse(200, "Sent all journeys.")
  public async getAllJourneys(
    @Request() request: ExRequest,
    @Path() skip: number,
    @Path() limit: number,
  ): Promise<PaginationResult<Journey>> {
    this.setStatus(200);
    return this.service(request).getAll(skip, limit);
  }

  /**
   * Retrieves the details of an existing Journey document.
   *
   * @param journeyId - The unique identifier of the Journey document.
   * @returns A promise that resolves to the Journey object.
   * @throws NotFoundError if the document is not found.
   */
  @Get("{journeyId}")
  @Response<NotFoundError>(404, "Not found")
  @SuccessResponse(200, "Journey found.")
  public async getJourney(
    @Request() request: ExRequest,
    @Path() journeyId: MongooseObjectId,
  ): Promise<Journey> {
    this.setStatus(200);
    return this.service(request).get(journeyId);
  }

  /**
   * Creates a Journey document.
   *
   * @param body - The data for creating the document.
   * @returns A promise that resolves to the created entity.
   */
  @SuccessResponse(200, "Created successfully.")
  @Post()
  public async createJourney(
    @Request() request: ExRequest,
    @Body() body: JourneyCreateParams,
  ): Promise<Journey> {
    this.setStatus(200);
    return this.service(request).create(body);
  }

  /**
   * Deletes a Journey document.
   *
   * @param journeyId - The unique identifier of the document to delete.
   * @returns A promise that resolves to the deleted entity.
   * @throws NotFoundError if the document is not found.
   */
  @Delete("{journeyId}")
  @Response<NotFoundError>(404, "Not found")
  @Response<ForbiddenError>(403, "Journey belongs to another user")
  @SuccessResponse(200, "Deleted successfully.")
  public async deleteJourney(
    @Request() request: ExRequest,
    @Path() journeyId: MongooseObjectId,
  ): Promise<Journey> {
    this.setStatus(200);
    return this.service(request).delete(journeyId);
  }

  /**
   * Deletes all Journeys with ids given in a list.
   *
   * @param body - A list of journeys' IDs to delete
   * @returns A promise that resolves to a list of deleted entities.
   */
  @Post("deleteMany")
  @SuccessResponse(200, "Deleted successfully.")
  @Response<ForbiddenError>(403, "A journey belongs to another user")
  public async deleteManyDatafiles(
    @Request() request: ExRequest,
    @Body() body: DeleteManyParam,
  ): Promise<Journey[]> {
    this.setStatus(200);
    return this.service(request).deleteMany(body);
  }

  /**
   * Updates a document.
   *
   * @param journeyId - The unique identifier of the document to update.
   * @param body - The data for updating the document.
   * @returns A promise that resolves to the updated entity.
   * @throws NotFoundError if the document is not found.
   */
  @Put("{journeyId}")
  @Response<NotFoundError>(404, "Not found")
  @Response<ForbiddenError>(403, "Journey belongs to another user")
  @SuccessResponse(200, "Updated successfully.")
  public async updateJourney(
    @Request() request: ExRequest,
    @Path() journeyId: MongooseObjectId,
    @Body() body: JourneyUpdateParams,
  ): Promise<Journey> {
    this.setStatus(200);
    return this.service(request).update(journeyId, body);
  }

  /**
   * Retrieves a list of all matching documents based on the provided filters.
   *
   * @param body - A json object, containing an array of filters to use.
   * @param skip Pagination, number of documents to skip (no. of page)
   * @param limit Pagination, number of documents to return (page size)
   * @returns A promise that resolves to an array of all matching documents.
   * @throws OperationNotFoundError if the specified operation is not supported.
   */
  @Post("/filter/limit={limit}&skip={skip}")
  @SuccessResponse(200, "Sent all matching files.")
  @Response<OperationNotSupportedError>(400, "Operation not supported.")
  public async filterJourneys(
    @Request() request: ExRequest,
    @Path() skip: number,
    @Path() limit: number,
    @Body() body: FilterSetParams,
  ): Promise<PaginationResult<Journey>> {
    this.setStatus(200);
    return this.service(request).getFiltered(body, skip, limit);
  }
}
