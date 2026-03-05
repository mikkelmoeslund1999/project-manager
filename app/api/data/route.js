import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

const KEY = "pm-data";

function getRedis() {
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

export async function GET() {
  const redis = getRedis();
  const data = await redis.get(KEY);
  if (!data) {
    return NextResponse.json({
      projects: [],
      tasks: [],
      comments: [],
      activities: [],
    });
  }
  return NextResponse.json(data);
}

export async function PUT(request) {
  const redis = getRedis();
  const body = await request.json();
  await redis.set(KEY, body);
  return NextResponse.json({ ok: true });
}
