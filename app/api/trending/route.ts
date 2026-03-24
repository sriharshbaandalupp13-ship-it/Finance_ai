import { NextResponse } from "next/server";
import { buildTrendingSnapshot } from "@/backend/routes/build-intelligence";

export async function GET() {
  try {
    const payload = await buildTrendingSnapshot();
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ message }, { status: 500 });
  }
}
