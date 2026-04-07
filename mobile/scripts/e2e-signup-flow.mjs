/**
 * 모바일과 동일한 Supabase 흐름 검증: 가입(또는 기존 로그인) → 프로필 → 온보딩 업데이트
 *
 * 전체(신규 가입):
 *   cd mobile && node scripts/e2e-signup-flow.mjs
 *
 * 기존 계정만 (가입 rate limit 시 등):
 *   E2E_EMAIL=... E2E_PASSWORD=... node scripts/e2e-signup-flow.mjs --sign-in-only
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvFromDotenv() {
  const envPath = join(__dirname, '..', '.env');
  if (!existsSync(envPath)) return;
  const raw = readFileSync(envPath, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

if (!process.env.EXPO_PUBLIC_SUPABASE_URL) loadEnvFromDotenv();

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anon) {
  console.error('[FAIL] mobile/.env 에 EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY 가 필요합니다.');
  process.exit(1);
}

const sb = createClient(url, anon);
const signInOnly = process.argv.includes('--sign-in-only');

function fail(name, err) {
  console.error(`[FAIL] ${name}`, err);
  process.exit(1);
}

function ok(name) {
  console.log(`[OK] ${name}`);
}

async function profileAndOnboarding(userId) {
  const { data: profBefore, error: profErr } = await sb
    .from('profiles')
    .select('id, onboarding_completed, nickname')
    .eq('id', userId)
    .maybeSingle();

  if (profErr) fail('profiles select (트리거 확인)', profErr.message);
  if (!profBefore) fail('profiles row', 'handle_new_user 트리거로 profiles 행이 없음');
  ok('profiles 존재 (auth.users → profiles 트리거)');

  const { error: upErr } = await sb
    .from('profiles')
    .update({
      nickname: 'E2E 테스터',
      default_region: '서울',
      default_lat: 37.5665,
      default_lng: 126.978,
      cold_sensitivity: 'normal',
      heat_sensitivity: 'normal',
      default_transport: '지하철',
      commute_student: false,
      notifications_enabled: false,
      onboarding_completed: true,
    })
    .eq('id', userId);

  if (upErr) fail('profiles update (온보딩과 동일 필드)', upErr.message);
  ok('온보딩과 동일한 profiles 업데이트');

  const { data: profAfter, error: afterErr } = await sb
    .from('profiles')
    .select('onboarding_completed, nickname, default_region')
    .eq('id', userId)
    .single();

  if (afterErr) fail('profiles 재조회', afterErr.message);
  if (!profAfter?.onboarding_completed) fail('onboarding_completed', 'true 아님');
  ok('onboarding_completed === true 확인');
}

async function main() {
  if (signInOnly) {
    const email = process.env.E2E_EMAIL;
    const password = process.env.E2E_PASSWORD;
    if (!email || !password) {
      console.error('[FAIL] --sign-in-only 사용 시 E2E_EMAIL, E2E_PASSWORD 환경 변수가 필요합니다.');
      process.exit(1);
    }
    console.log('--- E2E: 기존 계정 로그인 ~ 온보딩 (API) ---\n');
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) fail('signInWithPassword', error.message);
    const userId = data.user?.id;
    if (!userId) fail('session', 'no user id');
    ok('signInWithPassword');
    await profileAndOnboarding(userId);
    await sb.auth.signOut();
    ok('signOut');
    console.log('\n--- 결과: PASS (--sign-in-only) ---');
    process.exit(0);
    return;
  }

  const ts = Date.now();
  const email = process.env.E2E_SIGNUP_EMAIL ?? `outfite2e.${ts}@gmail.com`;
  const password = `E2E_Aa1_${ts}!`;

  console.log('--- E2E: 신규 가입 ~ 온보딩 (API) ---\n');

  const signUpRes = await sb.auth.signUp({ email, password });
  if (signUpRes.error) {
    const msg = signUpRes.error.message;
    if (msg.includes('rate limit') || msg.includes('Rate limit')) {
      console.error('[FAIL] signUp', msg);
      console.error(
        '\n힌트: Supabase Auth 가입 빈도 제한입니다. 잠시 후 재시도하거나 기존 계정으로:\n' +
          '  E2E_EMAIL=... E2E_PASSWORD=... node scripts/e2e-signup-flow.mjs --sign-in-only\n'
      );
      process.exit(1);
    }
    fail('signUp', msg);
  }

  let session = signUpRes.data.session;
  const userId = signUpRes.data.user?.id;
  if (!userId) fail('signUp user id', 'no user id returned');

  ok(`signUp (${signUpRes.data.session ? '세션 있음' : '세션 없음 — 이메일 확인 프로젝트일 수 있음'})`);

  if (!session) {
    const signInRes = await sb.auth.signInWithPassword({ email, password });
    if (signInRes.error) {
      fail(
        'signIn after signUp',
        `${signInRes.error.message} (가입 직후 이메일 확인이 필요하면 이 단계는 실패할 수 있습니다.)`
      );
    }
    session = signInRes.data.session;
    ok('signIn (가입 후 세션 확보)');
  }

  await profileAndOnboarding(userId);

  await sb.auth.signOut();
  ok('signOut');

  console.log('\n--- 결과: PASS ---');
  console.log('테스트 계정 (필요 시 Auth 대시보드에서 삭제):', email);
  process.exit(0);
}

await main();
