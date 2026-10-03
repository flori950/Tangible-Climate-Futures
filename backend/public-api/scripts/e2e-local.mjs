#!/usr/bin/env node
/**
 * Local end-to-end scenarios against the COMPILED server (run `npm run build` first).
 *
 *   npm run test:e2e
 *   DATASCIENCE_PYTHON=/path/to/venv/bin/python npm run test:e2e   # + real Python service
 *
 * Starts real processes: a MongoDB (mongodb-memory-server binary, data directory on disk),
 * the API (`node dist/backend/public-api/src/index.js`) in several configurations and,
 * if DATASCIENCE_PYTHON points to a Python with the data-science requirements, the
 * data-science service (backend/data-science/main.py). Everything is checked over HTTP.
 * Exit code 0 = all checks passed.
 */
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

const { MongoClient } = mongoose.mongo;

const here = path.dirname(fileURLToPath(import.meta.url));
const apiDir = path.resolve(here, "..");
const dsDir = path.resolve(apiDir, "../data-science");
const entry = path.join(apiDir, "dist/backend/public-api/src/index.js");
const files = path.join(apiDir, "__test__/testFiles");
const API_PORT = 40400;
const DS_PORT = 50400;
const api = (p) => `http://127.0.0.1:${API_PORT}${p}`;

// ---------------------------------------------------------------- reporting
let passed = 0;
const failures = [];
let scenario = "";
function check(name, condition, detail = "") {
  if (condition) {
    passed++;
    console.log(`  ok   ${name}`);
  } else {
    failures.push(`[${scenario}] ${name} ${detail}`);
    console.log(`  FAIL ${name} ${detail}`);
  }
}
function section(name) {
  scenario = name;
  console.log(`\n=== ${name}`);
}

// ---------------------------------------------------------------- helpers
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function http(method, p, { json, form, headers = {} } = {}) {
  const init = { method, headers: { ...headers } };
  if (json !== undefined) {
    init.headers["content-type"] = "application/json";
    init.body = typeof json === "string" ? json : JSON.stringify(json);
  }
  if (form) init.body = form;
  const res = await fetch(api(p), init);
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body, headers: res.headers };
}

function upload(fields, fileField, filePath, fileName) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  const content =
    filePath instanceof Uint8Array ? filePath : readFileSync(filePath);
  form.append(
    fileField,
    new Blob([content]),
    fileName ?? path.basename(String(filePath)),
  );
  return form;
}

function startProcess(cmd, args, env, cwd, label) {
  const child = spawn(cmd, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.log = "";
  child.stdout.on("data", (d) => (child.log += d));
  child.stderr.on("data", (d) => (child.log += d));
  child.exited = new Promise((r) => child.on("exit", (code) => r(code)));
  child.label = label;
  return child;
}

async function waitFor(url, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return true;
    } catch {
      /* not up yet */
    }
    await sleep(250);
  }
  return false;
}

async function startApi(env) {
  const child = startProcess(
    process.execPath,
    ["--max-old-space-size=4096", entry],
    {
      NODE_ENV: "production",
      PORT: String(API_PORT),
      HOST: "127.0.0.1",
      ...env,
    },
    apiDir,
    "api",
  );
  const up = await waitFor(api("/health"), 45000);
  if (!up) {
    child.kill("SIGKILL");
    throw new Error(`API did not start. Log:\n${child.log}`);
  }
  return child;
}

async function stopApi(child) {
  child.kill("SIGTERM");
  return child.exited;
}

const nr = (title, data, location) => ({
  title,
  description: "e2e",
  dataType: "NOTREFERENCED",
  tags: ["e2e"],
  dataSet: "NONE",
  content: { data, ...(location ? { location } : {}) },
});
const point = (lon, lat) => ({ type: "Point", coordinates: [lon, lat] });
const filter = (filterSet, onlyMetadata = true, limit = 100) =>
  http(
    "POST",
    `/api/datafile/filter/limit=${limit}&skip=0&onlyMetadata=${onlyMetadata}`,
    {
      json: { filterSet },
    },
  );
