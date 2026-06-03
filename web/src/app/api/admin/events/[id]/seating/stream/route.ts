import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiT } from "@/lib/i18n/api";
import { getSeatingMap } from "@/lib/seating";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
/** Vercel Pro allows up to 300s; Hobby reconnects every ~60s (EventSource auto-reconnects). */
export const maxDuration = 300;

const POLL_MS = 1000;
const HEARTBEAT_MS = 15000;

function encodeSse(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return new Response(await apiT("api.unauthorized"), { status: 401 });
  }

  const { id: eventId } = await params;
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true },
  });

  if (!event) {
    return new Response(await apiT("api.eventNotFound"), { status: 404 });
  }

  let lastRevision = -1;
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const enqueue = (chunk: string) => {
        if (closed) return;
        controller.enqueue(encoder.encode(chunk));
      };

      const pushIfChanged = async (): Promise<boolean> => {
        const row = await prisma.event.findUnique({
          where: { id: eventId },
          select: { seatingRevision: true },
        });
        if (!row) return false;

        if (row.seatingRevision === lastRevision) return true;

        lastRevision = row.seatingRevision;
        const map = await getSeatingMap(eventId);
        enqueue(encodeSse("seating:map", map));
        return true;
      };

      void (async () => {
        try {
          const ok = await pushIfChanged();
          if (!ok) {
            controller.close();
            return;
          }

          const poll = setInterval(() => {
            void pushIfChanged().then((stillOk) => {
              if (!stillOk) {
                clearInterval(poll);
                clearInterval(heartbeat);
                controller.close();
              }
            });
          }, POLL_MS);

          const heartbeat = setInterval(() => {
            enqueue(": heartbeat\n\n");
          }, HEARTBEAT_MS);

          req.signal.addEventListener("abort", () => {
            closed = true;
            clearInterval(poll);
            clearInterval(heartbeat);
            controller.close();
          });
        } catch {
          controller.close();
        }
      })();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
