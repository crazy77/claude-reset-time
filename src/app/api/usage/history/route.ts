import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { DATA_DIR, parseIntParam } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const hours = parseIntParam(searchParams.get("hours"), 24, 1, 720);
    const cutoff = Date.now() / 1000 - hours * 3600;

    const filePath = join(DATA_DIR, "usage-history.jsonl");
    const raw = await readFile(filePath, "utf-8");
    const lines = raw.trim().split("\n").filter(Boolean);

    const entries = lines
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter((e): e is NonNullable<typeof e> => e !== null && e.ts >= cutoff);

    return NextResponse.json(entries);
  } catch {
    return NextResponse.json([]);
  }
}
