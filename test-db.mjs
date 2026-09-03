import { parse } from "url";

const raw = process.env.DATABASE_URL;
if (!raw) { console.error("DATABASE_URL is not set"); process.exit(1); }

// mask password for safe printing
const masked = raw.replace(/:([^@]+)@/, ":****@");
const u = new URL(raw);

console.log("--- Prisma DB Connection Diagnostic ---");
console.log("Raw (masked):", masked);
console.log("Protocol:    ", u.protocol);
console.log("User:        ", u.username);
console.log("Host:        ", u.hostname);
console.log("Port:        ", u.port || "(default 5432)");
console.log("Database:    ", u.pathname.replace("/", ""));
console.log("Params:      ", u.search || "(none)");

// TCP reachability check
import("net").then(({ default: net }) => {
  const host = u.hostname;
  const port = parseInt(u.port || "5432", 10);
  console.log(`\nTesting TCP connection to ${host}:${port}...`);
  const sock = net.createConnection({ host, port, timeout: 5000 });
  sock.on("connect", () => { console.log("TCP connect: OK"); sock.destroy(); });
  sock.on("timeout", () => { console.log("TCP connect: TIMEOUT (5s)"); sock.destroy(); });
  sock.on("error", (e) => { console.log("TCP connect: FAILED -", e.message); });
});
