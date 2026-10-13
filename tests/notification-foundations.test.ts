/**
 * Nova — Phase 0+1 Notification Foundations Regression Tests
 *
 * Covers: cron CRON_SECRET auth (fail-closed), SMTP/Gmail-465 transport
 * config, honest email delivery outcomes, and the 13-field notification
 * preferences API validation.
 *
 * Fully offline: supabase env vars are unset so admin clients are null,
 * nodemailer transport is stubbed, no network or DB access occurs.
 *
 * Run with: npx tsx tests/notification-foundations.test.ts
 */

// Module marker — prevents top-level declarations colliding with
// payment-regression.test.ts (which is a global script) under tsc.
export {};

// ─── Mock infrastructure (same convention as payment-regression.test.ts) ──

let testCount = 0;
let passCount = 0;
let failCount = 0;
const failures: string[] = [];

function assert(condition: boolean, message: string) {
  testCount++;
  if (condition) {
    passCount++;
    console.log(`  ✓ ${message}`);
  } else {
    failCount++;
    failures.push(message);
    console.log(`  ✗ ${message}`);
  }
}

function assertEqual(actual: any, expected: any, message: string) {
  assert(JSON.stringify(actual) === JSON.stringify(expected),
    `${message} (expected: ${JSON.stringify(expected)}, got: ${JSON.stringify(actual)})`);
}

function mockRes() {
  const res: any = {
    _status: 0,
    _json: null as any,
    status(s: number) { res._status = s; return res; },
    json(j: any) { res._json = j; return res; },
  };
  return res;
}

function mockReq(headers: Record<string, string> = {}, method = 'GET') {
  return { headers, method, query: {} } as any;
}

const ENV_KEYS = [
  'CRON_SECRET',
  'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM', 'SMTP_SECURE',
];

function withEnv(vars: Record<string, string | undefined>, fn: () => void | Promise<void>) {
  const saved: Record<string, string | undefined> = {};
  for (const k of ENV_KEYS) { saved[k] = process.env[k]; delete process.env[k]; }
  Object.assign(process.env, vars);
  const restore = () => { for (const k of ENV_KEYS) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]!; } };
  const r = fn();
  if (r instanceof Promise) return r.finally(restore);
  restore();
  return r;
}

// ─── Tests ────────────────────────────────────────────────────────────────

const CRON_ROUTES = [
  'expire-subscriptions',
  'subscription-expiry-reminders',
  'renewal-reminders',
  'payment-reminders',
  'audit-subscriptions',
];

async function testCronAuth() {
  console.log('\n📋 Test: cron endpoints enforce fail-closed CRON_SECRET auth');

  // Unset supabase env BEFORE importing handlers so supabaseAdmin === null
  await withEnv({ CRON_SECRET: 'test-secret-123' }, async () => {
    for (const name of CRON_ROUTES) {
      const handler = (await import(`../src/pages/api/cron/${name}`)).default;

      // Correct secret → auth passes (falls through to no-admin-client)
      const resOk = mockRes();
      await handler(mockReq({ authorization: 'Bearer test-secret-123' }), resOk);
      assert(resOk._status === 200, `${name}: correct secret authorized (status ${resOk._status})`);

      // Wrong secret → 401
      const resBad = mockRes();
      await handler(mockReq({ authorization: 'Bearer wrong' }), resBad);
      assertEqual(resBad._status, 401, `${name}: wrong secret rejected`);

      // No header → 401
      const resNone = mockRes();
      await handler(mockReq(), resNone);
      assertEqual(resNone._status, 401, `${name}: missing header rejected`);
    }
  });

  // Missing CRON_SECRET must fail CLOSED (503), never open
  await withEnv({}, async () => {
    for (const name of CRON_ROUTES) {
      const handler = (await import(`../src/pages/api/cron/${name}`)).default;
      const res = mockRes();
      await handler(mockReq({ authorization: 'Bearer anything' }), res);
      assert(res._status === 503 || res._status === 401, `${name}: missing secret fails closed (${res._status})`);
      assert(res._status !== 200, `${name}: missing secret does NOT allow execution`);
    }
  });
}

