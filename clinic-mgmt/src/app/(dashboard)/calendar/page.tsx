"use client"

import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Calendar,
  Clock,
  AlertTriangle,
  User,
  X,
  Check,
  Plus,
  ChevronLeft,
  ChevronRight,
  Phone,
  MessageSquare,
  Search,
  SlidersHorizontal,
  Loader2,
  CalendarRange,
  List,
} from "lucide-react"
import { cn, formatDate, formatDateISO, formatTime, getInitials } from "@/lib/utils"
import { toast } from "sonner"
import { searchPatients, getScheduleSlots, bookAppointmentSlot, getDoctors, arrivePatient, completeVisit } from "@/lib/actions"

type Appointment = {
  id: string
  patientName: string
  patientId: string
  practitionerId?: string
  time: string
  endTime: string
  date: string
  duration: number
  status: "confirmed" | "arrived" | "overdue" | "blocked" | "completed" | "cancelled"
  practitioner: string
  room: string
  reason: string
  phone: string
  visitId?: string
  visitStatus?: string
}

type OnlineRequest = {
  id: string
  patientName: string
  phone: string
  reason: string
  requestedDate: string
  requestedTime: string
}

type PatientSearchResult = {
  id: string
  name: string
  phone: string
}

const HOUR_HEIGHT = 72
const START_HOUR = 8
const END_HOUR = 18
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"]

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-primary-fixed border-primary-fixed",
  arrived: "bg-secondary-container border-secondary-container",
  overdue: "bg-error-container border-error-container",
  blocked: "bg-surface-variant border-surface-variant",
  completed: "bg-muted border-muted",
  cancelled: "bg-destructive/10 border-destructive/10",
}

const STATUS_TEXT_COLORS: Record<string, string> = {
  confirmed: "text-primary-fixed-foreground",
  arrived: "text-secondary-container-foreground",
  overdue: "text-error-container-foreground",
  blocked: "text-surface-variant-foreground",
  completed: "text-muted-foreground",
  cancelled: "text-destructive",
}

const initialAppointments: Appointment[] = [
  {
    id: "1",
    patientName: "Alice Johnson",
    patientId: "p1",
    time: "09:00",
    endTime: "09:45",
    date: "",
    duration: 45,
    status: "confirmed",
    practitioner: "Dr. Smith",
    room: "Room 1",
    reason: "Follow-up - Lower back pain",
    phone: "555-0101",
  },
  {
    id: "2",
    patientName: "Bob Martinez",
    patientId: "p2",
    time: "09:30",
    endTime: "10:00",
    date: "",
    duration: 30,
    status: "arrived",
    practitioner: "Dr. Smith",
    room: "Room 2",
    reason: "Initial consultation - Migraines",
    phone: "555-0102",
  },
  {
    id: "3",
    patientName: "Carol Chen",
    patientId: "p3",
    time: "10:00",
    endTime: "11:00",
    date: "",
    duration: 60,
    status: "confirmed",
    practitioner: "Dr. Lee",
    room: "Room 1",
    reason: "Treatment - Neck stiffness",
    phone: "555-0103",
  },
  {
    id: "4",
    patientName: "David Park",
    patientId: "p4",
    time: "11:00",
    endTime: "11:30",
    date: "",
    duration: 30,
    status: "overdue",
    practitioner: "Dr. Smith",
    room: "Room 3",
    reason: "Follow-up - Knee pain",
    phone: "555-0104",
  },
  {
    id: "5",
    patientName: "Elena Rodriguez",
    patientId: "p5",
    time: "13:00",
    endTime: "14:00",
    date: "",
    duration: 60,
    status: "confirmed",
    practitioner: "Dr. Lee",
    room: "Room 2",
    reason: "Initial consultation - Anxiety",
    phone: "555-0105",
  },
  {
    id: "6",
    patientName: "Frank Wilson",
    patientId: "p6",
    time: "14:00",
    endTime: "14:30",
    date: "",
    duration: 30,
    status: "blocked",
    practitioner: "Dr. Smith",
    room: "Room 1",
    reason: "Blocked - Admin",
    phone: "555-0106",
  },
]

