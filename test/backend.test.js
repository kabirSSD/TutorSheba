const test = require('node:test');
const assert = require('node:assert/strict');
const { buildInitialData, getData, db } = require('../server');

test('buildInitialData creates demo admin and tutor records', () => {
  const data = buildInitialData();
  assert.ok(Array.isArray(data.users));
  assert.ok(data.users.some((user) => user.role === 'admin'));
  assert.ok(data.users.some((user) => user.role === 'tutor'));
  assert.ok(Array.isArray(data.requests));
  assert.ok(Array.isArray(data.reviews));
});

test('db module provides safe config and connection status', () => {
  const config = db.getSafeConfig();
  assert.equal(config.database, 'tuitionhub_db');
  assert.equal(config.port, 3306);
  assert.equal(typeof config.host, 'string');
  assert.equal(typeof db.isDbConnected(), 'boolean');
});

test('getData returns valid dataset structure', async () => {
  const data = await getData();
  assert.ok(Array.isArray(data.users));
  assert.ok(Array.isArray(data.requests));
  assert.ok(Array.isArray(data.reviews));
});
