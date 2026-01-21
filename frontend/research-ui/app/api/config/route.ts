import { NextResponse } from "next/server";

export const runtime = "nodejs"; // ensures Node runtime on Cloud Run

export async function GET() {
  return NextResponse.json({
    apiBaseUrl: process.env.API_BASE_URL ?? "",
  });
}
