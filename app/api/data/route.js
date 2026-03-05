import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

const KEY = "pm-data";

function getRedis() {
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

export const dynamic = "force-dynamic";

export async function GET() {
  const redis = getRedis();
  const data = await redis.get(KEY);
  return NextResponse.json(
    data || { projects: [], tasks: [], comments: [], activities: [], members: [] },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function PUT(request) {
  const redis = getRedis();
  const body = await request.json();
  await redis.set(KEY, body);
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
