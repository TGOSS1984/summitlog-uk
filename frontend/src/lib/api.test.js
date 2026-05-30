/**
 * Tests for src/lib/api.js
 *
 * All fetch calls are intercepted with vi.fn() — no real network requests made.
 * Each test group covers a logical slice of the API module.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getCollections,
  getRegions,
  getMountains,
  getMountain,
  getCurrentUser,
  getCsrfToken,
  getProgressLogs,
  createProgressLog,
  updateProgressLog,
  deleteProgressLog,
  registerUser,
  loginUser,
  logoutUser,
  updateProgressLogWithImage,
  exportLogs,
} from '../lib/api'

// ---------------------------------------------------------------------------
// Fetch mock helpers
// ---------------------------------------------------------------------------

function mockFetch(data, ok = true, status = ok ? 200 : 400) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: vi.fn().mockResolvedValue(data),
    blob: vi.fn().mockResolvedValue(new Blob(['csv,data'], { type: 'text/csv' })),
    headers: new Headers(),
  })
}

// CSRF always resolves first for mutation functions
function mockFetchSequence(...responses) {
  let call = 0
  return vi.fn().mockImplementation(() => {
    const res = responses[call] ?? responses[responses.length - 1]
    call++
    return Promise.resolve(res)
  })
}

function csrfResponse() {
  return {
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue({ csrfToken: 'test-csrf-token' }),
  }
}

function successResponse(data) {
  return {
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue(data),
  }
}

function errorResponse(data, status = 400) {
  return {
    ok: false,
    status,
    json: vi.fn().mockResolvedValue(data),
  }
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch({}))
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ---------------------------------------------------------------------------
// getCsrfToken
// ---------------------------------------------------------------------------

describe('getCsrfToken', () => {
  it('calls /api/auth/csrf/', async () => {
    vi.stubGlobal('fetch', mockFetch({ csrfToken: 'abc123' }))
    await getCsrfToken()
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/csrf/'),
      expect.any(Object),
    )
  })

  it('returns the csrfToken string', async () => {
    vi.stubGlobal('fetch', mockFetch({ csrfToken: 'my-token' }))
    const token = await getCsrfToken()
    expect(token).toBe('my-token')
  })

  it('throws when request fails', async () => {
    vi.stubGlobal('fetch', mockFetch({ detail: 'Error' }, false))
    await expect(getCsrfToken()).rejects.toThrow()
  })
})

// ---------------------------------------------------------------------------
// GET endpoints (no CSRF needed)
// ---------------------------------------------------------------------------

describe('getCollections', () => {
  it('calls /api/collections/', async () => {
    vi.stubGlobal('fetch', mockFetch([]))
    await getCollections()
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/collections/'),
      expect.any(Object),
    )
  })

  it('returns the response data', async () => {
    const collections = [{ id: 1, name: 'Wainwrights' }]
    vi.stubGlobal('fetch', mockFetch(collections))
    const result = await getCollections()
    expect(result).toEqual(collections)
  })

  it('throws on non-ok response', async () => {
    vi.stubGlobal('fetch', mockFetch({ detail: 'Not found' }, false, 404))
    await expect(getCollections()).rejects.toThrow('Not found')
  })
})

describe('getRegions', () => {
  it('calls /api/regions/', async () => {
    vi.stubGlobal('fetch', mockFetch([]))
    await getRegions()
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/regions/'),
      expect.any(Object),
    )
  })

  it('returns the response data', async () => {
    const regions = [{ id: 1, name: 'Lake District' }]
    vi.stubGlobal('fetch', mockFetch(regions))
    const result = await getRegions()
    expect(result).toEqual(regions)
  })
})

describe('getMountains', () => {
  it('calls /api/mountains/ with no params', async () => {
    vi.stubGlobal('fetch', mockFetch([]))
    await getMountains()
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/mountains/'),
      expect.any(Object),
    )
  })

  it('appends query params to the URL', async () => {
    vi.stubGlobal('fetch', mockFetch([]))
    await getMountains({ region__slug: 'lake-district', ordering: '-height_m' })
    const calledUrl = fetch.mock.calls[0][0]
    expect(calledUrl).toContain('region__slug=lake-district')
    expect(calledUrl).toContain('ordering=-height_m')
  })

  it('returns mountain list', async () => {
    const mountains = [{ id: 1, name: 'Scafell Pike', height_m: 978 }]
    vi.stubGlobal('fetch', mockFetch(mountains))
    const result = await getMountains()
    expect(result).toEqual(mountains)
  })

  it('throws when server errors', async () => {
    vi.stubGlobal('fetch', mockFetch({ detail: 'Server error' }, false, 500))
    await expect(getMountains()).rejects.toThrow()
  })
})

describe('getMountain', () => {
  it('calls /api/mountains/:slug/', async () => {
    vi.stubGlobal('fetch', mockFetch({ id: 1, name: 'Helvellyn', slug: 'helvellyn' }))
    await getMountain('helvellyn')
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/mountains/helvellyn/'),
      expect.any(Object),
    )
  })

  it('returns the mountain object', async () => {
    const mountain = { id: 1, name: 'Helvellyn', slug: 'helvellyn', height_m: 950 }
    vi.stubGlobal('fetch', mockFetch(mountain))
    const result = await getMountain('helvellyn')
    expect(result).toEqual(mountain)
  })

  it('throws 404 when mountain not found', async () => {
    vi.stubGlobal('fetch', mockFetch({ detail: 'Not found.' }, false, 404))
    await expect(getMountain('fake-mountain')).rejects.toThrow('Not found.')
  })
})

describe('getCurrentUser', () => {
  it('calls /api/auth/me/', async () => {
    vi.stubGlobal('fetch', mockFetch({ user: null }))
    await getCurrentUser()
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/me/'),
      expect.any(Object),
    )
  })

  it('returns user object when logged in', async () => {
    const userData = { user: { id: 1, username: 'alice' } }
    vi.stubGlobal('fetch', mockFetch(userData))
    const result = await getCurrentUser()
    expect(result).toEqual(userData)
  })

  it('returns null user when not logged in', async () => {
    vi.stubGlobal('fetch', mockFetch({ user: null }))
    const result = await getCurrentUser()
    expect(result.user).toBeNull()
  })
})

describe('getProgressLogs', () => {
  it('calls /api/progress/logs/', async () => {
    vi.stubGlobal('fetch', mockFetch([]))
    await getProgressLogs()
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/progress/logs/'),
      expect.any(Object),
    )
  })

  it('returns logs array', async () => {
    const logs = [{ id: 1, status: 'completed', mountain: 5 }]
    vi.stubGlobal('fetch', mockFetch(logs))
    const result = await getProgressLogs()
    expect(result).toEqual(logs)
  })

  it('throws when unauthenticated', async () => {
    vi.stubGlobal('fetch', mockFetch({ detail: 'Authentication credentials were not provided.' }, false, 403))
    await expect(getProgressLogs()).rejects.toThrow()
  })
})

// ---------------------------------------------------------------------------
// Mutation endpoints (all require CSRF fetch first)
// ---------------------------------------------------------------------------

describe('createProgressLog', () => {
  it('fetches CSRF token first then POSTs to /api/progress/logs/', async () => {
    vi.stubGlobal('fetch', mockFetchSequence(
      csrfResponse(),
      successResponse({ id: 10, status: 'planned' }),
    ))
    await createProgressLog({ mountain: 1, status: 'planned' })
    expect(fetch).toHaveBeenCalledTimes(2)
    const [, postCall] = fetch.mock.calls
    expect(postCall[0]).toContain('/progress/logs/')
    expect(postCall[1].method).toBe('POST')
  })

  it('sends X-CSRFToken header', async () => {
    vi.stubGlobal('fetch', mockFetchSequence(
      csrfResponse(),
      successResponse({ id: 10 }),
    ))
    await createProgressLog({ mountain: 1, status: 'planned' })
    const [, postCall] = fetch.mock.calls
    expect(postCall[1].headers['X-CSRFToken']).toBe('test-csrf-token')
  })

  it('sends payload as JSON body', async () => {
    vi.stubGlobal('fetch', mockFetchSequence(
      csrfResponse(),
      successResponse({ id: 10 }),
    ))
    const payload = { mountain: 3, status: 'completed', completed_date: '2024-06-01' }
    await createProgressLog(payload)
    const [, postCall] = fetch.mock.calls
    expect(JSON.parse(postCall[1].body)).toEqual(payload)
  })

  it('returns the created log', async () => {
    const created = { id: 42, mountain: 1, status: 'planned' }
    vi.stubGlobal('fetch', mockFetchSequence(
      csrfResponse(),
      successResponse(created),
    ))
    const result = await createProgressLog({ mountain: 1, status: 'planned' })
    expect(result).toEqual(created)
  })

  it('throws on server error', async () => {
    vi.stubGlobal('fetch', mockFetchSequence(
      csrfResponse(),
      errorResponse({ completed_date: ['Cannot be in the future.'] }),
    ))
    await expect(createProgressLog({ mountain: 1, status: 'planned' })).rejects.toThrow()
  })
})

describe('updateProgressLog', () => {
  it('sends PATCH to /api/progress/logs/:id/', async () => {
    vi.stubGlobal('fetch', mockFetchSequence(
      csrfResponse(),
      successResponse({ id: 5, status: 'completed' }),
    ))
    await updateProgressLog(5, { status: 'completed' })
    const [, patchCall] = fetch.mock.calls
    expect(patchCall[0]).toContain('/progress/logs/5/')
    expect(patchCall[1].method).toBe('PATCH')
  })

  it('returns updated log', async () => {
    const updated = { id: 5, status: 'completed', notes: 'Great day' }
    vi.stubGlobal('fetch', mockFetchSequence(
      csrfResponse(),
      successResponse(updated),
    ))
    const result = await updateProgressLog(5, { status: 'completed' })
    expect(result).toEqual(updated)
  })
})

describe('deleteProgressLog', () => {
  it('sends DELETE to /api/progress/logs/:id/', async () => {
    vi.stubGlobal('fetch', mockFetchSequence(
      csrfResponse(),
      { ok: true, status: 200, json: vi.fn().mockResolvedValue({ detail: 'Deleted.' }) },
    ))
    await deleteProgressLog(7)
    const [, deleteCall] = fetch.mock.calls
    expect(deleteCall[0]).toContain('/progress/logs/7/')
    expect(deleteCall[1].method).toBe('DELETE')
  })

  it('returns true on success', async () => {
    vi.stubGlobal('fetch', mockFetchSequence(
      csrfResponse(),
      { ok: true, status: 200, json: vi.fn().mockResolvedValue({}) },
    ))
    const result = await deleteProgressLog(7)
    expect(result).toBe(true)
  })

  it('throws when delete fails', async () => {
    vi.stubGlobal('fetch', mockFetchSequence(
      csrfResponse(),
      { ok: false, status: 404, json: vi.fn().mockResolvedValue({ detail: 'Not found.' }) },
    ))
    await expect(deleteProgressLog(99)).rejects.toThrow('Not found.')
  })
})

describe('registerUser', () => {
  it('POSTs to /api/auth/register/', async () => {
    vi.stubGlobal('fetch', mockFetchSequence(
      csrfResponse(),
      successResponse({ id: 1, username: 'newuser' }),
    ))
    await registerUser({ username: 'newuser', password: 'pass12345' })
    const [, postCall] = fetch.mock.calls
    expect(postCall[0]).toContain('/auth/register/')
    expect(postCall[1].method).toBe('POST')
  })

  it('throws on duplicate username', async () => {
    vi.stubGlobal('fetch', mockFetchSequence(
      csrfResponse(),
      errorResponse({ username: ['A user with that username already exists.'] }),
    ))
    await expect(registerUser({ username: 'taken', password: 'pass12345' })).rejects.toThrow()
  })
})

describe('loginUser', () => {
  it('POSTs credentials to /api/auth/login/', async () => {
    vi.stubGlobal('fetch', mockFetchSequence(
      csrfResponse(),
      successResponse({ id: 1, username: 'alice' }),
    ))
    await loginUser({ username: 'alice', password: 'pass12345' })
    const [, postCall] = fetch.mock.calls
    expect(postCall[0]).toContain('/auth/login/')
    expect(postCall[1].method).toBe('POST')
    expect(JSON.parse(postCall[1].body)).toEqual({ username: 'alice', password: 'pass12345' })
  })

  it('returns user data on success', async () => {
    const userData = { id: 1, username: 'alice', email: 'alice@example.com' }
    vi.stubGlobal('fetch', mockFetchSequence(
      csrfResponse(),
      successResponse(userData),
    ))
    const result = await loginUser({ username: 'alice', password: 'pass12345' })
    expect(result).toEqual(userData)
  })

  it('throws on wrong credentials', async () => {
    vi.stubGlobal('fetch', mockFetchSequence(
      csrfResponse(),
      errorResponse({ detail: 'Invalid credentials.' }),
    ))
    await expect(loginUser({ username: 'alice', password: 'wrong' })).rejects.toThrow('Invalid credentials.')
  })
})

describe('logoutUser', () => {
  it('POSTs to /api/auth/logout/', async () => {
    vi.stubGlobal('fetch', mockFetchSequence(
      csrfResponse(),
      successResponse({ detail: 'Logged out.' }),
    ))
    await logoutUser()
    const [, postCall] = fetch.mock.calls
    expect(postCall[0]).toContain('/auth/logout/')
    expect(postCall[1].method).toBe('POST')
  })
})

describe('updateProgressLogWithImage', () => {
  it('sends PATCH with FormData (no Content-Type header)', async () => {
    const formData = new FormData()
    formData.append('uploaded_image', new Blob(['img'], { type: 'image/jpeg' }))

    vi.stubGlobal('fetch', mockFetchSequence(
      csrfResponse(),
      successResponse({ id: 3, uploaded_image: 'http://example.com/img.jpg' }),
    ))
    await updateProgressLogWithImage(3, formData)
    const [, patchCall] = fetch.mock.calls
    expect(patchCall[0]).toContain('/progress/logs/3/')
    expect(patchCall[1].method).toBe('PATCH')
    // FormData should be passed directly — not JSON.stringified
    expect(patchCall[1].body).toBeInstanceOf(FormData)
  })

  it('returns updated log with image URL', async () => {
    const updated = { id: 3, uploaded_image: 'https://r2.example.com/img.jpg' }
    vi.stubGlobal('fetch', mockFetchSequence(
      csrfResponse(),
      successResponse(updated),
    ))
    const result = await updateProgressLogWithImage(3, new FormData())
    expect(result.uploaded_image).toBe('https://r2.example.com/img.jpg')
  })

  it('throws on upload failure', async () => {
    vi.stubGlobal('fetch', mockFetchSequence(
      csrfResponse(),
      { ok: false, status: 400, json: vi.fn().mockResolvedValue({ detail: 'Upload failed.' }) },
    ))
    await expect(updateProgressLogWithImage(3, new FormData())).rejects.toThrow('Upload failed.')
  })
})

describe('exportLogs', () => {
  beforeEach(() => {
    // Mock DOM methods used in exportLogs
    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:fake-url')
    global.URL.revokeObjectURL = vi.fn()
    document.body.appendChild = vi.fn()
    document.body.removeChild = vi.fn()
  })

  it('calls export endpoint with csv format by default', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({}),
      blob: vi.fn().mockResolvedValue(new Blob(['data'], { type: 'text/csv' })),
    }))
    await exportLogs('csv')
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/progress/export/?format=csv'),
      expect.any(Object),
    )
  })

  it('calls export endpoint with gpx format', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({}),
      blob: vi.fn().mockResolvedValue(new Blob(['gpx'], { type: 'application/gpx+xml' })),
    }))
    await exportLogs('gpx')
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/progress/export/?format=gpx'),
      expect.any(Object),
    )
  })

  it('sends correct Accept header for csv', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      blob: vi.fn().mockResolvedValue(new Blob(['data'])),
    }))
    await exportLogs('csv')
    const headers = fetch.mock.calls[0][1].headers
    expect(headers['Accept']).toBe('text/csv')
  })

  it('sends correct Accept header for gpx', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      blob: vi.fn().mockResolvedValue(new Blob(['data'])),
    }))
    await exportLogs('gpx')
    const headers = fetch.mock.calls[0][1].headers
    expect(headers['Accept']).toBe('application/gpx+xml')
  })

  it('throws on export failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ detail: 'Export failed.' }),
    }))
    await expect(exportLogs('csv')).rejects.toThrow('Export failed.')
  })

  it('creates and clicks a download anchor', async () => {
    const mockAnchor = { href: '', download: '', click: vi.fn() }
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor)

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      blob: vi.fn().mockResolvedValue(new Blob(['data'])),
    }))
    await exportLogs('csv')
    expect(mockAnchor.click).toHaveBeenCalled()
    expect(mockAnchor.download).toBe('summitlog-completed.csv')
  })
})

// ---------------------------------------------------------------------------
// request() — shared behaviour tested via a GET endpoint
// ---------------------------------------------------------------------------

describe('request helper behaviour', () => {
  it('always sends credentials: include', async () => {
    vi.stubGlobal('fetch', mockFetch([]))
    await getCollections()
    expect(fetch.mock.calls[0][1].credentials).toBe('include')
  })

  it('always sends Content-Type: application/json', async () => {
    vi.stubGlobal('fetch', mockFetch([]))
    await getCollections()
    expect(fetch.mock.calls[0][1].headers['Content-Type']).toBe('application/json')
  })

  it('throws error with detail message from server', async () => {
    vi.stubGlobal('fetch', mockFetch({ detail: 'Permission denied.' }, false, 403))
    await expect(getCollections()).rejects.toThrow('Permission denied.')
  })

  it('throws error with non_field_errors joined', async () => {
    vi.stubGlobal('fetch', mockFetch(
      { non_field_errors: ['Unable to log in with provided credentials.'] },
      false,
      400,
    ))
    await expect(getCollections()).rejects.toThrow('Unable to log in with provided credentials.')
  })

  it('falls back to generic message when no detail', async () => {
    vi.stubGlobal('fetch', mockFetch({}, false, 500))
    await expect(getCollections()).rejects.toThrow()
  })
})