import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { reminders } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params; // <--- await the promise

  const [row] = await db
    .select()
    .from(reminders)
    .where(and(eq(reminders.id, id), eq(reminders.userId, session.user.id)))
    .limit(1);

  if (!row)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db
    .update(reminders)
    .set({ isCompleted: true, completedAt: new Date() })
    .where(eq(reminders.id, id));

  return NextResponse.json({ ok: true });
}