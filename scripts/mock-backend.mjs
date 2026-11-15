import { createServer } from "node:http";

const userIds = { alice: 1, bob: 2, incomplete: 3, outage: 4 };

export async function startMockBackend() {
  const requests = [];
  const server = createServer((request, response) => {
    const url = new URL(request.url, "http://localhost");
    requests.push({ path: url.pathname, method: request.method });
    const send = (status, data) => {
      response.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      response.end(JSON.stringify(data));
    };
    if (url.pathname === "/api/auth/refresh" && request.method === "POST") {
      const name = request.headers.cookie?.match(/(?:^|;\s*)refreshToken=demo-refresh-(\w+)/)?.[1];
      if (!name || !(name in userIds)) return send(401, { message: "만료된 데모 인증" });
      return send(200, { accessToken: `demo-access-${name}` });
    }
    const name = request.headers.authorization?.match(/^Bearer demo-access-(\w+)$/)?.[1];
    if (!name || !(name in userIds)) return send(401, { message: "인증 필요" });
    if (url.pathname === "/api/users/me") {
      return send(200, {
        id: userIds[name], name: name === "alice" ? "사용자 A" : name === "bob" ? "사용자 B" : name,
        gender: name === "incomplete" ? null : "MALE", birthDate: "1995-01-01", exerciseLevel: "MIDDLE",
      });
    }
    if (url.pathname === "/api/posts") {
      if (name === "outage") return send(503, { message: "모의 백엔드 장애" });
      const category = url.searchParams.get("category") ?? "ALL";
      const page = Math.max(0, Number(url.searchParams.get("page")) || 0);
      const size = Math.max(1, Math.min(20, Number(url.searchParams.get("size")) || 20));
      const all = Array.from({ length: 24 }, (_, index) => ({
        id: userIds[name] * 100 + index,
        content: `${name === "alice" ? "A" : "B"}의 가상 운동 기록 ${index + 1}`,
        author: { id: userIds[name], name: `데모 ${name}` },
        category: index % 2 === 0 ? "WORKOUT" : "FREE",
        createdAt: "2026-01-01T00:00:00Z",
      })).filter((post) => category === "ALL" || post.category === category);
      return send(200, { content: all.slice(page * size, (page + 1) * size), number: page, last: (page + 1) * size >= all.length });
    }
    return send(404, { message: "모의 API 없음" });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return { server, requests, url: `http://127.0.0.1:${server.address().port}` };
}
