import { NextResponse } from "next/server";
import { buildCompanyIntelligence, UnknownCompanyError } from "@/backend/routes/build-intelligence";

export async function GET(_request: Request, context: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await context.params;

  try {
    const payload = await buildCompanyIntelligence(symbol);
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ message }, { status: error instanceof UnknownCompanyError ? 404 : 500 });
  }
}
