import { ApiError } from '../api';

// Mock supabase before importing store
jest.mock('../supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(() =>
        Promise.resolve({ data: { session: { access_token: 'test-token' } } }),
      ),
    },
  },
}));

const BASE = 'http://localhost:3000';

beforeEach(() => {
  jest.resetModules();
  process.env.EXPO_PUBLIC_API_URL = BASE;
});

afterEach(() => {
  jest.restoreAllMocks();
  delete process.env.EXPO_PUBLIC_API_URL;
});

describe('ApiError', () => {
  it('stores status and message', () => {
    const err = new ApiError(404, 'Not found');
    expect(err.status).toBe(404);
    expect(err.message).toBe('Not found');
    expect(err.name).toBe('ApiError');
  });

  it('is instanceof Error', () => {
    const err = new ApiError(500, 'Server error');
    expect(err instanceof Error).toBe(true);
  });
});

describe('api request', () => {
  it('GET attaches Authorization header', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('{"data":1}'),
    } as any);

    // Re-require after env is set so BASE_URL is picked up
    const { api } = require('../api');
    await api.get('/lists');

    expect(global.fetch).toHaveBeenCalledWith(
      `${BASE}/lists`,
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      }),
    );
  });

  it('POST sends JSON body', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('{"listId":"1","name":"Groceries"}'),
    } as any);

    const { api } = require('../api');
    const result = await api.post('/lists', { name: 'Groceries' });
    expect(result).toEqual({ listId: '1', name: 'Groceries' });
    expect(global.fetch).toHaveBeenCalledWith(
      `${BASE}/lists`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'Groceries' }),
      }),
    );
  });

  it('throws ApiError on non-2xx response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: 'List not found' }),
    } as any);

    const { api } = require('../api');
    // Use name + status check instead of instanceof (resetModules creates different class instances)
    await expect(api.get('/lists/unknown')).rejects.toMatchObject({ name: 'ApiError', status: 404 });
    await expect(api.get('/lists/unknown')).rejects.toMatchObject({ status: 404 });
  });

  it('throws ApiError with status 429 and rate limit message', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: () => Promise.resolve({ error: 'Rate limit exceeded. Max 10 requests per day.' }),
    } as any);

    const { api } = require('../api');
    await expect(api.post('/recco', {})).rejects.toMatchObject({
      status: 429,
      message: 'Rate limit exceeded. Max 10 requests per day.',
    });
  });

  it('handles empty response body for DELETE', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(''),
    } as any);

    const { api } = require('../api');
    const result = await api.delete('/lists/1');
    expect(result).toEqual({});
  });
});
