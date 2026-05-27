"use client"

import { useState } from "react"
import {
  Ellipsis,
  Calendar,
  CheckCircle2,
  XCircle,
  FileText,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { StatusBadge } from "@/components/features/status-badge"
import { formatDate, formatTime } from "@/lib/utils"
import { updatePlanSession } from "@/lib/actions"
import { toast } from "sonner"

type Session = {
  id: string
  sessionNumber: number
  stageNo: number
  sittingNo: number
  scheduledDate: Date
  status: string
  notes: string | null
}

const statusOptions = [
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no_show", label: "No Show" },
]

export function SessionTimeline({ sessions }: { sessions: Session[] }) {
  const [editing, setEditing] = useState<Session | null>(null)
  const [saving, setSaving] = useState(false)
  const [sessionsState, setSessionsState] = useState(sessions)

  async function handleSave() {
    if (!editing) return
    setSaving(true)
    try {
      const sd = editing.scheduledDate instanceof Date ? editing.scheduledDate : new Date(editing.scheduledDate)
      await updatePlanSession(editing.id, {
        scheduledDate: sd.toISOString().split("T")[0],
        sessionTime: `${String(sd.getHours()).padStart(2, "0")}:${String(sd.getMinutes()).padStart(2, "0")}`,
        status: editing.status,
        notes: editing.notes,
      })
      setSessionsState((prev) =>
        prev.map((s) => (s.id === editing.id ? editing : s))
      )
      toast.success("Session updated.")
      setEditing(null)
    } catch {
      toast.error("Failed to update session.")
    } finally {
      setSaving(false)
    }
  }

  function quickAction(sessionId: string, status: string) {
    setSessionsState((prev) =>
      prev.map((s) =>
        s.id === sessionId ? { ...s, status } : s
      )
    )
    updatePlanSession(sessionId, { status }).catch(() => {
      toast.error("Failed to update session.")
      setSessionsState((prev) =>
        prev.map((s) =>
          s.id === sessionId ? { ...s, status: s.status } : s
        )
      )
    })
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {sessionsState.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No sessions scheduled.
            </p>
          ) : (
            <div className="space-y-0">
              {sessionsState.map((session, idx) => (
                <div key={session.id}>
                  {idx > 0 && (
                    <div className="h-px bg-border" />
                  )}
                  <div className="flex items-center gap-3 py-2.5 text-sm">
                    <div className="flex items-center justify-center size-7 rounded-full bg-muted text-xs font-medium shrink-0">
                      {session.sessionNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">
                        Stage {session.stageNo} &middot; Sitting {session.sittingNo}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(session.scheduledDate)} at {formatTime(session.scheduledDate)}
                      </p>
                      {session.notes && (
                        <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">
                          {session.notes}
                        </p>
                      )}
                    </div>
                    <StatusBadge status={session.status} />
                    <DropdownMenu>
                      <DropdownMenuTrigger className="flex items-center justify-center size-7 shrink-0 rounded-md hover:bg-accent outline-hidden">
                        <Ellipsis className="size-3.5" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => setEditing({ ...session })}>
                          <Calendar className="size-3.5 mr-2" />
                          Edit Schedule
                        </DropdownMenuItem>
                        {session.status !== "completed" && (
                          <DropdownMenuItem onClick={() => quickAction(session.id, "completed")}>
                            <CheckCircle2 className="size-3.5 mr-2 text-emerald-500" />
                            Mark Completed
                          </DropdownMenuItem>
                        )}
                        {session.status !== "cancelled" && session.status !== "completed" && (
                          <DropdownMenuItem onClick={() => quickAction(session.id, "cancelled")}>
                            <XCircle className="size-3.5 mr-2 text-destructive" />
                            Cancel Session
                          </DropdownMenuItem>
                        )}
                        {session.notes && (
                          <DropdownMenuItem onClick={() => setEditing({ ...session })}>
                            <FileText className="size-3.5 mr-2" />
                            View Notes
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(open) => { if (!open) setEditing(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Session {editing?.sessionNumber} &mdash; Stage {editing?.stageNo}, Sitting {editing?.sittingNo}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="edit-date">Scheduled Date</Label>
                  <Input
                    id="edit-date"
                    type="date"
                    value={editing.scheduledDate instanceof Date
                      ? editing.scheduledDate.toISOString().split("T")[0]
                      : editing.scheduledDate
                    }
                    onChange={(e) => {
                      const cur = editing.scheduledDate instanceof Date ? editing.scheduledDate : new Date()
                      const [h, m] = [cur.getHours(), cur.getMinutes()]
                      const d = new Date(e.target.value + "T00:00:00")
                      d.setHours(h, m, 0, 0)
                      setEditing({ ...editing, scheduledDate: d })
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-time">Time</Label>
                  <Input
                    id="edit-time"
                    type="time"
                    value={editing.scheduledDate instanceof Date
                      ? `${String(editing.scheduledDate.getHours()).padStart(2, "0")}:${String(editing.scheduledDate.getMinutes()).padStart(2, "0")}`
                      : "10:00"
                    }
                    onChange={(e) => {
                      const cur = editing.scheduledDate instanceof Date ? new Date(editing.scheduledDate) : new Date()
                      const [h, m] = e.target.value.split(":").map(Number)
                      cur.setHours(h, m, 0, 0)
                      setEditing({ ...editing, scheduledDate: cur })
                    }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={editing.status}
                  onValueChange={(v) => setEditing({ ...editing, status: v ?? "scheduled" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea
                  id="edit-notes"
                  value={editing.notes ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, notes: e.target.value || null })
                  }
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
