import { afterEach, describe, expect, it } from 'vitest';
import { DELETE } from '../app/api/lookup/route';

const originalSecret = process.env.CACHE_ADMIN_SECRET;

afterEach(() => {
  process.env.CACHE_ADMIN_SECRET = originalSecret;
});

function deleteRequest(secret?: string) {
  return new Request('https://example.test/api/lookup', {
    method: 'DELETE',
    headers: {
      'content-type': 'application/json',
      ...(secret ? { 'x-cache-admin-secret': secret } : {}),
    },
    body: JSON.stringify({ all: true }),
  });
}

describe('lookup admin auth', () => {
  it('rejects cache deletion when no admin secret is configured', async () => {
    delete process.env.CACHE_ADMIN_SECRET;

    const response = await DELETE(deleteRequest() as never);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
    expect(response.status).toBe(403);
  });

  it('rejects cache deletion with the wrong admin secret', async () => {
    process.env.CACHE_ADMIN_SECRET = 'expected-secret';

    const response = await DELETE(deleteRequest('wrong-secret') as never);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
    expect(response.status).toBe(403);
  });
});