async function testEnvCheckAdminGate() {
  console.log('\n📋 Test: env-check requires admin auth');

  await withEnv({}, async () => {
    const handler = (await import('../src/pages/api/debug/env-check')).default;

    const resNoToken = mockRes();
    await handler(mockReq(), resNoToken);
    assertEqual(resNoToken._status, 401, 'env-check: no token → 401');

    // Bearer token but no supabase env → verifyAdmin returns isAdmin:false → 403
    const resNonAdmin = mockRes();
    await handler(mockReq({ authorization: 'Bearer fake-token' }), resNonAdmin);
    assertEqual(resNonAdmin._status, 403, 'env-check: non-admin → 403');
    assert(!(resNonAdmin._json && resNonAdmin._json.required), 'env-check: no env data leaked to non-admin');

    const resPost = mockRes();
    await handler(mockReq({ authorization: 'Bearer fake' }, 'POST'), resPost);
    assertEqual(resPost._status, 405, 'env-check: POST → 405');
  });
}

async function testSmtpGmail465() {
  console.log('\n📋 Test: SMTP transport config for Gmail port 465');

  const nodemailer = require('nodemailer');
  const origCreate = nodemailer.createTransport;

  await withEnv({
    SMTP_HOST: 'smtp.gmail.com', SMTP_PORT: '465',
    SMTP_USER: 'u@example.com', SMTP_PASS: 'app-password', SMTP_FROM: 'Nova <u@example.com>',
  }, async () => {
    const { sendEmail } = await import('../src/lib/notify');

    let captured: any = null;
    let sendMailCalled = false;
    nodemailer.createTransport = (opts: any) => {
      captured = opts;
      return { sendMail: async (msg: any) => { sendMailCalled = true; captured.msg = msg; return {}; } };
    };

    const res = await sendEmail('dest@example.com', 'Subject', '<p>hi</p>', { replyTo: 'user@example.com' });
    assertEqual(res.status, 'sent', 'sendEmail reports sent on success');
    assert(res.sent === true, 'sendEmail sent flag true on success');
    assertEqual(captured.host, 'smtp.gmail.com', 'transport host is smtp.gmail.com');
    assertEqual(captured.port, 465, 'transport port is 465');
    assert(captured.secure === true, 'port 465 uses implicit TLS (secure:true)');
    assertEqual(captured.auth.user, 'u@example.com', 'auth uses SMTP_USER');
    assertEqual(captured.msg.from, 'Nova <u@example.com>', 'sender uses SMTP_FROM');
    assertEqual(captured.msg.replyTo, 'user@example.com', 'replyTo option passed through');
    assert(sendMailCalled, 'sendMail invoked');
  });

  nodemailer.createTransport = origCreate;
}

async function testSmtpHonestOutcomes() {
  console.log('\n📋 Test: missing SMTP config and failures are not reported as sent');

  const nodemailer = require('nodemailer');
  const origCreate = nodemailer.createTransport;

  // Missing config → dry-run, not sent
  await withEnv({}, async () => {
    const { sendEmail } = await import('../src/lib/notify');
    let transportCreated = false;
    nodemailer.createTransport = () => { transportCreated = true; return { sendMail: async () => ({}) }; };
    const res = await sendEmail('d@e.com', 's', 'h');
    assertEqual(res.status, 'dry-run', 'missing SMTP config → dry-run status');
    assert(res.sent === false, 'dry-run is not marked sent');
    assert(!transportCreated, 'no transport created when unconfigured');
  });

  // Transport failure → error, not sent
  await withEnv({ SMTP_HOST: 'smtp.gmail.com', SMTP_USER: 'u', SMTP_PASS: 'p', SMTP_PORT: '465' }, async () => {
    const { sendEmail } = await import('../src/lib/notify');
    nodemailer.createTransport = () => ({ sendMail: async () => { throw new Error('535 auth failed'); } });
    const res = await sendEmail('d@e.com', 's', 'h');
    assertEqual(res.status, 'error', 'SMTP failure → error status');
    assert(res.sent === false, 'SMTP failure is not marked sent');
    assert(!String(res.error || '').includes('535') && !String(res.error || '').includes('password'), 'error does not leak SMTP server details');
  });

  // Reminder handler must not record 'sent' on dry-run — static assertion
  const fs = require('fs');
  const src = fs.readFileSync(require('path').join(__dirname, '..', 'src', 'pages', 'api', 'cron', 'subscription-expiry-reminders.ts'), 'utf-8');
  assert(src.includes("emailStatus === 'sent'"), 'expiry-reminders gates recordReminderSent on sent status');
  assert(!/recordReminderSent\([^)]*\);\s*\n\s*sent\+\+/.test(src.replace(/if \(pushOk[\s\S]*?\{[\s\S]*?\}/, '')), 'no unconditional recordReminderSent+sent++ remains');

  nodemailer.createTransport = origCreate;
}

