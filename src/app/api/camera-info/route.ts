import { NextRequest, NextResponse } from "next/server";
import { getCameraInfo } from "@/lib/camera";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const port = searchParams.get("port");
    const info = await getCameraInfo(undefined, port, 15000);
    return NextResponse.json(info);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Camera info failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

