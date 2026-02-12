import { NextRequest } from "next/server";

/**
 * Non-streaming humanize endpoint.
 * For streaming, use POST /api/humanize/stream instead.
 */
export async function POST(req: NextRequest) {
  return new Response(
    JSON.stringify({
      error: "Use /api/humanize/stream for resume tailoring",
      redirect: "/api/humanize/stream",
    }),
    {
      status: 400,
      headers: { "Content-Type": "application/json" },
    }
  );
}
