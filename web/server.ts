import "dotenv/config";
import { createServer } from "http";
import { parse } from "url";
import next from "next";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME ?? "localhost";
const port = Number(process.env.PORT ?? 3000);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  const { attachSeatingWebSocket } = await import("./src/lib/seating-realtime");

  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url ?? "", true);
    void handle(req, res, parsedUrl);
  });

  attachSeatingWebSocket(server);

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `\nPort ${port} is already in use. Stop the other dev server first:\n` +
          `  lsof -ti :${port} | xargs kill\n\n` +
          `Or use a different port: PORT=3001 npm run dev:ws\n` +
          `(Note: regular \`npm run dev\` already supports live seat maps via SSE.)\n`
      );
      process.exit(1);
    }
    throw err;
  });

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port} (WebSocket: /ws/seating)`);
  });
});
