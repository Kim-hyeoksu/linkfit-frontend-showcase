import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { startMockBackend } from "./mock-backend.mjs";

const require = createRequire(import.meta.url);
const mode = process.argv[2] ?? "dev";
if (!["dev", "start"].includes(mode)) throw new Error("dev 또는 start만 지원합니다.");
const backend = await startMockBackend();
const port = process.env.PORT ?? "3000";
const child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), mode, ...(mode === "dev" ? ["--webpack"] : []), "--hostname", "127.0.0.1", "--port", port], {
  stdio: "inherit",
  env: { ...process.env, API_SERVER_URL: backend.url, NEXT_PUBLIC_API_URL: "" },
});
console.log(`공개용 모의 API 시작 · http://127.0.0.1:${port}`);

let stopping = false;
function stop(signal = "SIGTERM") {
  if (stopping) return;
  stopping = true;
  child.kill(signal);
  backend.server.close();
}
process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGTERM", () => stop());
child.on("error", (error) => { console.error(error.message); stop(); process.exitCode = 1; });
child.on("exit", (code) => { backend.server.close(); process.exitCode = stopping ? 0 : (code ?? 1); });
