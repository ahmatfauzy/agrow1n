import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { reminders, plantingHistory } from "@/db/schema";
import { eq, and, lte, gte } from "drizzle-orm";
import { auth } from "@/lib/auth";

type DbReminder = typeof reminders.$inferSelect;

// Shape auto-reminder 
interface AutoReminder {
  id: string;
  reminderType: string;
  message: string;
  scheduledDate: Date;
  cropName?: string;
  isCompleted: boolean;
  plantingHistoryId: string | null;
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const dbReminders: DbReminder[] = await db
      .select()
      .from(reminders)
      .where(
        and(
          eq(reminders.userId, session.user.id),
          eq(reminders.isCompleted, false),
          lte(reminders.scheduledDate, sevenDaysFromNow)
        )
      );

    const activePlants = await db
      .select()
      .from(plantingHistory)
      .where(
        and(
          eq(plantingHistory.userId, session.user.id),
          eq(plantingHistory.isCompleted, false)
        )
      );

    const recentRems = await db
      .select()
      .from(reminders)
      .where(
        and(
          eq(reminders.userId, session.user.id),
          eq(reminders.reminderType, "watering"),
          gte(reminders.createdAt, twentyFourHoursAgo)
        )
      );

    const autoReminders: AutoReminder[] = activePlants
      .filter((p) => !recentRems.some((r) => r.plantingHistoryId === p.id))
      .map((p) => ({
        id: `auto-reminder-${p.id}-watering`,
        reminderType: "watering",
        message: `Siram tanaman ${p.cropName} Anda`,
        scheduledDate: now,
        cropName: p.cropName,
        isCompleted: false,
        plantingHistoryId: p.id,
      }));

    return NextResponse.json<(DbReminder | AutoReminder)[]>([
      ...dbReminders,
      ...autoReminders,
    ]);
  } catch (e) {
    console.error("Reminders fetch error:", e);
    return NextResponse.json({ error: "Failed to fetch reminders" }, { status: 500 });
  }
}