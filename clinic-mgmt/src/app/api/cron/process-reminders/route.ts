import { processPendingReminders } from "@/lib/notifications/dispatch"

export async function GET(request: Request) {
  const secret = request.headers.get("x-cron-secret") || request.headers.get("authorization")?.replace("Bearer ", "")
  if (secret !== process.env.CRON_SECRET) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await processPendingReminders()
    return Response.json({ ok: true, ...result })
  } catch (err: any) {
    return Response.json({ ok: false, error: err.message }, { status: 500 })
  }
}
