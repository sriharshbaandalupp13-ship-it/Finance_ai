import { NextResponse } from "next/server";
import { getCompanySnapshot } from "@/lib/company-service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ symbol: string }> },
) {
  const params = await context.params;

  try {
    const payload = await getCompanySnapshot(params.symbol);
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ message }, { status: 500 });
  }
}
