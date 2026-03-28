import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

const DATA_DIR = process.env.CLAUDE_DATA_DIR || join(process.env.HOME || "/root", ".claude");

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const filePath = join(DATA_DIR, "usage-latest.json");
    const raw = await readFile(filePath, "utf-8");
    const data = JSON.parse(raw);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(null, { status: 200 });
  }
}
