import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";
import { headers } from "next/headers";

const KEY = "pm-data";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
};

function getRedis() {
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  await headers();
  const redis = getRedis();
  const data = await redis.get(KEY);
  return NextResponse.json(
    data || { projects: [], tasks: [], comments: [], activities: [], members: [] },
    { headers: NO_CACHE_HEADERS }
  );
}

export async function PUT(request) {
  const redis = getRedis();
  const body = await request.json();
  await redis.set(KEY, body);
  return NextResponse.json({ ok: true }, { headers: NO_CACHE_HEADERS });
}
