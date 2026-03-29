import { NextResponse } from "next/server";
import { writeFile, readFile } from "fs/promises";
import { join } from "path";
import { DATA_DIR } from "@/lib/constants";

const SYNC_FILE = join(DATA_DIR, "usage-sync.json");

export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://claude.ai",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

/** CORS preflight */
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/** claude.ai에서 스크래핑된 사용량 데이터 수신 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // claude.ai API 응답 형식 검증
    if (!body.five_hour || typeof body.five_hour.utilization !== "number") {
      return NextResponse.json({ error: "invalid format" }, { status: 400, headers: CORS_HEADERS });
    }

    const syncData = {
      five_hour: {
        utilization: body.five_hour.utilization,
        resets_at: body.five_hour.resets_at,
      },
      seven_day: body.seven_day
        ? {
            utilization: body.seven_day.utilization,
            resets_at: body.seven_day.resets_at,
          }
        : null,
      seven_day_sonnet: body.seven_day_sonnet
        ? {
            utilization: body.seven_day_sonnet.utilization,
            resets_at: body.seven_day_sonnet.resets_at,
          }
        : null,
      synced_at: Date.now(),
    };

    await writeFile(SYNC_FILE, JSON.stringify(syncData, null, 2));
    return NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
  } catch {
    return NextResponse.json({ error: "parse error" }, { status: 400, headers: CORS_HEADERS });
  }
}

/** 가장 최근 sync 데이터 조회 */
export async function GET() {
  try {
    const raw = await readFile(SYNC_FILE, "utf-8");
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json(null);
  }
}