async function testPrefsValidation() {
  console.log('\n📋 Test: notification preferences validation (all 13 fields)');

  const { validatePrefsPatch, NOTIFICATION_PREF_BOOL_FIELDS, DEFAULT_NOTIFICATION_PREFS } =
    await import('../src/lib/notificationPrefsValidation');

  assert(NOTIFICATION_PREF_BOOL_FIELDS.length === 10, '10 boolean fields defined');

  const full = validatePrefsPatch({
    new_episodes: false, followed_podcasts_only: true, email_enabled: false, push_enabled: true,
    quiet_hours_enabled: true, quiet_hours_start: '21:30', quiet_hours_end: '06:45',
    category_new_episodes: false, category_followed_podcasts: true, category_recommendations: true,
    category_subscription_reminders: false, category_product_updates: true,
    unknown_field: 'dropped',
  });
  assert(full.ok === true, 'full valid patch accepted');
  if (full.ok) {
    assert(Object.keys(full.patch).length === 12, 'all 12 supplied fields kept, unknown dropped');
    assert(full.patch.new_episodes === false, 'explicit opt-out preserved (new_episodes=false)');
    assert(full.patch.category_subscription_reminders === false, 'explicit opt-out preserved (category_subscription_reminders=false)');
    assert(!('unknown_field' in full.patch), 'unknown field dropped');
  }

  assert(validatePrefsPatch({ new_episodes: 'yes' }).ok === false, 'non-boolean boolean field rejected');
  assert(validatePrefsPatch({ quiet_hours_start: '25:00' }).ok === false, 'invalid time rejected');
  assert(validatePrefsPatch({ quiet_hours_start: '8pm' }).ok === false, 'non-HH:MM time rejected');
  assert(validatePrefsPatch({ quiet_hours_start: '23:59' }).ok === true, 'valid time accepted');
  assert(validatePrefsPatch({}).ok === false, 'empty patch rejected');
  assert(validatePrefsPatch(null).ok === false, 'null body rejected');
  assert(validatePrefsPatch('str').ok === false, 'non-object body rejected');
  assert(validatePrefsPatch({ hacker: true }).ok === false, 'unknown-only patch rejected');

  assertEqual(DEFAULT_NOTIFICATION_PREFS.category_subscription_reminders, true, 'default: subscription reminders on');
  assertEqual(DEFAULT_NOTIFICATION_PREFS.category_product_updates, false, 'default: product updates off');
}

async function testPrefsRouteAuth() {
  console.log('\n📋 Test: preferences API enforces bearer auth');

  await withEnv({}, async () => {
    const mod = await import('../src/app/api/notifications/preferences/route');

    const mkReq = (headers = {}, method = 'GET', jsonBody?: any) => ({
      headers: { get: (k: string) => (headers as any)[k.toLowerCase()] ?? null },
      json: async () => jsonBody,
    }) as any;

    const resGet = await mod.GET(mkReq());
    assertEqual(resGet.status, 401, 'GET without token → 401');

    const resPost = await mod.POST(mkReq({}, 'POST', { new_episodes: true }));
    assertEqual(resPost.status, 401, 'POST without token → 401');
  });
}

async function testCronAuthHelperSource() {
  console.log('\n📋 Test: cronAuth helper fails closed and uses Bearer format');

  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'lib', 'cronAuth.ts'), 'utf-8');
  assert(src.includes('Bearer ${cronSecret}'), 'helper expects `Authorization: Bearer <CRON_SECRET>` (Vercel cron format)');
  assert(src.includes('503'), 'helper returns 503 when secret missing (fail closed)');
  assert(src.includes('401'), 'helper returns 401 on wrong secret');
  assert(!src.includes('if (cronSecret)') || src.indexOf('!cronSecret') < src.indexOf('Bearer'), 'missing-secret branch precedes Bearer check');
}

// ─── Runner ────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Nova — Phase 0+1 Notification Foundations Tests');
  console.log('═══════════════════════════════════════════════════════════');

  await testCronAuth();
  await testEnvCheckAdminGate();
  await testSmtpGmail465();
  await testSmtpHonestOutcomes();
  await testPrefsValidation();
  await testPrefsRouteAuth();
  await testCronAuthHelperSource();

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`  Results: ${passCount} passed, ${failCount} failed, ${testCount} total`);
  if (failures.length > 0) {
    console.log('  Failures:');
    failures.forEach(f => console.log(`    ✗ ${f}`));
  }
  console.log('═══════════════════════════════════════════════════════════\n');
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch(e => { console.error('Test runner error:', e); process.exit(1); });
