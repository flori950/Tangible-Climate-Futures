import { expect, describe, it, jest, beforeEach } from "@jest/globals";
import type { Request, Response, NextFunction } from "express";
import { ValidateError } from "tsoa";
import mongoose from "mongoose";
import errorMiddleware from "../../src/middlewares/error.middleware";
import multer from "multer";
import createHttpError from "http-errors";
import {
  ForbiddenError,
  PayloadTooLargeError,
  FailedToParseError,
  NotFoundError,
  OperationNotSupportedError,
  UnauthorizedError,
  WrongObjectTypeError,
} from "../../src/errors";

function createResponse(headersSent = false) {
  const res = {
    headersSent,
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
  };
  return res;
}

const req = { path: "/api/test" } as Request;

describe("errorMiddleware", () => {
  let next: jest.Mock<(err?: unknown) => void> & NextFunction;

  beforeEach(() => {
    next = jest.fn<(err?: unknown) => void>() as typeof next;
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  it.each([
    [new NotFoundError("gone"), 404, "gone"],
    [new NotFoundError(), 404, "Not Found"],
    [new OperationNotSupportedError("nope"), 400, "nope"],
    [new OperationNotSupportedError(), 400, "Operation not supported."],
    [new WrongObjectTypeError(), 400, "Wrong type of object selected."],
    [new FailedToParseError(), 400, "Failed to parse provided file."],
    [
      new UnauthorizedError("secret detail"),
      401,
      "Access denied. Please provide valid credentials.",
    ],
    [new SyntaxError("bad json"), 400, "bad json"],
    [new ForbiddenError("not yours"), 403, "not yours"],
    [new PayloadTooLargeError(), 413, "Payload too large."],
    [new multer.MulterError("LIMIT_FILE_SIZE"), 413, "File too large"],
    [
      new multer.MulterError("LIMIT_UNEXPECTED_FILE"),
      400,
      "Unexpected file field",
    ],
    [
      createHttpError(413, "request entity too large"),
      413,
      "request entity too large",
    ],
    [createHttpError(500, "internal"), 500, "internal"],
    [
      new mongoose.mongo.MongoServerError({ code: 16755, errmsg: "geo" }),
      400,
      "Invalid location: expected GeoJSON Point with [longitude, latitude].",
    ],
    [new Error("boom"), 500, "boom"],
    [new Error(), 500, "Internal Server Error"],
  ])("maps %p to HTTP %d", (error, status, message) => {
    const res = createResponse();
    errorMiddleware(error, req, res as unknown as Response, next);
    expect(res.statusCode).toBe(status);
    expect((res.body as { message: string }).message).toBe(message);
    expect(next).not.toHaveBeenCalled();
  });

  it("maps tsoa ValidateError to 422 with field details", () => {
    const res = createResponse();
    const fields = { "body.title": { message: "required" } };
    errorMiddleware(
      new ValidateError(fields, "Validation failed"),
      req,
      res as unknown as Response,
      next,
    );
    expect(res.statusCode).toBe(422);
    expect(res.body).toEqual({ message: "Validation failed", details: fields });
  });

  it("maps mongoose errors to 500", () => {
    const res = createResponse();
    errorMiddleware(
      new mongoose.Error("db failed"),
      req,
      res as unknown as Response,
      next,
    );
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ message: "db failed", details: "db failed" });
  });

  it("answers non-Error throwables with 500 instead of falling through", () => {
    const res = createResponse();
    errorMiddleware({ some: "object" }, req, res as unknown as Response, next);
    expect(res.statusCode).toBe(500);
    expect(next).not.toHaveBeenCalled();
  });

  it("delegates to Express when headers were already sent", () => {
    const res = createResponse(true);
    const error = new NotFoundError();
    errorMiddleware(error, req, res as unknown as Response, next);
    expect(next).toHaveBeenCalledWith(error);
    expect(res.statusCode).toBe(0);
  });
});
