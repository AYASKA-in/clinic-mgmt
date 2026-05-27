"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { StatusBadge } from "@/components/features/status-badge"
import { formatTime } from "@/lib/utils"
import { ChevronLeft, ChevronRight } from "lucide-react"

type Slot = {
  id: string
  startTime: Date
  endTime: Date
  status: string
  doctor: { name: string } | null
  patient: { name: string; phone: string } | null
  patientId: string | null
  visit: { id: string; visitStatus: string } | null
}

const ITEMS_PER_PAGE = 10

export function AppointmentSlotsTable({ slots }: { slots: Slot[] }) {
  const [page, setPage] = useState(1)

  const totalPages = Math.max(1, Math.ceil(slots.length / ITEMS_PER_PAGE))
  const safePage = Math.min(page, totalPages)

  const pageSlots = useMemo(() => {
    const start = (safePage - 1) * ITEMS_PER_PAGE
    return slots.slice(start, start + ITEMS_PER_PAGE)
  }, [slots, safePage])

  if (slots.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Available Slots</CardTitle>
        <CardDescription>
          {slots.length} free slot{slots.length !== 1 ? "s" : ""} today across all practitioners
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left font-medium text-muted-foreground px-4 py-3">Time</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3">Practitioner</th>
                <th className="text-right font-medium text-muted-foreground px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {pageSlots.map((slot) => (
                <tr key={slot.id} className="border-b border-border/50 hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium">
                    {formatTime(slot.startTime)} – {formatTime(slot.endTime)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{slot.doctor?.name || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <StatusBadge status="free" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1 px-4 py-3 border-t border-border">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              disabled={safePage <= 1}
              onClick={() => setPage(safePage - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Button
                key={p}
                variant={p === safePage ? "default" : "ghost"}
                size="icon"
                className="size-8 text-xs"
                onClick={() => setPage(p)}
              >
                {p}
              </Button>
            ))}
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              disabled={safePage >= totalPages}
              onClick={() => setPage(safePage + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
