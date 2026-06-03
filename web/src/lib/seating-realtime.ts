import type { IncomingMessage } from "http";
import type { Server } from "http";
import { WebSocket, WebSocketServer } from "ws";
import { getToken } from "next-auth/jwt";
import { getSeatingMap, type SeatingMap } from "./seating";

type SeatingClient = {
  ws: WebSocket;
  eventId: string;
};

const globalForSeating = globalThis as typeof globalThis & {
  __seatingClients?: Set<SeatingClient>;
};

function getClients() {
  if (!globalForSeating.__seatingClients) {
    globalForSeating.__seatingClients = new Set();
  }
  return globalForSeating.__seatingClients;
}

function sendMap(ws: WebSocket, map: SeatingMap) {
  if (ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({ type: "seating:map", data: map }));
}

/** Instant push for local dev when `npm run dev:ws` custom server is running. */
export async function pushSeatingToWebSocketClients(eventId: string) {
  const map = await getSeatingMap(eventId);
  const payload = JSON.stringify({ type: "seating:map", data: map });
  for (const client of getClients()) {
    if (client.eventId === eventId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload);
    }
  }
}

export function attachSeatingWebSocket(server: Server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    const host = req.headers.host ?? "localhost";
    const url = new URL(req.url ?? "/", `http://${host}`);
    if (url.pathname !== "/ws/seating") return;

    void authorizeUpgrade(req).then((auth) => {
      if (!auth.ok) {
        socket.write(`HTTP/1.1 ${auth.status} ${auth.message}\r\n\r\n`);
        socket.destroy();
        return;
      }

      const eventId = url.searchParams.get("eventId");
      if (!eventId) {
        socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
        socket.destroy();
        return;
      }

      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, eventId);
      });
    });
  });

  wss.on("connection", (ws, eventId: string) => {
    const client: SeatingClient = { ws, eventId };
    getClients().add(client);

    void getSeatingMap(eventId)
      .then((map) => sendMap(ws, map))
      .catch(() => {
        ws.close(1011, "map load failed");
      });

    ws.on("close", () => {
      getClients().delete(client);
    });
    ws.on("error", () => {
      getClients().delete(client);
    });
  });
}

async function authorizeUpgrade(
  req: IncomingMessage
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return { ok: false, status: 503, message: "Service Unavailable" };
  }

  const token = await getToken({
    req: { headers: req.headers as Record<string, string> },
    secret,
  });
  if (!token?.sub) {
    return { ok: false, status: 401, message: "Unauthorized" };
  }

  return { ok: true };
}
