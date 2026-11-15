import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { setTimeout as delay } from "node:timers/promises";
import { startMockBackend } from "../scripts/mock-backend.mjs";

const require = createRequire(import.meta.url);
const backend = await startMockBackend();
const port = process.env.SSR_TEST_PORT ?? "3175";
const base = `http://127.0.0.1:${port}`;
let logs = "";
const app = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", port], {
  env: { ...process.env, API_SERVER_URL: backend.url, NEXT_PUBLIC_API_URL: "" }, stdio: ["ignore", "pipe", "pipe"],
});
app.stdout.on("data", (chunk) => { logs += chunk; });
app.stderr.on("data", (chunk) => { logs += chunk; });
const request = (path, name, options = {}) => fetch(base + path, {
  redirect: "manual", ...options,
  headers: { ...(name ? { Cookie: `refreshToken=demo-refresh-${name}` } : {}), ...options.headers },
});

try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (app.exitCode !== null) throw new Error(`앱 시작 실패: ${logs}`);
    try { if ((await fetch(base)).ok) { ready = true; break; } } catch {}
    await delay(100);
  }
  assert(ready, `앱 준비 시간 초과: ${logs}`);
  const missing = await request("/community");
  assert.equal(missing.status, 307);
  assert.equal(new URL(missing.headers.get("location"), base).pathname, "/login");
  assert.equal(backend.requests.length, 0);
  console.log("PASS 쿠키 없이 백엔드 호출하지 않고 로그인 이동");

  const login = await request("/demo/login?user=alice");
  assert.equal(login.status, 303);
  assert.equal(login.headers.get("location"), "/community");
  assert.match(login.headers.get("set-cookie") ?? "", /refreshToken=demo-refresh-alice/);
  console.log("PASS 데모 로그인 이동 시 호스트·쿠키 범위 유지");

  for (const name of ["alice", "bob", "alice"]) {
    const response = await request("/community", name);
    const html = await response.text();
    const markup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
    assert.equal(response.status, 200);
    assert.match(response.headers.get("cache-control") ?? "", /no-store/);
    assert(markup.includes(`${name === "alice" ? "A" : "B"}의 가상 운동 기록 1`));
    assert(!html.includes(`${name === "alice" ? "B" : "A"}의 가상 운동 기록`));
    assert(!html.includes("demo-access-"));
    assert(!html.includes("demo-refresh-"));
  }
  console.log("PASS A → B → A HTML·비공개 캐시·토큰 비노출");

  for (const [name, path] of [["expired", "/login"], ["incomplete", "/onboarding"]]) {
    const response = await request("/community", name);
    assert.equal(response.status, 307);
    assert.equal(new URL(response.headers.get("location"), base).pathname, path);
  }
  assert((await (await request("/community", "outage")).text()).includes("커뮤니티를 불러오지 못했습니다"));
  console.log("PASS 만료·프로필 미완성·백엔드 장애 분기");

  const refresh = await request("/api/auth/refresh", "alice", { method: "POST" });
  const token = await refresh.json();
  assert.equal(refresh.status, 200);
  const page = await request("/api/posts?page=1&size=20", "alice", { headers: { Authorization: `Bearer ${token.accessToken}` } });
  assert.equal(page.status, 200);
  assert.equal((await page.json()).content.length, 4);
  console.log("PASS 브라우저용 프록시의 인증 갱신·다음 페이지 조회");

  const failed = await request("/api/demo/widget", undefined, { method: "POST" });
  assert.equal(failed.status, 503);
  const recovered = await fetch(`${base}/api/demo/widget`, { method: "POST", headers: { Cookie: "demo-widget-retry=ready" } });
  assert.equal(recovered.status, 200);
  console.log("PASS 위젯의 첫 실패·재시도 성공");
  console.log("공개 예제 프로덕션 통합 검증 완료");
} finally {
  const exited = new Promise((resolve) => app.once("exit", resolve));
  if (app.exitCode === null) {
    app.kill("SIGTERM");
    await Promise.race([exited, delay(3000)]);
    if (app.exitCode === null) app.kill("SIGKILL");
  }
  backend.server.closeAllConnections();
  await new Promise((resolve) => backend.server.close(resolve));
}
