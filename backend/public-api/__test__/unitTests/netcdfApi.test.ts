import { expect, describe, it, jest, beforeEach } from "@jest/globals";
import { Readable } from "node:stream";
import axios from "axios";
import NetcdfApi, {
  CHUNK_SEPARATOR,
} from "../../src/services/netcdfApi.service";
import { FailedToParseError } from "../../src/errors";

// The Python data-science service is never called: axios is mocked.
jest.mock("axios");
const post = axios.post as jest.MockedFunction<typeof axios.post>;

const file = {
  buffer: Buffer.from("fake netcdf content"),
  mimetype: "application/x-netcdf",
  originalname: "sample.nc",
} as Express.Multer.File;

/** Simulates an axios `responseType: "stream"` response. */
const streamResponse = (...chunks: (string | Buffer)[]) =>
  ({
    data: Readable.from(chunks.map((c) => Buffer.from(c))),
  }) as never;

describe("NetcdfApi", () => {
  beforeEach(() => {
    post.mockReset();
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("uses the configured data-science base URL", () => {
    expect(NetcdfApi.netCdf_endpoint).toBe(
      "http://datascience.test:50000/api/convert-netcdf-to-json",
    );
  });

  it("getMetaData posts the file as multipart form data and parses the streamed JSON", async () => {
    post.mockResolvedValue(streamResponse('{"variables_', 'metadata": {}}'));
    await expect(NetcdfApi.getMetaData(file)).resolves.toEqual({
      variables_metadata: {},
    });
    const [url, body, options] = post.mock.calls[0];
    expect(url).toBe(
      "http://datascience.test:50000/api/convert-netcdf-to-json/metadata",
    );
    expect(body).toBeInstanceOf(FormData);
    const sent = (body as FormData).get("file") as File;
    expect(sent.name).toBe("sample.nc");
    expect(Buffer.from(await sent.arrayBuffer()).toString()).toBe(
      "fake netcdf content",
    );
    expect(options).toEqual({ responseType: "stream" });
  });

  it("getFileData decodes multi-byte characters split across chunks", async () => {
    const json = Buffer.from('{"unit":"°C"}');
    // split inside the two-byte "°" character
    const splitAt = json.indexOf(0xc2) + 1;
    post.mockResolvedValue(
      streamResponse(json.subarray(0, splitAt), json.subarray(splitAt)),
    );
    await expect(NetcdfApi.getFileData(file)).resolves.toEqual({ unit: "°C" });
    expect(post.mock.calls[0][0]).toMatch(/\/data$/);
  });

  it("wraps HTTP/parse failures in FailedToParseError", async () => {
    post.mockRejectedValue(new Error("ECONNREFUSED"));
    await expect(NetcdfApi.getMetaData(file)).rejects.toBeInstanceOf(
      FailedToParseError,
    );
    post.mockResolvedValue(streamResponse("not json"));
    await expect(NetcdfApi.getFileData(file)).rejects.toBeInstanceOf(
      FailedToParseError,
    );
  });

  it("getCERv2DataChunks yields one object per separator, across chunk boundaries", async () => {
    post.mockResolvedValue(
      streamResponse(
        `{"i":1}${CHUNK_SEPARATOR}{"i"`,
        `:2}${CHUNK_SEPARATOR}`,
        `{"i":3}`,
      ),
    );
    const results: unknown[] = [];
    for await (const chunk of NetcdfApi.getCERv2DataChunks(file, {
      filter: ["T2", "RH2"],
      stepSize: 5,
    })) {
      results.push(chunk);
    }
    expect(results).toEqual([{ i: 1 }, { i: 2 }, { i: 3 }]);
    const [url, body] = post.mock.calls[0];
    expect(url).toMatch(/\/cerv2-data-chunks$/);
    expect((body as FormData).get("filter_variables")).toBe("T2,RH2");
    expect((body as FormData).get("step_size")).toBe("5");
  });

  it("getCERv2DataChunks throws FailedToParseError on invalid chunks", async () => {
    post.mockResolvedValue(streamResponse(`{"i":1}${CHUNK_SEPARATOR}broken`));
    const consume = async () => {
      for await (const _chunk of NetcdfApi.getCERv2DataChunks(file)) {
        // consume
      }
    };
    await expect(consume()).rejects.toBeInstanceOf(FailedToParseError);
  });
});
