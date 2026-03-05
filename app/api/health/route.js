import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const results = {
    envSet: {
      url: !!process.env.UPSTASH_REDIS_REST_URL,
      token: !!process.env.UPSTASH_REDIS_REST_TOKEN,
    },
    write: null,
    read: null,
    currentData: null,
    error: null,
  };

  try {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    // Test write
    await redis.set("pm-health-check", { test: true, time: new Date().toISOString() });
    results.write = "ok";

    // Test read
    const healthData = await redis.get("pm-health-check");
    results.read = healthData;

    // Read current app data
    const appData = await redis.get("pm-data");
    if (appData) {
      results.currentData = {
        projects: (appData.projects || []).length,
        tasks: (appData.tasks || []).length,
        members: (appData.members || []).length,
      };
    } else {
      results.currentData = "no data in Redis";
    }
  } catch (err) {
    results.error = err.message;
  }

  return NextResponse.json(results, {
    headers: { "Cache-Control": "no-store" },
  });
}
