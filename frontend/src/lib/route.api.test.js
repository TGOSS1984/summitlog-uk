/**
 * Tests for route log API functions in src/lib/api.js
 *
 * Covers: createRouteLog, getRouteLog, updateRouteLog, deleteRouteLog, searchMountains
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createRouteLog,
  getRouteLog,
  updateRouteLog,
  deleteRouteLog,
  searchMountains,
  getMountains,
} from "../lib/api";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockFetchSequence(...responses) {
  let call = 0;
  return vi.fn().mockImplementation(() => {
    const res = responses[call] ?? responses[responses.length - 1];
    call++;
    return Promise.resolve(res);
  });
}

function csrfResponse() {
  return { ok: true, status: 200, json: vi.fn().mockResolvedValue({ csrfToken: "test-csrf-token" }) };
}

function successResponse(data) {
  return { ok: true, status: 200, json: vi.fn().mockResolvedValue(data) };
}

function errorResponse(data, status = 400) {
  return { ok: false, status, json: vi.fn().mockResolvedValue(data) };
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(successResponse({})));
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// createRouteLog
// ---------------------------------------------------------------------------

describe("createRouteLog", () => {
  const validPayload = {
    name: "Fairfield Horseshoe",
    completed_date: "2024-08-01",
    mountain_ids: [1, 2, 3],
    primary_mountain_id: 1,
    hike_distance_km: 15.2,
    hike_duration_hours: 7.5,
    steps: 28000,
  };

  it("fetches CSRF token then POSTs to /api/progress/routes/", async () => {
    vi.stubGlobal("fetch", mockFetchSequence(
      csrfResponse(),
      successResponse({ id: 1, name: "Fairfield Horseshoe", mountains_count: 3 }),
    ));
    await createRouteLog(validPayload);
    expect(fetch).toHaveBeenCalledTimes(2);
    const [, postCall] = fetch.mock.calls;
    expect(postCall[0]).toContain("/progress/routes/");
    expect(postCall[1].method).toBe("POST");
  });

  it("sends X-CSRFToken header", async () => {
    vi.stubGlobal("fetch", mockFetchSequence(
      csrfResponse(),
      successResponse({ id: 1 }),
    ));
    await createRouteLog(validPayload);
    const [, postCall] = fetch.mock.calls;
    expect(postCall[1].headers["X-CSRFToken"]).toBe("test-csrf-token");
  });

  it("sends payload as JSON body", async () => {
    vi.stubGlobal("fetch", mockFetchSequence(
      csrfResponse(),
      successResponse({ id: 1 }),
    ));
    await createRouteLog(validPayload);
    const [, postCall] = fetch.mock.calls;
    const body = JSON.parse(postCall[1].body);
    expect(body.name).toBe("Fairfield Horseshoe");
    expect(body.mountain_ids).toEqual([1, 2, 3]);
    expect(body.primary_mountain_id).toBe(1);
  });

  it("returns created route data", async () => {
    const created = { id: 5, name: "Fairfield Horseshoe", mountains_count: 3 };
    vi.stubGlobal("fetch", mockFetchSequence(csrfResponse(), successResponse(created)));
    const result = await createRouteLog(validPayload);
    expect(result).toEqual(created);
  });

  it("throws on server error", async () => {
    vi.stubGlobal("fetch", mockFetchSequence(
      csrfResponse(),
      errorResponse({ detail: "A route must include at least 2 mountains." }),
    ));
    await expect(createRouteLog(validPayload)).rejects.toThrow("A route must include at least 2 mountains.");
  });
});

// ---------------------------------------------------------------------------
// getRouteLog
// ---------------------------------------------------------------------------

describe("getRouteLog", () => {
  it("calls GET /api/progress/routes/:id/", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(successResponse({ id: 3, name: "Test Route" })));
    await getRouteLog(3);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/progress/routes/3/"),
      expect.any(Object),
    );
  });

  it("returns the route object", async () => {
    const route = { id: 3, name: "Test Route", mountains: [], mountains_count: 2 };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(successResponse(route)));
    const result = await getRouteLog(3);
    expect(result).toEqual(route);
  });

  it("throws 404 when route not found", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(errorResponse({ detail: "Route not found." }, 404)));
    await expect(getRouteLog(99)).rejects.toThrow("Route not found.");
  });
});

// ---------------------------------------------------------------------------
// updateRouteLog
// ---------------------------------------------------------------------------

describe("updateRouteLog", () => {
  it("fetches CSRF then PATCHes /api/progress/routes/:id/", async () => {
    vi.stubGlobal("fetch", mockFetchSequence(
      csrfResponse(),
      successResponse({ detail: "Route updated.", id: 3 }),
    ));
    await updateRouteLog(3, { name: "New Name" });
    const [, patchCall] = fetch.mock.calls;
    expect(patchCall[0]).toContain("/progress/routes/3/");
    expect(patchCall[1].method).toBe("PATCH");
  });

  it("sends X-CSRFToken header", async () => {
    vi.stubGlobal("fetch", mockFetchSequence(
      csrfResponse(),
      successResponse({ detail: "Updated." }),
    ));
    await updateRouteLog(3, { name: "New Name" });
    const [, patchCall] = fetch.mock.calls;
    expect(patchCall[1].headers["X-CSRFToken"]).toBe("test-csrf-token");
  });

  it("sends payload as JSON", async () => {
    vi.stubGlobal("fetch", mockFetchSequence(
      csrfResponse(),
      successResponse({ detail: "Updated." }),
    ));
    const payload = { name: "Updated Route", hike_distance_km: 18.5 };
    await updateRouteLog(3, payload);
    const [, patchCall] = fetch.mock.calls;
    expect(JSON.parse(patchCall[1].body)).toEqual(payload);
  });

  it("throws when update fails", async () => {
    vi.stubGlobal("fetch", mockFetchSequence(
      csrfResponse(),
      errorResponse({ detail: "Route not found." }, 404),
    ));
    await expect(updateRouteLog(99, { name: "x" })).rejects.toThrow("Route not found.");
  });
});

// ---------------------------------------------------------------------------
// deleteRouteLog
// ---------------------------------------------------------------------------

describe("deleteRouteLog", () => {
  it("fetches CSRF then DELETEs /api/progress/routes/:id/", async () => {
    vi.stubGlobal("fetch", mockFetchSequence(
      csrfResponse(),
      { ok: true, status: 200, json: vi.fn().mockResolvedValue({ detail: "Route deleted." }) },
    ));
    await deleteRouteLog(5);
    const [, deleteCall] = fetch.mock.calls;
    expect(deleteCall[0]).toContain("/progress/routes/5/");
    expect(deleteCall[1].method).toBe("DELETE");
  });

  it("sends X-CSRFToken header", async () => {
    vi.stubGlobal("fetch", mockFetchSequence(
      csrfResponse(),
      { ok: true, status: 200, json: vi.fn().mockResolvedValue({ detail: "Deleted." }) },
    ));
    await deleteRouteLog(5);
    const [, deleteCall] = fetch.mock.calls;
    expect(deleteCall[1].headers["X-CSRFToken"]).toBe("test-csrf-token");
  });

  it("returns detail message on success", async () => {
    vi.stubGlobal("fetch", mockFetchSequence(
      csrfResponse(),
      { ok: true, status: 200, json: vi.fn().mockResolvedValue({ detail: "Route 'Fairfield Horseshoe' deleted." }) },
    ));
    const result = await deleteRouteLog(5);
    expect(result.detail).toContain("deleted");
  });

  it("throws when delete fails", async () => {
    vi.stubGlobal("fetch", mockFetchSequence(
      csrfResponse(),
      { ok: false, status: 404, json: vi.fn().mockResolvedValue({ detail: "Route not found." }) },
    ));
    await expect(deleteRouteLog(99)).rejects.toThrow("Route not found.");
  });
});

// ---------------------------------------------------------------------------
// searchMountains
// ---------------------------------------------------------------------------

describe("searchMountains", () => {
  it("calls getMountains with search param", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(successResponse([])));
    await searchMountains("helvellyn");
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("search=helvellyn"),
      expect.any(Object),
    );
  });

  it("includes page_size=20 param", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(successResponse([])));
    await searchMountains("scafell");
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("page_size=20"),
      expect.any(Object),
    );
  });

  it("returns empty array for query shorter than 2 chars", async () => {
    const result = await searchMountains("h");
    expect(result).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns empty array for empty query", async () => {
    const result = await searchMountains("");
    expect(result).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns mountain results", async () => {
    const mountains = [{ id: 1, name: "Helvellyn", height_m: 950 }];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(successResponse(mountains)));
    const result = await searchMountains("helvellyn");
    expect(result).toEqual(mountains);
  });
});