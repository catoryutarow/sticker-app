import assert from 'node:assert/strict';
import { once } from 'node:events';
import jwt from 'jsonwebtoken';
import { app } from '../index.js';
import { JWT_SECRET } from '../middleware/auth.js';

const server = app.listen(0, '127.0.0.1');

try {
  await once(server, 'listening');

  const address = server.address();
  assert(address && typeof address === 'object' && 'port' in address, 'Server did not expose a TCP port');
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const smokeEmail = `smoke-${Date.now()}@example.com`;

  const healthResponse = await fetch(`${baseUrl}/health`);
  assert.equal(healthResponse.status, 200, 'Health endpoint should return HTTP 200');

  const healthPayload = await healthResponse.json();
  assert.deepEqual(healthPayload, { status: 'ok' }, 'Health endpoint returned unexpected payload');

  const publicKitsResponse = await fetch(`${baseUrl}/api/kits/public?limit=1`);
  assert.equal(publicKitsResponse.status, 200, 'Public kits endpoint should return HTTP 200');
  const publicKitsPayload = await publicKitsResponse.json();
  assert.equal(Array.isArray(publicKitsPayload.kits), true, 'Public kits endpoint should return a kits array');
  assert.equal(typeof publicKitsPayload.pagination, 'object', 'Public kits endpoint should return pagination metadata');

  const anonymousSaveResponse = await fetch(`${baseUrl}/api/works`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Smoke Anonymous Work',
      anonymousId: 'smoke-anon-id',
      stickers: [
        {
          id: 'smoke-sticker-1',
          type: '001-001',
          x: 100,
          y: 120,
          rotation: 0,
          scale: 1,
          pitch: 0,
        },
      ],
      backgroundId: 'default',
      aspectRatio: '3:4',
    }),
  });
  assert.equal(anonymousSaveResponse.status, 201, 'Anonymous works should still be saveable');
  const anonymousSavePayload = await anonymousSaveResponse.json();
  assert.equal(typeof anonymousSavePayload.shareId, 'string', 'Anonymous save should return a share ID');
  assert.equal(typeof anonymousSavePayload.editToken, 'string', 'Anonymous save should return an edit token');

  const anonymousUpdateRejectedResponse = await fetch(`${baseUrl}/api/works/${anonymousSavePayload.shareId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Should fail' }),
  });
  assert.equal(anonymousUpdateRejectedResponse.status, 403, 'Anonymous work updates should require an edit token');

  const anonymousUpdateResponse = await fetch(`${baseUrl}/api/works/${anonymousSavePayload.shareId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Updated title',
      editToken: anonymousSavePayload.editToken,
    }),
  });
  assert.equal(anonymousUpdateResponse.status, 200, 'Anonymous work updates should succeed with the correct edit token');

  const anonymousDeleteRejectedResponse = await fetch(`${baseUrl}/api/works/${anonymousSavePayload.shareId}`, {
    method: 'DELETE',
  });
  assert.equal(anonymousDeleteRejectedResponse.status, 403, 'Anonymous work deletion should require an edit token');

  const meResponse = await fetch(`${baseUrl}/api/auth/me`);
  assert.equal(meResponse.status, 401, 'Auth me endpoint should require authentication');
  const mePayload = await meResponse.json();
  assert.equal(mePayload.error, 'Authentication required', 'Auth me endpoint returned unexpected unauthenticated payload');

  const adminStatsResponse = await fetch(`${baseUrl}/api/admin/stats`);
  assert.equal(adminStatsResponse.status, 401, 'Admin stats endpoint should require authentication');
  const adminStatsPayload = await adminStatsResponse.json();
  assert.equal(adminStatsPayload.error, 'Authentication required', 'Admin stats endpoint returned unexpected unauthenticated payload');

  const invalidLoginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'bad-email', password: '' }),
  });
  assert.equal(invalidLoginResponse.status, 400, 'Invalid login payload should fail validation');
  const invalidLoginPayload = await invalidLoginResponse.json();
  assert.equal(invalidLoginPayload.error, 'Validation failed', 'Invalid login payload returned unexpected validation response');
  assert.equal(Array.isArray(invalidLoginPayload.details), true, 'Validation response should include details');

  const signupResponse = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: smokeEmail,
      password: 'Password123',
      displayName: 'Smoke Test',
    }),
  });
  assert.equal(signupResponse.status, 201, 'Signup endpoint should create a smoke-test user');
  const signupPayload = await signupResponse.json();
  assert.equal(signupPayload.user.email, smokeEmail, 'Signup response returned unexpected user');
  assert.equal('token' in signupPayload, false, 'Signup response should not expose JWT tokens in the body');
  const authCookie = signupResponse.headers.get('set-cookie');
  assert.equal(typeof authCookie, 'string', 'Signup response should set an auth cookie');

  const authenticatedMeResponse = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Cookie: authCookie },
  });
  assert.equal(authenticatedMeResponse.status, 200, 'Authenticated /me endpoint should return HTTP 200');
  const authenticatedMePayload = await authenticatedMeResponse.json();
  assert.equal(authenticatedMePayload.user.email, smokeEmail, 'Authenticated /me returned unexpected user');

  const csrfBlockedResponse = await fetch(`${baseUrl}/api/auth/resend-verification`, {
    method: 'POST',
    headers: { Cookie: authCookie },
  });
  assert.equal(csrfBlockedResponse.status, 403, 'Cookie-authenticated unsafe requests should require a trusted origin');
  const csrfBlockedPayload = await csrfBlockedResponse.json();
  assert.equal(csrfBlockedPayload.error, 'CSRF validation failed', 'CSRF middleware returned unexpected rejection payload');

  const csrfAllowedResponse = await fetch(`${baseUrl}/api/auth/resend-verification`, {
    method: 'POST',
    headers: {
      Cookie: authCookie,
      Origin: 'http://127.0.0.1:5173',
    },
  });
  assert.equal(csrfAllowedResponse.status, 400, 'Trusted-origin resend verification should reach route-level validation');

  const creatorAdminStatsResponse = await fetch(`${baseUrl}/api/admin/stats`, {
    headers: { Cookie: authCookie },
  });
  assert.equal(creatorAdminStatsResponse.status, 403, 'Creator token should not access admin stats');
  const creatorAdminStatsPayload = await creatorAdminStatsResponse.json();
  assert.equal(creatorAdminStatsPayload.error, 'Admin access required', 'Admin stats should reject creator tokens');

  const unverifiedToken = jwt.sign(
    {
      id: signupPayload.user.id,
      email: signupPayload.user.email,
      role: signupPayload.user.role,
      displayName: signupPayload.user.displayName,
      emailVerified: false,
    },
    JWT_SECRET,
    { expiresIn: '5m' }
  );
  const unverifiedCreatorResponse = await fetch(`${baseUrl}/api/kits`, {
    headers: { Authorization: `Bearer ${unverifiedToken}` },
  });
  assert.equal(unverifiedCreatorResponse.status, 403, 'Unverified creator tokens should not access creator APIs');
  const unverifiedCreatorPayload = await unverifiedCreatorResponse.json();
  assert.equal(unverifiedCreatorPayload.error, 'Email verification required', 'Creator API returned unexpected unverified-user response');

  const anonymousDeleteResponse = await fetch(
    `${baseUrl}/api/works/${anonymousSavePayload.shareId}?editToken=${encodeURIComponent(anonymousSavePayload.editToken)}`,
    {
      method: 'DELETE',
    }
  );
  assert.equal(anonymousDeleteResponse.status, 200, 'Anonymous work deletion should succeed with the correct edit token');

  console.log('Server smoke test passed');
} finally {
  server.close();
  await once(server, 'close');
}
