import { expect } from "chai";
import { describe, it } from "mocha";

// Import the worker
import worker from "./index";

// Mock the Cloudflare Worker environment
const env: any = {
  NODE_ENV: "test",
};

// Mock the execution context
const ctx: any = {
  waitUntil: (promise: Promise<any>) => promise,
  passThroughOnException: () => {},
};

describe("OpenDiscourse Worker", () => {
  it("should respond to the root endpoint", async () => {
    const request = new Request("http://localhost/");
    const response = await worker.fetch(request, env, ctx);
    expect(response.status).to.equal(200);

    const data = await response.json();
    expect(data).to.have.property("name", "OpenDiscourse API");
    expect(data).to.have.property("version");
    expect(data).to.have.property("environment", "test");
  });

  it("should return 404 for unknown routes", async () => {
    const request = new Request("http://localhost/unknown-route");
    const response = await worker.fetch(request, env, ctx);
    expect(response.status).to.equal(404);
  });

  it("should handle health check endpoint", async () => {
    const request = new Request("http://localhost/api/health");
    const response = await worker.fetch(request, env, ctx);
    expect(response.status).to.equal(200);

    const data = await response.json();
    expect(data).to.have.property("status", "ok");
    expect(data).to.have.property("timestamp");
  });
});
