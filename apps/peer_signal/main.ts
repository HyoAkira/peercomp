import PeerSignal from "./peer-signal.ts";
import { createServer } from "http";

const ALLOWED_METHODS = "GET, POST, PUT, DELETE, OPTIONS";
const ALLOWED_HEADERS = "Content-Type, Authorization";

const signal = new PeerSignal(9000);
await signal.start();

await new Promise((r) => setTimeout(r, 500));

const server = createServer((req, res) => {
  // CORS Header'ları
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", ALLOWED_METHODS);
  res.setHeader("Access-Control-Allow-Headers", ALLOWED_HEADERS);

  // Preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || "", `http://${req.headers.host}`);

  if (url.pathname === "/peers") {
    const connections = signal.getConnections();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ connections }));
  } else {
    res.writeHead(404);
    res.end("Not found");
  }
});

server.listen(8000, () => {
  console.log("HTTP server listening on port 8000");
});