const f = (key, operation, value, negate = false) => ({
  key,
  operation,
  value,
  negate,
});

// ---------------------------------------------------------------- main
const dbPath = mkdtempSync(path.join(tmpdir(), "tcf-e2e-db-"));
let mongo = await MongoMemoryServer.create({
  instance: { dbPath, storageEngine: "wiredTiger", launchTimeout: 60000 },
});
let MONGODB_URL = mongo.getUri("tcf_e2e");

/** Restarts MongoDB on the same data directory (the port may change if the old one is busy). */
async function restartMongo() {
  mongo = await MongoMemoryServer.create({
    instance: { dbPath, storageEngine: "wiredTiger", launchTimeout: 60000 },
  });
  MONGODB_URL = mongo.getUri("tcf_e2e");
}
let python;
const pythonBin = process.env.DATASCIENCE_PYTHON;
const children = [];

try {
  if (pythonBin) {
    python = startProcess(
      pythonBin,
      ["main.py"],
      {
        PORT: String(DS_PORT),
        HOST: "127.0.0.1",
        STAGE: "development",
        PYTHONDONTWRITEBYTECODE: "1",
      },
      dsDir,
      "python",
    );
    children.push(python);
    if (!(await waitFor(`http://127.0.0.1:${DS_PORT}/health`, 30000))) {
      console.log(python.log);
      throw new Error("data-science service did not start");
    }
  }
  const devEnv = () => ({
    MONGODB_URL,
    DISABLE_SWAGGER_AUTH: "true",
    PYTHON_BACKEND_HOST: "127.0.0.1",
    PYTHON_BACKEND_PORT: String(DS_PORT),
  });

  // ============================================================ 1. dev mode
  section("1 Development mode (auth disabled, defaults)");
  let server = await startApi(devEnv());
  children.push(server);
  {
    check("GET /health 200", (await http("GET", "/health")).status === 200);
    const ready = await http("GET", "/ready");
    check(
      "GET /ready 200 ready",
      ready.status === 200 && ready.body.status === "ready",
    );
    const docs = await http("GET", "/docs/");
    check(
      "Swagger UI served",
      docs.status === 200 && String(docs.body).includes("swagger"),
    );
    const cors = await fetch(api("/health"), {
      headers: { Origin: "http://localhost:4200" },
    });
    check(
      "CORS default allows any origin",
      cors.headers.get("access-control-allow-origin") === "*",
    );
    check(
      "helmet headers set",
      Boolean(cors.headers.get("x-content-type-options")),
    );
    check(
      "auth bypass warning logged",
      server.log.includes("Authentication is disabled"),
    );
  }

  section("1a Datafile CRUD and validation");
  let docId;
  {
    const created = await http("POST", "/api/datafile", {
      json: nr(
        "Berlin point",
        { temp: 21, ok: true, name: "a.b" },
        point(13.4, 52.5),
      ),
    });
    docId = created.body._id;
    check("POST datafile 200", created.status === 200 && Boolean(docId));
    const got = await http("GET", `/api/datafile/${docId}`);
    check(
      "GET datafile 200",
      got.status === 200 && got.body.content.data.temp === 21,
    );
    const put = await http("PUT", `/api/datafile/${docId}`, {
      json: {
        ...nr(
          "Berlin renamed",
          { temp: 22, ok: true, name: "a.b" },
          point(13.4, 52.5),
        ),
      },
    });
    check(
      "PUT datafile 200",
      put.status === 200 && put.body.title === "Berlin renamed",
    );
    check(
      "GET malformed id 422",
      (await http("GET", "/api/datafile/123")).status === 422,
    );
    check(
      "GET unknown id 404",
      (await http("GET", "/api/datafile/646365496740ded7a396f5d0")).status ===
        404,
    );
    check(
      "POST malformed JSON 400",
      (await http("POST", "/api/datafile", { json: '{"title": ' })).status ===
        400,
    );
    check(
      "POST unknown property 422",
      (
        await http("POST", "/api/datafile", {
          json: { ...nr("x", {}), hacker: 1 },
        })
      ).status === 422,
    );
    check(
      "POST missing required field 422",
      (await http("POST", "/api/datafile", { json: { title: "x" } })).status ===
        422,
    );
    const badGeo = await http("POST", "/api/datafile", {
      json: nr("bad", {}, point(500, 500)),
    });
    check(
      "POST invalid coordinates 400",
      badGeo.status === 400,
      `got ${badGeo.status}`,
    );
    const page = await http(
      "GET",
      "/api/datafile/limit=5000&skip=-3&onlyMetadata=true",
    );
    check(
      "pagination capped (limit 1000, skip 0)",
      page.status === 200 && page.body.limit === 1000 && page.body.skip === 0,
    );
    check(
      "onlyMetadata strips content.data",
      page.body.results.every((r) => !("data" in r.content)),
    );
  }

  section("1b Dataset uploads and attach");
  let csvUpload;
  {
    const csv =
      "name,lon,lat\nAlex,13.41,52.52\nPotsdam,13.06,52.40\nNoCoords,,\n";
    csvUpload = await http("POST", "/api/datafile/fromFile", {
      form: upload(
        { dataset: "CSV", tags: "e2e, csv" },
        "file",
        new TextEncoder().encode(csv),
        "points.csv",
      ),
    });
    check(
      "CSV dataset 200, 3 datafiles",
      csvUpload.status === 200 && csvUpload.body.length === 3,
    );
    check(
      "CSV dataSet=CSV, numeric location, none for empty coords",
      csvUpload.body[0]?.dataSet === "CSV" &&
        csvUpload.body[0]?.content.location.coordinates[0] === 13.41 &&
        csvUpload.body[2]?.content.location === undefined,
    );
    check(
      "CSV descriptions numbered",
      csvUpload.body[1]?.description.includes("no.1"),
    );
    const simra = await http("POST", "/api/datafile/fromFile", {
      form: upload({ dataset: "SIMRA" }, "file", path.join(files, "simra")),
    });
    check(
      "SimRa dataset 200, 3 datafiles",
      simra.status === 200 && simra.body.length === 3,
    );
    const bad = await http("POST", "/api/datafile/fromFile", {
      form: upload({ dataset: "FOO" }, "file", path.join(files, "test.csv")),
    });
    check(
      "unknown dataset rejected (4xx)",
      bad.status >= 400 && bad.status < 500,
      `got ${bad.status}`,
    );
    const broken = await http("POST", "/api/datafile/fromFile", {
      form: upload(
        { dataset: "CSV" },
        "file",
        new TextEncoder().encode('a,b\n"open,1\n'),
        "bad.csv",
      ),
    });
    check(
      "malformed CSV 400 (no hang)",
      broken.status === 400,
      `got ${broken.status}`,
    );

    const target = await http("POST", "/api/datafile", {
      json: nr("attach target", {}),
    });
    const tid = target.body._id;
    for (const [type, file] of [
      ["JSON", "test.json"],
      ["CSV", "test.csv"],
      ["TXT", "simra"],
    ]) {
      const res = await http("POST", `/api/datafile/${tid}/attach`, {
        form: upload({ fileType: type }, "file", path.join(files, file)),
      });
      check(
        `attach ${type} 200`,
        res.status === 200 && Boolean(res.body.content?.data?.dataObject),
      );
    }
    const badJson = await http("POST", `/api/datafile/${tid}/attach`, {
      form: upload(
        { fileType: "JSON" },
        "file",
        new TextEncoder().encode("{nope"),
        "x.json",
      ),
    });
    check("attach invalid JSON 400", badJson.status === 400);
    const ref = await http("POST", "/api/datafile", {
      json: {
        title: "ref",
        dataType: "REFERENCED",
        tags: [],
        dataSet: "NONE",
        content: {
          url: "https://example.org/x.png",
          mediaType: "PHOTO",
          location: point(0, 0),
        },
      },
    });
    const refAttach = await http(
      "POST",
      `/api/datafile/${ref.body._id}/attach`,
      {
        form: upload(
          { fileType: "JSON" },
          "file",
          path.join(files, "test.json"),
        ),
      },
    );
    check("attach to REFERENCED 400", refAttach.status === 400);
  }

  section("1c Filters");
  {
    const contains = await filter([f("content.data.name", "CONTAINS", "a.b")]);
    check(
      "CONTAINS literal 'a.b' finds the doc",
      contains.body.totalCount >= 1,
    );
    const dot = await filter([f("content.data.name", "CONTAINS", "a.c")]);
    check(
      "CONTAINS 'a.c' does not match 'a.b' (no regex)",
      dot.body.totalCount === 0,
    );
    const regexChars = await filter([f("title", "CONTAINS", "(((")]);
    check("CONTAINS with regex characters 200", regexChars.status === 200);
    const tooLong = await filter([f("title", "CONTAINS", "x".repeat(201))]);
    check("CONTAINS > 200 chars 400", tooLong.status === 400);
    check(
      "MATCHES title",
      (await filter([f("title", "MATCHES", "Berlin renamed")])).body
        .totalCount === 1,
    );
    check(
      "number GT",
      (await filter([f("content.data.temp", "GT", 21)])).body.totalCount === 1,
    );
    check(
      "boolean IS",
      (await filter([f("content.data.ok", "IS", true)])).body.totalCount === 1,
    );
    const radius = await filter([
      f("content.location", "RADIUS", { center: [13.4, 52.5], radius: 5 }),
    ]);
    check(
      "RADIUS 5 km around Berlin",
      radius.status === 200 && radius.body.totalCount >= 2,
    );
    const area = await filter([
      f("content.location", "AREA", {
        vertices: [
          [13.0, 52.3],
          [13.8, 52.3],
          [13.8, 52.7],
          [13.0, 52.7],
          [13.0, 52.3],
        ],
      }),
    ]);
    check(
      "AREA polygon Berlin/Potsdam",
      area.status === 200 && area.body.totalCount >= 3,
    );
    const or = await filter([
      {
        booleanOperation: "OR",
        filters: [
          f("title", "MATCHES", "Berlin renamed"),
          f("title", "MATCHES", "points.csv_0"),
        ],
      },
    ]);
    check("OR concatenation", or.body.totalCount === 2);
    check(
      "_id filter",
      (await filter([f("_id", "MATCHES", docId)])).body.totalCount === 1,
    );
    check(
      "invalid _id filter 400",
      (await filter([f("_id", "MATCHES", "nope")])).status === 400,
    );
    check(
      "unknown operation 422/400",
      [400, 422].includes((await filter([f("title", "FOO", "x")])).status),
    );
  }

  section("1d Nested values");
  {
    const get = await http(
      "GET",
      `/api/datafile/nestedValue/${docId}/content.data.temp`,
    );
    check("GET nested value", get.status === 200 && get.body === 22);
    const falsy = await http("PUT", "/api/datafile/nestedValue/put", {
      json: { IDs: docId, path: "content.data.zero", value: 0 },
    });
    check("PUT nested value", falsy.status === 200);
    check(
      "GET falsy nested value 0 (not 404)",
      (
        await http(
          "GET",
          `/api/datafile/nestedValue/${docId}/content.data.zero`,
        )
      ).body === 0,
    );
    check(
      "PUT forbidden path dataType 400",
      (
        await http("PUT", "/api/datafile/nestedValue/put", {
          json: { IDs: docId, path: "dataType", value: "REFERENCED" },
        })
      ).status === 400,
    );
    const missing = await http("PUT", "/api/datafile/nestedValue/put", {
      json: {
        IDs: `${docId},646365496740ded7a396f5d0`,
        path: "content.data.partial",
        value: 1,
      },
    });
    check("one unknown ID 404", missing.status === 404);
    check(
      "…and nothing was changed",
      (
        await http(
          "GET",
          `/api/datafile/nestedValue/${docId}/content.data.partial`,
        )
      ).status === 404,
    );
    const del = await http("DELETE", "/api/datafile/nestedValue/delete", {
      json: { IDs: docId, path: "content.data.zero" },
    });
    check(
      "DELETE nested value",
      del.status === 200 && !("zero" in del.body[0].content.data),
    );
  }

  section("1e Journeys (frontend flow)");
  let journeyId;
  {
    const created = await http("POST", "/api/journey", {
      json: {
        title: "E2E journey",
        description: "local",
        tags: ["e2e"],
        author: "florian@example.org",
        visibility: "PRIVATE",
        collections: [
          { title: "Berlin", filterSet: [f("tags", "CONTAINS", "e2e")] },
        ],
        excludedIDs: [],
      },
    });
    journeyId = created.body._id;
    check(
      "POST journey 200",
      created.status === 200 && !("ownerUID" in created.body),
    );
    // exactly what frontend/src/app/shared/service/api.service.ts updateJourney() does
    const loaded = (await http("GET", `/api/journey/${journeyId}`)).body;
    const j = JSON.parse(JSON.stringify(loaded));
    delete j._id;
    delete j.createdAt;
    delete j.updatedAt;
    delete j.__v;
    const updated = await http("PUT", `/api/journey/${journeyId}`, {
      json: { ...j, title: "E2E journey v2" },
    });
    check(
      "frontend round trip GET → PUT 200",
      updated.status === 200,
      `got ${updated.status} ${JSON.stringify(updated.body)}`,
    );
    const list = await http("GET", "/api/journey/limit=10&skip=0");
    check("list journeys", list.status === 200 && list.body.totalCount === 1);
    const filtered = await http("POST", "/api/journey/filter/limit=10&skip=0", {
      json: { filterSet: [f("title", "CONTAINS", "v2")] },
    });
    check("filter journeys", filtered.body.totalCount === 1);
  }

  section("1f NetCDF via data-science service");
  if (!pythonBin) {
    console.log(
      "  skip (set DATASCIENCE_PYTHON to run against the real Python service)",
    );
  } else {
    const target = await http("POST", "/api/datafile", {
      json: nr("netcdf target", {}),
    });
    const tid = target.body._id;
    const attached = await http("POST", `/api/datafile/${tid}/attach`, {
      form: upload(
        { fileType: "NETCDF" },
        "file",
        path.join(files, "sample.nc"),
      ),
    });
    const dataObject = attached.body?.content?.data?.dataObject ?? {};
    check(
      "attach NETCDF 200",
      attached.status === 200,
      `got ${attached.status} ${JSON.stringify(attached.body).slice(0, 200)}`,
    );
    check(
      "metadata from Python service",
      Boolean(dataObject.netCdfInfo?.variables_metadata?.temperature),
    );
    check(
      "data from GridFS in response",
      JSON.stringify(dataObject.data ?? {}).includes("1.5"),
    );
    check(
      "unit with umlaut-like char intact (°C)",
      JSON.stringify(dataObject).includes("°C"),
    );
    const reread = await http("GET", `/api/datafile/${tid}`);
    check(
      "GET resolves GridFS data again",
      Boolean(reread.body.content.data.dataObject.data) &&
        !reread.body.content.data.dataObject.dataId,
    );
    const mongoClient = await MongoClient.connect(MONGODB_URL);
    const gridFiles = () =>
      mongoClient
        .db()
        .collection("netcdf.files")
        .countDocuments({ filename: `${tid}.netcdf.json` });
    check("GridFS file stored", (await gridFiles()) === 1);
    await http("DELETE", `/api/datafile/${tid}`);
    check("GridFS file removed with the datafile", (await gridFiles()) === 0);

    const cerv2 = await http("POST", "/api/datafile/fromFile", {
      form: upload(
        { dataset: "CERV2", steps: "1", tags: "e2e" },
        "file",
        path.join(files, "cerv2_sample.nc"),
      ),
    });
    check(
      "CERv2 upload 200",
      cerv2.status === 200,
      `got ${cerv2.status} ${JSON.stringify(cerv2.body).slice(0, 200)}`,
    );
    check(
      "CERv2 returns 20 datafiles (4x5 grid)",
      Array.isArray(cerv2.body) && cerv2.body.length === 20,
      `got ${cerv2.body?.length}`,
    );
    check(
      "CERv2 response without content.data",
      cerv2.body?.every?.((d) => !("data" in d.content)),
    );
    check(
      "CERv2 tags without empty entries",
      cerv2.body?.[0]?.tags?.every((t) => t !== ""),
    );
    const uploadID = cerv2.body?.[0]?.uploadID;
    const stored = await filter([f("uploadID", "MATCHES", uploadID)], false);
    const sample = stored.body.results?.[0];
    check(
      "CERv2 datapoints stored with T2 time series",
      stored.body.totalCount === 20 && Boolean(sample?.content?.data?.timeVars),
    );
    const nearAlex = await filter([
      f("uploadID", "MATCHES", uploadID),
      f("content.location", "RADIUS", { center: [13.4, 52.53], radius: 8 }),
    ]);
    check(
      "CERv2 points found by RADIUS filter",
      nearAlex.body.totalCount > 0 && nearAlex.body.totalCount < 20,
    );
    await mongoClient.close();

    // Python service down
    python.kill("SIGTERM");
    await python.exited;
    const down = await http(
      "POST",
      `/api/datafile/${(await http("POST", "/api/datafile", { json: nr("t", {}) })).body._id}/attach`,
      {
        form: upload(
          { fileType: "NETCDF" },
          "file",
          path.join(files, "sample.nc"),
        ),
      },
    );
    check(
      "Python service down → 400 FailedToParse (no crash)",
      down.status === 400,
    );
    check("API still healthy", (await http("GET", "/health")).status === 200);
  }

  section("1g Restart with the same database (persistence)");
  {
    const before = (
      await http("GET", "/api/datafile/limit=1&skip=0&onlyMetadata=true")
    ).body.totalCount;
    const code = await stopApi(server);
    check("SIGTERM → exit code 0", code === 0, `got ${code}`);
    check(
      "graceful shutdown logged",
      server.log.includes("Disconnected from the database"),
    );
    await mongo.stop({ doCleanup: false });
    await restartMongo();
    server = await startApi(devEnv());
    children.push(server);
    const after = (
      await http("GET", "/api/datafile/limit=1&skip=0&onlyMetadata=true")
    ).body.totalCount;
    check(
      `data survives API + MongoDB restart (${before} datafiles)`,
      before > 0 && before === after,
      `${before} vs ${after}`,
    );
    check(
      "journey still there",
      (await http("GET", `/api/journey/${journeyId}`)).status === 200,
    );
  }

  section("1h MongoDB goes away while running");
  {
    await mongo.stop({ doCleanup: false });
    await sleep(1500);
    const ready = await http("GET", "/ready");
    check(
      "/ready 503 without database",
      ready.status === 503,
      `got ${ready.status}`,
    );
    check(
      "/health still 200 (liveness)",
      (await http("GET", "/health")).status === 200,
    );
    const started = Date.now();
    const code = await stopApi(server);
    check(
      "SIGTERM without database still terminates (< 15 s)",
      code !== null && Date.now() - started < 15000,
      `code ${code}, ${Date.now() - started} ms`,
    );
    await restartMongo();
  }

  // ============================================================ 2. limits
  section("2 Production-like limits (CORS list, 1 MB uploads, 1 kB bodies)");
  server = await startApi({
    ...devEnv(),
    CORS_ORIGINS: "http://localhost:4200",
    MAX_UPLOAD_SIZE_MB: "1",
    JSON_BODY_LIMIT: "1kb",
  });
  children.push(server);
  {
    const ok = await fetch(api("/health"), {
      headers: { Origin: "http://localhost:4200" },
    });
    check(
      "CORS allowed origin echoed",
      ok.headers.get("access-control-allow-origin") === "http://localhost:4200",
    );
    const no = await fetch(api("/health"), {
      headers: { Origin: "https://evil.example" },
    });
    check(
      "CORS other origin not allowed",
      no.headers.get("access-control-allow-origin") === null,
    );
    const big = await http("POST", "/api/datafile/fromFile", {
      form: upload(
        { dataset: "CSV" },
        "file",
        new Uint8Array(2 * 1024 * 1024).fill(97),
        "big.csv",
      ),
    });
    check("2 MB upload → 413", big.status === 413, `got ${big.status}`);
    const small = await http("POST", "/api/datafile/fromFile", {
      form: upload({ dataset: "CSV" }, "file", path.join(files, "test.csv")),
    });
    check("small upload still 200", small.status === 200);
    const body = await http("POST", "/api/datafile", {
      json: nr("x".repeat(3000), {}),
    });
    check("3 kB JSON body → 413", body.status === 413, `got ${body.status}`);
  }
  await stopApi(server);

  // ============================================================ 3. auth on
  section("3 Authentication enabled (DISABLE_SWAGGER_AUTH unset)");
  server = await startApi({ ...devEnv(), DISABLE_SWAGGER_AUTH: "" });
  children.push(server);
  {
    check(
      "no bypass warning logged",
      !server.log.includes("Authentication is disabled"),
    );
    const noToken = await http("GET", "/api/journey/limit=1&skip=0");
    check("no token → 401", noToken.status === 401);
    const garbage = await http(
      "GET",
      "/api/datafile/limit=1&skip=0&onlyMetadata=true",
      {
        headers: { Authorization: "Bearer not-a-real-token" },
      },
    );
    check(
      "invalid token → 401 (not 500)",
      garbage.status === 401,
      `got ${garbage.status}`,
    );
    const basic = await http("POST", "/api/journey", {
      headers: { Authorization: "Basic abc" },
      json: {},
    });
    check("wrong auth scheme → 401", basic.status === 401);
    check("/health public", (await http("GET", "/health")).status === 200);
    check("/docs public", (await http("GET", "/docs/")).status === 200);
    check(
      "server still alive after auth failures",
      (await http("GET", "/ready")).status === 200,
    );
  }
  await stopApi(server);

  // ============================================================ 4. bad DB
  section("4 Unreachable MongoDB at startup");
  {
    const child = startProcess(
      process.execPath,
      [entry],
      {
        NODE_ENV: "production",
        PORT: String(API_PORT + 1),
        MONGODB_URL: "mongodb://127.0.0.1:1/x?serverSelectionTimeoutMS=2000",
      },
      apiDir,
      "api-bad-db",
    );
    const code = await child.exited;
    check("process exits with code 1", code === 1, `got ${code}`);
    check(
      "connection error logged",
      child.log.includes("Cannot connect to the database"),
    );
  }
} catch (error) {
  failures.push(`[${scenario}] crashed: ${error?.stack ?? error}`);
  console.error(error);
} finally {
  for (const child of children)
    if (child.exitCode === null) child.kill("SIGKILL");
  await mongo.stop({ doCleanup: true }).catch(() => undefined);
  rmSync(dbPath, { recursive: true, force: true });
}

console.log(
  `\n${passed} checks passed, ${failures.length} failed (Node ${process.version})`,
);
for (const failure of failures) console.log(`  - ${failure}`);
process.exit(failures.length === 0 ? 0 : 1);
