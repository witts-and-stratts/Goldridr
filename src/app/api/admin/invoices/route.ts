import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getRequestSession } from "@/lib/driver-auth";
import { getInvoices } from "@/lib/invoices";
export async function GET(request: Request) { const session = await getRequestSession(request); if (!session) return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 }); if (!isAdmin(session)) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 }); try { return NextResponse.json({ success: true, invoices: await getInvoices() }); } catch (error) { return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Failed to fetch invoices" }, { status: 500 }); } }
