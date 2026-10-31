import test from 'node:test';
import assert from 'node:assert/strict';
import { configuredAdminIds } from '../lib/admin-access.ts';

test('verified owner email authorizes the current authenticated Site ID', () => {
  assert.deepEqual(configuredAdminIds({ userId: 'site-owner', email: 'Owner@example.test' }, '', 'owner@example.test'), ['site-owner']);
});
test('anonymous users, other emails and similar email suffixes cannot become admin', () => {
  for (const identity of [null, {userId: 'other', email: 'other@example.test'}, {userId: 'other', email: 'owner@example.test.evil'}, {userId: '', email: 'owner@example.test'}]) {
    assert.deepEqual(configuredAdminIds(identity, '', 'owner@example.test'), []);
  }
});
test('ID allowlist remains compatible and no implicit first-user admin exists', () => {
  assert.deepEqual(configuredAdminIds({ userId: 'visitor', email: 'visitor@example.test' }, 'owner-id,owner-id'), ['owner-id']);
  assert.deepEqual(configuredAdminIds({ userId: 'visitor', email: 'visitor@example.test' }), []);
});
