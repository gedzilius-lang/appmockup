import { NextResponse } from "next/server";

const API_INTERNAL = process.env.INTERNAL_API_URL || process.env.API_BASE_URL || "https://api.peoplewelike.club";

async function proxy(request, { params }) {
  const path = "/" + (await params).path.join("/");
  const url = `${API_INTERNAL}${path}`;
  const headers = { "Content-Type": "application/json" };
  const auth = request.headers.get("authorization");
  if (auth) headers["Authorization"] = auth;

  try {
    const opts = { method: request.method, headers };
    if (request.method !== "GET" && request.method !== "HEAD") {
      opts.body = await request.text();
    }
    const res = await fetch(url, opts);
    const data = await res.text();
    return new NextResponse(data, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return NextResponse.json({ error: "API unreachable" }, { status: 502 });
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const DELETE = proxy;
export const PATCH = proxy;