const initialOnlineRequests: OnlineRequest[] = [
  {
    id: "r1",
    patientName: "Grace Kim",
    phone: "555-0201",
    reason: "Chronic shoulder pain",
    requestedDate: "2026-05-27",
    requestedTime: "10:00",
  },
  {
    id: "r2",
    patientName: "Henry Brown",
    phone: "555-0202",
    reason: "Sleep issues / Insomnia",
    requestedDate: "2026-05-28",
    requestedTime: "14:30",
  },
  {
    id: "r3",
    patientName: "Ivy Taylor",
    phone: "555-0203",
    reason: "Digestive issues",
    requestedDate: "2026-05-27",
    requestedTime: "11:00",
  },
]

const rooms = ["Room 1", "Room 2", "Room 3", "Room 4"]

function getWeekDates(date: Date): Date[] {
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(date)
  monday.setDate(date.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function getMonthGrid(date: Date): (Date | null)[][] {
  const year = date.getFullYear()
  const month = date.getMonth()
  const firstDay = new Date(year, month, 1)
  const startDay = firstDay.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const weeks: (Date | null)[][] = []
  let currentWeek: (Date | null)[] = []
  for (let i = 0; i < startDay; i++) {
    currentWeek.push(null)
  }
  for (let d = 1; d <= daysInMonth; d++) {
    currentWeek.push(new Date(year, month, d))
    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null)
    weeks.push(currentWeek)
  }
  return weeks
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function formatMonthYear(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

function formatDayHeader(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
}

function formatDayHeaderShort(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short", day: "numeric" })
}

function getMinutesFromMidnight(timeStr: string): number {
  if (!timeStr || timeStr === "\u2014") return 0
  const cleaned = timeStr.replace(/\s*[APap][Mm]/g, "").trim()
  const isPM = /pm/i.test(timeStr)
  const isAM = /am/i.test(timeStr)
  const [h, m] = cleaned.split(":").map(Number)
  let hours = h || 0
  if (isPM && hours < 12) hours += 12
  if (isAM && hours === 12) hours = 0
  return hours * 60 + (m || 0)
}

function timeToTop(timeStr: string): number {
  const totalMinutes = getMinutesFromMidnight(timeStr)
  if (isNaN(totalMinutes)) return 0
  const startMinutes = START_HOUR * 60
  return ((totalMinutes - startMinutes) / 60) * HOUR_HEIGHT
}

function isToday(date: Date): boolean {
  return isSameDay(date, new Date())
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<"day" | "week" | "month">("week")
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments)
  const [loadingSlots, setLoadingSlots] = useState(true)
  const [onlineRequests, setOnlineRequests] = useState<OnlineRequest[]>(initialOnlineRequests)
  const [practitionerFilter, setPractitionerFilter] = useState<string>("")
  const [roomFilter, setRoomFilter] = useState<string>("all")
  const [newApptOpen, setNewApptOpen] = useState(false)
  const [newApptDate, setNewApptDate] = useState("")
  const [newApptTime, setNewApptTime] = useState("09:00")
  const [newApptDuration, setNewApptDuration] = useState("45")
  const [newApptReason, setNewApptReason] = useState("")
  const [newApptPatientSearch, setNewApptPatientSearch] = useState("")
  const [newApptPatientId, setNewApptPatientId] = useState("")
  const [newApptPatientName, setNewApptPatientName] = useState("")
  const [newApptPatientPhone, setNewApptPatientPhone] = useState("")
  const [newApptDoctorId, setNewApptDoctorId] = useState("")
  const [newApptOverride, setNewApptOverride] = useState(false)
  const [newApptOverrideReason, setNewApptOverrideReason] = useState("")
  const [searchResults, setSearchResults] = useState<PatientSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; time: string } | null>(null)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [doctorsList, setDoctorsList] = useState<{ id: string; name: string }[]>([])

  const visibleRange = useMemo(() => {
    const d = currentDate
    if (view === "month") {
      const start = new Date(d.getFullYear(), d.getMonth(), 1)
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)
      return { dateFrom: start, dateTo: end }
    }
    const start = new Date(d)
    start.setDate(start.getDate() - start.getDay())
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + (view === "week" ? 7 : 2))
    end.setHours(23, 59, 59, 999)
    return { dateFrom: start, dateTo: end }
  }, [currentDate, view])

  useEffect(() => {
    async function loadSlots() {
      setLoadingSlots(true)
      try {
        const [slots, doctors] = await Promise.all([
          getScheduleSlots(visibleRange),
          getDoctors(),
        ])
        const docs = doctors.map((d: any) => ({ id: d.id, name: d.name }))
        setDoctorsList(docs)
        setPractitionerFilter(docs[0]?.id || "")

        const mapped: Appointment[] = (slots as any[])
          .filter((s) => s.status === "booked" || s.status === "arrived" || s.status === "completed")
          .map((s) => ({
            id: s.id,
            patientName: s.patient?.name || "Patient",
            patientId: s.patientId || "",
            time: formatTime(s.startTime),
            endTime: formatTime(s.endTime),
            date: formatDateISO(s.startTime),
            duration: Math.round((new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 60000),
            status: s.visit?.visitStatus === "arrived" ? "arrived" as const
              : s.visit?.visitStatus === "completed" ? "completed" as const
              : s.status === "arrived" ? "arrived" as const
              : s.status === "completed" ? "completed" as const
              : "confirmed" as const,
            practitioner: s.doctor?.name || "Unknown",
            practitionerId: s.doctorId,
            room: "Room 1",
            reason: s.overrideReason || "Appointment",
            phone: s.patient?.phone || "",
            visitId: s.visit?.id,
            visitStatus: s.visit?.visitStatus,
          }))
        if (mapped.length > 0) setAppointments(mapped)
      } catch {
        // fallback to initial mock data
      } finally {
        setLoadingSlots(false)
      }
    }
    loadSlots()
  }, [visibleRange])

  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate])
  const monthGrid = useMemo(() => getMonthGrid(currentDate), [currentDate])
  const todayStr = formatDateISO(new Date())

  const navigate = useCallback((direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const d = new Date(prev)
      if (view === "month") {
        d.setMonth(d.getMonth() + (direction === "next" ? 1 : -1))
      } else if (view === "week") {
        d.setDate(d.getDate() + (direction === "next" ? 7 : -7))
      } else {
        d.setDate(d.getDate() + (direction === "next" ? 1 : -1))
      }
      return d
    })
  }, [view])

  const goToToday = useCallback(() => {
    setCurrentDate(new Date())
  }, [])

  const handleSlotClick = useCallback((date: string, time: string) => {
    setSelectedSlot({ date, time })
    setNewApptDate(date)
    setNewApptTime(time)
    setNewApptOpen(true)
  }, [])

  const handlePatientSearch = useCallback(async (value: string) => {
    setNewApptPatientSearch(value)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    if (value.length < 2) {
      setSearchResults([])
      return
    }
    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const results = await searchPatients(value)
        setSearchResults(results.map((r: any) => ({ id: r.id, name: r.name, phone: r.phone })))
      } catch {
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
  }, [])

  const selectPatient = useCallback((id: string, name: string, phone: string) => {
    setNewApptPatientId(id)
    setNewApptPatientName(name)
    setNewApptPatientPhone(phone)
    setNewApptPatientSearch(name)
    setSearchResults([])
  }, [])

  const handleCreateAppointment = useCallback(async () => {
    if (!newApptPatientId || !newApptDate || !newApptTime) {
      toast.error("Please fill in all required fields")
      return
    }
    const startMinutes = getMinutesFromMidnight(newApptTime)
    const dur = parseInt(newApptDuration)
    const endMinutes = startMinutes + dur
    const endH = Math.floor(endMinutes / 60)
    const endM = endMinutes % 60
    const endTime = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`
    const tz = "+05:30"
    const startISO = `${newApptDate}T${newApptTime}:00${tz}`
    const endISO = `${newApptDate}T${endTime}:00${tz}`

    try {
      const doctorId = newApptDoctorId || (doctorsList.length > 0 ? doctorsList[0].id : "")
      if (!doctorId) {
        toast.error("No doctors available. Please add a doctor first.")
        return
      }
      const result = await bookAppointmentSlot({
        doctorId,
        startTime: startISO,
        endTime: endISO,
        patientId: newApptPatientId,
        reason: newApptReason,
        overrideConflict: newApptOverride,
      })

      if ("error" in result) {
        toast.error(result.error)
        return
      }

      const doctor = doctorsList.find((d) => d.id === doctorId)
      const newAppt: Appointment = {
        id: result.id,
        patientName: newApptPatientName,
        patientId: newApptPatientId,
        time: newApptTime,
        endTime,
        date: newApptDate,
        duration: dur,
        status: "confirmed",
        practitioner: doctor?.name || doctorsList[0]?.name || "Unknown",
        practitionerId: doctorId,
        room: rooms[0],
        reason: newApptReason || "Appointment",
        phone: newApptPatientPhone,
      }

      setAppointments((prev) => [...prev, newAppt])
      setNewApptOpen(false)
      resetNewApptForm()
      toast.success("Appointment created. A 24h reminder has been scheduled.")
    } catch (err: any) {
      toast.error(err.message || "Failed to create appointment")
    }
  }, [newApptPatientId, newApptPatientName, newApptDate, newApptTime, newApptDuration, newApptReason, newApptOverride, newApptPatientPhone, newApptDoctorId, doctorsList])

  const resetNewApptForm = useCallback(() => {
    setNewApptPatientId("")
    setNewApptPatientName("")
    setNewApptPatientSearch("")
    setNewApptReason("")
    setNewApptOverride(false)
    setNewApptOverrideReason("")
    setSearchResults([])
    setSelectedSlot(null)
  }, [])

  const handleAcceptRequest = useCallback((id: string) => {
    setOnlineRequests((prev) => prev.filter((r) => r.id !== id))
    toast.success("Request accepted - appointment created")
  }, [])

  const handleDeclineRequest = useCallback((id: string) => {
    setOnlineRequests((prev) => prev.filter((r) => r.id !== id))
    toast.success("Request declined")
  }, [])

  const handleArrivePatient = useCallback(async (slotId: string) => {
    const result = await arrivePatient(slotId)
    if ("error" in result) {
      toast.error(result.error)
      return
    }
    setAppointments((prev) =>
      prev.map((a) => (a.id === slotId ? { ...a, status: "arrived" as const, visitStatus: "arrived" } : a))
    )
    toast.success("Patient marked as arrived")
  }, [])

  const handleCompleteVisit = useCallback(async (visitId: string, slotId: string) => {
    const result = await completeVisit(visitId)
    if ("error" in result) {
      toast.error(result.error)
      return
    }
    setAppointments((prev) =>
      prev.map((a) => (a.id === slotId ? { ...a, status: "completed" as const, visitStatus: "completed" } : a))
    )
    toast.success("Visit completed — plan progress updated")
  }, [])

  const filteredAppointments = useMemo(() => {
    return appointments.filter((a) => {
      if (practitionerFilter && a.practitionerId !== practitionerFilter) return false
      if (roomFilter !== "all" && a.room !== roomFilter) return false
      return true
    })
  }, [appointments, practitionerFilter, roomFilter])

  const getAppointmentsForDay = useCallback(
    (dateStr: string) => {
      return filteredAppointments.filter((a) => {
        if (a.date) return a.date === dateStr
        return false
      })
    },
    [filteredAppointments]
  )

  const getDayDateStr = useCallback((dayIndex: number): string => {
    if (view === "week") return formatDateISO(weekDates[dayIndex])
    if (view === "day") return formatDateISO(currentDate)
    return formatDateISO(new Date())
  }, [view, weekDates, currentDate])

  const getAppointmentsForDayByIndex = useCallback(
    (dayIndex: number): Appointment[] => {
      const dateStr = getDayDateStr(dayIndex)
      return filteredAppointments.filter((a) => {
        if (a.date) return a.date === dateStr
        return !a.date && dayIndex === 0
      })
    },
    [filteredAppointments, getDayDateStr]
  )

  const hasAppointmentsOnDate = useCallback(
    (date: Date): boolean => {
      const ds = formatDateISO(date)
      return appointments.some((a) => a.date === ds)
    },
    [appointments]
  )

  const [currentTimePos, setCurrentTimePos] = useState(0)
  const [showCurrentTime, setShowCurrentTime] = useState(false)

  useEffect(() => {
    function updateTimeLine() {
      const now = new Date()
      const minutes = now.getHours() * 60 + now.getMinutes()
      const startMinutes = START_HOUR * 60
      if (minutes >= startMinutes && minutes <= END_HOUR * 60) {
        setCurrentTimePos(((minutes - startMinutes) / 60) * HOUR_HEIGHT)
        setShowCurrentTime(true)
      } else {
        setShowCurrentTime(false)
      }
    }
    updateTimeLine()
    const interval = setInterval(updateTimeLine, 60000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
            <div className="flex items-center">
              <Button variant="ghost" size="icon-sm" onClick={() => navigate("prev")}>
                <ChevronLeft className="size-4" />
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={() => navigate("next")}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <h2 className="text-lg font-semibold ml-1">{formatMonthYear(currentDate)}</h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-border overflow-hidden">
              <Button
                variant={view === "day" ? "default" : "ghost"}
                size="sm"
                className="rounded-none"
                onClick={() => setView("day")}
              >
                <Calendar className="size-3.5 mr-1" />
                Day
              </Button>
              <Button
                variant={view === "week" ? "default" : "ghost"}
                size="sm"
                className="rounded-none"
                onClick={() => setView("week")}
              >
                <CalendarRange className="size-3.5 mr-1" />
                Week
              </Button>
              <Button
                variant={view === "month" ? "default" : "ghost"}
                size="sm"
                className="rounded-none"
                onClick={() => setView("month")}
              >
                <List className="size-3.5 mr-1" />
                Month
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 px-4 py-1.5 border-b border-border bg-muted/20">
          <span className="text-[11px] font-medium text-muted-foreground">Legend:</span>
          {[
            { label: "Booked", color: "bg-primary-fixed border-primary-fixed" },
            { label: "Arrived", color: "bg-secondary-container border-secondary-container" },
            { label: "Completed", color: "bg-muted border-muted" },
            { label: "Overdue", color: "bg-error-container border-error-container" },
            { label: "Blocked", color: "bg-surface-variant border-surface-variant" },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1">
              <div className={cn("size-2.5 rounded-sm border", l.color)} />
              <span className="text-[10px] text-muted-foreground">{l.label}</span>
            </div>
          ))}
        </div>
        <div className="flex-1 overflow-auto">
          {view === "week" && (
            <div className="flex min-w-[600px]">
              <div className="w-14 shrink-0 border-r border-border">
                <div className="h-12 border-b border-border" />
                {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => (
                  <div
                    key={i}
                    className="border-b border-border text-xs text-muted-foreground text-right pr-2 relative"
                    style={{ height: HOUR_HEIGHT }}
                  >
                    <span className="absolute -top-2 right-2">
                      {String(START_HOUR + i).padStart(2, "0")}:00
                    </span>
                  </div>
                ))}
                <div style={{ height: HOUR_HEIGHT }} />
              </div>

              {weekDates.map((day, dayIndex) => (
                <div key={dayIndex} className="flex-1 min-w-0 border-r border-border last:border-r-0">
                  <div
                    className={cn(
                      "h-12 border-b border-border flex flex-col items-center justify-center",
                      isToday(day) && "bg-primary/5"
                    )}
                  >
                    <span className="text-xs font-medium text-muted-foreground">
                      {DAYS[dayIndex]}
                    </span>
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        isToday(day) && "text-primary"
                      )}
                    >
                      {day.getDate()}
                    </span>
                  </div>
                  <div className="relative" style={{ height: (END_HOUR - START_HOUR) * HOUR_HEIGHT }}>
                    {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => (
                      <div
                        key={i}
                        className="border-b border-border/50 cursor-pointer hover:bg-muted/30 transition-colors"
                        style={{ height: HOUR_HEIGHT }}
                        onClick={() => {
                          const timeStr = `${String(START_HOUR + i).padStart(2, "0")}:00`
                          handleSlotClick(formatDateISO(day), timeStr)
                        }}
                      />
                    ))}
                    {isToday(day) && showCurrentTime && (
                      <div
                        className="absolute left-0 right-0 z-10 pointer-events-none"
                        style={{ top: currentTimePos }}
                      >
                        <div className="flex items-center">
                          <div className="size-2 rounded-full bg-destructive" />
                          <div className="flex-1 h-px bg-destructive" />
                        </div>
                      </div>
                    )}
                    {getAppointmentsForDayByIndex(dayIndex).map((appt) => {
                      const top = timeToTop(appt.time)
                      const endM = getMinutesFromMidnight(appt.endTime)
                      const startM = getMinutesFromMidnight(appt.time)
                      const height = ((endM - startM) / 60) * HOUR_HEIGHT
                      return (
                        <AppointmentBlock
                          key={appt.id}
                          appointment={appt}
                          top={top}
                          height={height}
                          onArrive={handleArrivePatient}
                          onComplete={handleCompleteVisit}
                        />
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {view === "day" && (
            <div className="flex min-w-[400px]">
              <div className="w-14 shrink-0 border-r border-border">
                <div className="h-12 border-b border-border" />
                {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => (
                  <div
                    key={i}
                    className="border-b border-border text-xs text-muted-foreground text-right pr-2 relative"
                    style={{ height: HOUR_HEIGHT }}
                  >
                    <span className="absolute -top-2 right-2">
                      {String(START_HOUR + i).padStart(2, "0")}:00
                    </span>
                  </div>
                ))}
                <div style={{ height: HOUR_HEIGHT }} />
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className={cn(
                    "h-12 border-b border-border flex flex-col items-center justify-center",
                    isToday(currentDate) && "bg-primary/5"
                  )}
                >
                  <span className="text-xs font-medium text-muted-foreground">
                    {currentDate.toLocaleDateString("en-US", { weekday: "long" })}
                  </span>
                  <span
                    className={cn("text-sm font-semibold", isToday(currentDate) && "text-primary")}
                  >
                    {currentDate.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <div className="relative" style={{ height: (END_HOUR - START_HOUR) * HOUR_HEIGHT }}>
                  {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => (
                    <div
                      key={i}
                      className="border-b border-border/50 cursor-pointer hover:bg-muted/30 transition-colors"
                      style={{ height: HOUR_HEIGHT }}
                      onClick={() => {
                        const timeStr = `${String(START_HOUR + i).padStart(2, "0")}:00`
                        handleSlotClick(formatDateISO(currentDate), timeStr)
                        }}
                      />
                    ))}
                    {showCurrentTime && (
                    <div
                      className="absolute left-0 right-0 z-10 pointer-events-none"
                      style={{ top: currentTimePos }}
                    >
                      <div className="flex items-center">
                        <div className="size-2 rounded-full bg-destructive" />
                        <div className="flex-1 h-px bg-destructive" />
                      </div>
                    </div>
                  )}
                  {getAppointmentsForDayByIndex(0).map((appt) => {
                    const top = timeToTop(appt.time)
                    const endM = getMinutesFromMidnight(appt.endTime)
                    const startM = getMinutesFromMidnight(appt.time)
                    const height = ((endM - startM) / 60) * HOUR_HEIGHT
                    return (
                      <AppointmentBlock
                        key={appt.id}
                        appointment={appt}
                        top={top}
                        height={height}
                        onArrive={handleArrivePatient}
                        onComplete={handleCompleteVisit}
                      />
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {view === "month" && (
            <div className="p-3">
              <div className="grid grid-cols-7 text-center text-xs font-medium text-muted-foreground mb-1">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div key={d} className="py-1.5 text-[11px]">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 border-l border-t border-border">
                {monthGrid.flat().map((date, i) => {
                  const dayAppts = date ? getAppointmentsForDay(formatDateISO(date)) : []
                  return (
                    <div
                      key={i}
                      className={cn(
                        "min-h-[88px] border-r border-b border-border p-1 transition-colors",
                        date && isToday(date) && "bg-primary/5 ring-1 ring-inset ring-primary/20",
                        date && !isToday(date) && "hover:bg-muted/30 cursor-pointer",
                        !date && "bg-muted/20"
                      )}
                      onClick={() => {
                        if (date) {
                          setCurrentDate(date)
                          setView("day")
                        }
                      }}
                    >
                      {date && (
                        <>
                          <div className="flex items-center justify-between mb-1">
                            <span
                              className={cn(
                                "inline-flex items-center justify-center size-5 text-[11px] font-medium rounded-full leading-none",
                                isToday(date) && "bg-primary text-primary-foreground size-5"
                              )}
                            >
                              {date.getDate()}
                            </span>
                            {dayAppts.length > 0 && (
                              <span className="text-[10px] text-muted-foreground">
                                {dayAppts.length}
                              </span>
                            )}
                          </div>
                          <div className="space-y-0.5">
                            {dayAppts.slice(0, 3).map((a) => (
                              <div
                                key={a.id}
                                className={cn(
                                  "text-[10px] truncate rounded px-1 py-0.5 leading-tight font-medium",
                                  a.status === "confirmed" && "bg-primary/10 text-primary-fixed-foreground",
                                  a.status === "arrived" && "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
                                  a.status === "overdue" && "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300",
                                  a.status === "completed" && "bg-muted text-muted-foreground",
                                  a.status === "blocked" && "bg-surface-variant text-surface-variant-foreground"
                                )}
                              >
                                {a.patientName}
                              </div>
                            ))}
                            {dayAppts.length > 3 && (
                              <span className="text-[10px] text-muted-foreground block pl-1">
                                +{dayAppts.length - 3} more
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

        </div>
      </div>

      <aside className="hidden xl:flex flex-col w-72 border-l border-border overflow-y-auto p-4 gap-4">
        <Card>
          <CardHeader className="p-3 pb-0">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <SlidersHorizontal className="size-3.5" />
              Quick Filter
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Practitioner</Label>
               <Select value={practitionerFilter} onValueChange={(v) => v && setPractitionerFilter(v)}>
                <SelectTrigger className="h-8 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {doctorsList.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Room</Label>
               <Select value={roomFilter} onValueChange={(v) => v && setRoomFilter(v)}>
                <SelectTrigger className="h-8 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Rooms</SelectItem>
                  {rooms.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-3 pb-0 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <MessageSquare className="size-3.5" />
              Online Requests
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {onlineRequests.length}
            </Badge>
          </CardHeader>
          <CardContent className="p-3 space-y-3">
            {onlineRequests.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                No pending requests
              </p>
            )}
            {onlineRequests.map((req) => (
              <div key={req.id} className="rounded-lg border border-border p-2.5 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium">{req.patientName}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Phone className="size-3" />
                      {req.phone}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {req.reason}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Calendar className="size-3" />
                  {req.requestedDate}
                  <Clock className="size-3 ml-1" />
                  {req.requestedTime}
                </div>
                <div className="flex gap-1.5 pt-1">
                  <Button
                    size="sm"
                    className="h-7 flex-1 text-xs gap-1"
                    onClick={() => handleAcceptRequest(req.id)}
                  >
                    <Check className="size-3" />
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 flex-1 text-xs gap-1"
                    onClick={() => handleDeclineRequest(req.id)}
                  >
                    <X className="size-3" />
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </aside>

      <Dialog open={newApptOpen} onOpenChange={(open) => { if (!open) resetNewApptForm(); setNewApptOpen(open) }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>New Appointment</DialogTitle>
            <DialogDescription>
              {selectedSlot
                ? `Booking for ${selectedSlot.date} at ${selectedSlot.time}`
                : "Create a new appointment slot"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Patient</Label>
              <div className="relative mt-1">
                <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Search patient by name or phone..."
                  value={newApptPatientSearch}
                  onChange={(e) => handlePatientSearch(e.target.value)}
                />
                {searching && (
                  <Loader2 className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
              </div>
              {searchResults.length > 0 && (
                <div className="mt-1 rounded-md border border-border bg-popover shadow-md max-h-32 overflow-auto">
                  {searchResults.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2"
                      onClick={() => selectPatient(r.id, r.name, r.phone)}
                    >
                      <User className="size-3.5 text-muted-foreground shrink-0" />
                      <span className="font-medium">{r.name}</span>
                      <span className="text-xs text-muted-foreground">{r.phone}</span>
                    </button>
                  ))}
                </div>
              )}
              {newApptPatientId && !searching && (
                <div className="mt-1.5 flex items-center gap-2 text-xs text-emerald-600">
                  <Check className="size-3.5" />
                  Selected: {newApptPatientName}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Practitioner</Label>
              <Select value={newApptDoctorId} onValueChange={(v) => v && setNewApptDoctorId(v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={doctorsList.length > 0 ? "Select practitioner..." : "No doctors available"} />
                </SelectTrigger>
                <SelectContent>
                  {doctorsList.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  className="mt-1 h-9"
                  value={newApptDate}
                  onChange={(e) => setNewApptDate(e.target.value)}
                />
              </div>
              <div>
                <Label>Time</Label>
                <Input
                  type="time"
                  className="mt-1 h-9"
                  value={newApptTime}
                  onChange={(e) => setNewApptTime(e.target.value)}
                />
              </div>
              <div>
                <Label>Duration</Label>
                 <Select value={newApptDuration} onValueChange={(v) => v && setNewApptDuration(v)}>
                  <SelectTrigger className="mt-1 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="45">45 min</SelectItem>
                    <SelectItem value="60">60 min</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Reason / Notes</Label>
              <Textarea
                className="mt-1 resize-none h-20"
                placeholder="Brief description..."
                value={newApptReason}
                onChange={(e) => setNewApptReason(e.target.value)}
              />
            </div>

            <div className="space-y-2 rounded-lg border border-border p-3">
              <div className="flex items-start gap-2">
                <Checkbox
                  id="override"
                  checked={newApptOverride}
                  onCheckedChange={(v) => setNewApptOverride(v === true)}
                />
                <div>
                  <Label htmlFor="override" className="text-sm font-medium">
                    Override conflict
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Force schedule even if time slot overlaps with another appointment.
                  </p>
                </div>
              </div>
              {newApptOverride && (
                <div>
                  <Label className="text-xs">Override reason</Label>
                  <Input
                    className="mt-1 h-8 text-sm"
                    placeholder="Reason for overriding..."
                    value={newApptOverrideReason}
                    onChange={(e) => setNewApptOverrideReason(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { resetNewApptForm(); setNewApptOpen(false) }}>
              Cancel
            </Button>
            <Button onClick={handleCreateAppointment} className="gap-1.5">
              <Plus className="size-4" />
              Create Appointment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AppointmentBlock({
  appointment,
  top,
  height,
  onArrive,
  onComplete,
}: {
  appointment: Appointment
  top: number
  height: number
  onArrive?: (slotId: string) => void
  onComplete?: (visitId: string, slotId: string) => void
}) {
  const cardH = Math.max(height, 20)
  const isShort = cardH < 38
  const isMedium = cardH >= 38 && cardH < 56
  return (
    <div
      className={cn(
        "absolute left-0.5 right-0.5 rounded border overflow-hidden cursor-pointer hover:opacity-90 transition-opacity z-20 group",
        STATUS_COLORS[appointment.status] || "bg-muted border-muted"
      )}
      style={{ top, height: cardH }}
    >
      <div className={cn(
        "flex flex-col h-full",
        isShort ? "px-1.5 py-0.5" : "px-2 py-1"
      )}>
        <div className="flex items-center justify-between gap-1 min-w-0">
          <span className={cn(
            "truncate font-bold",
            isShort ? "text-[11px]" : "text-xs",
            STATUS_TEXT_COLORS[appointment.status]
          )}>
            {appointment.patientName}
          </span>
          <span className={cn(
            "shrink-0",
            isShort ? "text-[9px]" : "text-[10px]",
            STATUS_TEXT_COLORS[appointment.status]
          )}>
            {appointment.time}
          </span>
        </div>
        {!isShort && (
          <span className={cn(
            "text-[10px] truncate mt-0.5",
            STATUS_TEXT_COLORS[appointment.status]
          )}>
            {appointment.practitioner}
          </span>
        )}
        {!isMedium && !isShort && (
          <span className={cn(
            "text-[10px] truncate mt-0.5",
            STATUS_TEXT_COLORS[appointment.status]
          )}>
            {appointment.reason}
          </span>
        )}
        <div className={cn(
          "flex gap-1",
          isShort ? "mt-auto" : "mt-0.5",
          "opacity-0 group-hover:opacity-100 transition-opacity"
        )}>
          {appointment.status === "confirmed" && appointment.visitStatus !== "arrived" && appointment.visitStatus !== "completed" && onArrive && (
            <button
              className={cn(
                "bg-emerald-500 text-white rounded hover:bg-emerald-600 leading-none",
                isShort ? "text-[9px] px-1 py-0.5" : "text-[10px] px-1.5 py-0.5"
              )}
              onClick={(e) => { e.stopPropagation(); onArrive(appointment.id) }}
            >
              Arrived
            </button>
          )}
          {(appointment.status === "arrived" || appointment.visitStatus === "arrived") && appointment.visitId && onComplete && (
            <button
              className={cn(
                "bg-blue-500 text-white rounded hover:bg-blue-600 leading-none",
                isShort ? "text-[9px] px-1 py-0.5" : "text-[10px] px-1.5 py-0.5"
              )}
              onClick={(e) => { e.stopPropagation(); onComplete(appointment.visitId!, appointment.id) }}
            >
              Complete
            </button>
          )}
          {appointment.status === "completed" && (
            <span className={cn(
              "text-emerald-600 font-medium",
              isShort ? "text-[9px]" : "text-[10px]"
            )}>Done</span>
          )}
        </div>
      </div>
      {appointment.status === "overdue" && (
        <div className="absolute top-0.5 right-0.5">
          <AlertTriangle className="size-2.5 text-destructive" />
        </div>
      )}
    </div>
  )
}
