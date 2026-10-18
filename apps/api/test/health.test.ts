import { test, describe, after } from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';

const testDbPath = path.resolve(process.cwd(), `data/test-health-${Date.now()}.db`);
process.env.DATABASE_PATH = testDbPath;
process.env.NODE_ENV = 'test';

import { buildServer } from '../src/server.js';
import { runMigrations } from '../src/db/migrate.js';
import { closeDb } from '../src/db/index.js';

describe('Healthcheck API', () => {
  runMigrations();
  const app = buildServer();

  after(async () => {
    await app.close();
  });

  test('GET /api/health returns 200 and connected status', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/health',
    });

    assert.strictEqual(response.statusCode, 200);
    const body = JSON.parse(response.payload);
    assert.strictEqual(body.status, 'ok');
    assert.strictEqual(body.database, 'connected');
    assert.strictEqual(body.version, '0.1.0');
    assert.ok(body.timestamp);
  });
});
