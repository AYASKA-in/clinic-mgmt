"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import {
  Bell,
  BellRing,
  BellOff,
  Send,
  RotateCw,
  Pause,
  Play,
  Eye,
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  Mail,
  CheckCircle,
  AlertTriangle,
} from "lucide-react"
import { StatusBadge } from "@/components/features/status-badge"
import { cn, formatDateTime, formatDate, getInitials } from "@/lib/utils"
import { REMINDER_CHANNELS, REMINDER_TEMPLATES } from "@/lib/constants"
import { toast } from "sonner"
import { getReminders, createReminder, retryReminder, pauseReminder, searchPatients, processPendingRemindersAction } from "@/lib/actions"
import Link from "next/link"

type ReminderRow = {
  id: string
  patientName: string
  patientId: string
  channel: string
  template: string
  scheduledFor: string
  status: string
}

const channelConfig: Record<string, { icon: any; label: string }> = {
  email: { icon: Mail, label: "Email" },
}

const tabs = [
  { value: "all", label: "All Active" },
  { value: "upcoming", label: "Upcoming" },
  { value: "sent", label: "Sent" },
  { value: "failed", label: "Failed" },
]

const pageSize = 5

export default function RemindersPage() {
  const [reminders, setReminders] = useState<ReminderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")
  const [search, setSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [saving, setSaving] = useState(false)

  const [newReminder, setNewReminder] = useState({
    patientQuery: "",
    patientId: "",
    patientName: "",
    channel: "email",
    template: "24h_appointment",
    sendAt: "",
  })
  const [patientResults, setPatientResults] = useState<{ id: string; name: string; phone: string }[]>([])
  const [searchingPatient, setSearchingPatient] = useState(false)

  useEffect(() => {
    loadReminders()
  }, [])

  async function loadReminders() {
    setLoading(true)
    try {
      const data = await getReminders({ limit: 200 })
      setReminders(
        data.map((r: any) => ({
          id: r.id,
          patientName: r.patient?.name || "Unknown",
          patientId: r.patientId,
          channel: r.channel,
          template: r.template,
          scheduledFor: r.sendAt,
          status: r.status,
        }))
      )
    } catch {
      toast.error("Failed to load reminders")
    } finally {
      setLoading(false)
    }
  }

  async function handlePatientSearch(query: string) {
    setNewReminder((prev) => ({ ...prev, patientQuery: query, patientName: query }))
    if (query.length < 2) {
      setPatientResults([])
      return
    }
    setSearchingPatient(true)
    try {
      const results = await searchPatients(query)
      setPatientResults(results.map((r: any) => ({ id: r.id, name: r.name, phone: r.phone })))
    } catch {
      setPatientResults([])
    } finally {
      setSearchingPatient(false)
    }
  }

  function selectPatient(patient: { id: string; name: string }) {
    setNewReminder((prev) => ({ ...prev, patientId: patient.id, patientName: patient.name, patientQuery: patient.name }))
    setPatientResults([])
  }

  const filtered = reminders.filter((r) => {
    if (activeTab === "upcoming" && r.status !== "pending") return false
    if (activeTab === "sent" && r.status !== "sent") return false
    if (activeTab === "failed" && r.status !== "failed") return false
    if (search && !r.patientName.toLowerCase().includes(search.toLowerCase()) && !r.template.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const totalPages = Math.ceil(filtered.length / pageSize)
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const kpi = {
    sentToday: reminders.filter((r) => r.status === "sent").length,
    pending: reminders.filter((r) => r.status === "pending").length,
    failed: reminders.filter((r) => r.status === "failed").length,
    sent: reminders.filter((r) => r.status === "sent").length,
    total: reminders.length,
  }
  const deliveryRate = (kpi.sent + kpi.failed) > 0 ? Math.round((kpi.sent / (kpi.sent + kpi.failed)) * 100) : 100

  async function handlePauseResume(id: string) {
    try {
      const updated = await pauseReminder(id)
      setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, status: updated.status } : r)))
      toast.success(updated.status === "paused" ? "Reminder paused" : "Reminder resumed")
    } catch {
      toast.error("Failed to update reminder")
    }
  }

  async function handleRetry(id: string) {
    try {
      await retryReminder(id)
      setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, status: "pending" } : r)))
      toast.success("Retry initiated")
    } catch {
      toast.error("Failed to retry reminder")
    }
  }

  async function createNewReminder() {
    if (!newReminder.patientId) {
      toast.error("Please select a patient")
      return
    }
    if (!newReminder.sendAt) {
      toast.error("Please select a date & time")
      return
    }
    setSaving(true)
    try {
      await createReminder({
        patientId: newReminder.patientId,
        channel: newReminder.channel,
        template: newReminder.template,
        sendAt: new Date(newReminder.sendAt).toISOString(),
      })
      toast.success("Reminder scheduled")
      setShowNewDialog(false)
      setNewReminder({ patientQuery: "", patientId: "", patientName: "", channel: "email", template: "24h_appointment", sendAt: "" })
      loadReminders()
    } catch {
      toast.error("Failed to create reminder")
    } finally {
      setSaving(false)
    }
  }

  function handleTabChange(value: string) {
    setActiveTab(value)
    setCurrentPage(1)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reminders Center</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage patient reminders across all channels.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setShowSettings(true)}>
            <BellRing className="size-4" />
            Reminder Settings
          </Button>
          <Button variant="outline" className="gap-2" onClick={async () => {
            try {
              const result = await processPendingRemindersAction()
              toast.success(`Processed: ${result.processed} sent, ${result.failed} failed`)
              loadReminders()
            } catch (e: any) {
              toast.error(e.message || "Failed to process reminders")
            }
          }}>
            <RotateCw className="size-4" />
            Process Now
          </Button>
          <Button className="gap-2" onClick={() => setShowNewDialog(true)}>
            <Plus className="size-4" />
            New Reminder
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sent Today</CardTitle>
            <div className="rounded-lg p-2 bg-green-50 text-green-600">
              <Send className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{kpi.sentToday}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <div className="rounded-lg p-2 bg-yellow-50 text-yellow-600">
              <Bell className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{kpi.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <div className="rounded-lg p-2 bg-red-50 text-red-600">
              <AlertTriangle className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{kpi.failed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
            <div className="rounded-lg p-2 bg-blue-50 text-blue-600">
              <CheckCircle className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{deliveryRate}%</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList>
                {tabs.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value}>
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <div className="relative max-w-sm">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search patients or templates..."
                className="h-9 pl-8"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1) }}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              <Bell className="size-8 mx-auto mb-3 opacity-50 animate-pulse" />
              <p>Loading reminders...</p>
            </div>
          ) : paginated.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">Patient</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">Channel</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">Template</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Scheduled For</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">Status</th>
                    <th className="text-right font-medium text-muted-foreground px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((reminder) => {
                    const channel = channelConfig[reminder.channel] || { icon: Bell, label: reminder.channel }
                    const ChannelIcon = channel.icon
                    return (
                      <tr key={reminder.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="size-8">
                              <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                                {getInitials(reminder.patientName)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{reminder.patientName}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <ChannelIcon className="size-4" />
                            <span>{channel.label}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell max-w-[200px] truncate">
                          {REMINDER_TEMPLATES.find((t) => t.id === reminder.template)?.label || reminder.template}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                          {formatDateTime(reminder.scheduledFor)}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={reminder.status} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {reminder.status !== "failed" && reminder.status !== "sent" && (
                              <Button variant="ghost" size="icon-sm" onClick={() => handlePauseResume(reminder.id)} title={reminder.status === "paused" ? "Resume" : "Pause"}>
                                {reminder.status === "paused" ? <Play className="size-4" /> : <Pause className="size-4" />}
                              </Button>
                            )}
                            {reminder.status === "failed" && (
                              <Button variant="ghost" size="icon-sm" onClick={() => handleRetry(reminder.id)} title="Retry">
                                <RotateCw className="size-4" />
                              </Button>
                            )}
                            <Link href={`/patients/${reminder.patientId}`}>
                              <Button variant="ghost" size="icon-sm" title="View Patient">
                                <Eye className="size-4" />
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <BellOff className="size-8 mx-auto mb-3 opacity-50" />
              <p>No reminders found for this filter.</p>
            </div>
          )}
        </CardContent>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => p - 1)}>
                <ChevronLeft className="size-4" />
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
                Next
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>New Reminder</DialogTitle>
            <DialogDescription>Schedule a new reminder for a patient.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="patientSearch">Patient</Label>
              <Input
                id="patientSearch"
                placeholder="Search patient..."
                value={newReminder.patientQuery}
                onChange={(e) => handlePatientSearch(e.target.value)}
              />
              {patientResults.length > 0 && (
                <div className="border border-border rounded-lg p-1 max-h-32 overflow-y-auto">
                  {patientResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-muted"
                      onClick={() => selectPatient(p)}
                    >
                      {p.name} — {p.phone}
                    </button>
                  ))}
                </div>
              )}
              {searchingPatient && <p className="text-xs text-muted-foreground">Searching...</p>}
              {newReminder.patientId && (
                <p className="text-xs text-emerald-600">Selected: {newReminder.patientName}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="channel">Channel</Label>
              <Select value={newReminder.channel} onValueChange={(v) => setNewReminder((prev) => ({ ...prev, channel: v ?? "email" }))}>
                <SelectTrigger id="channel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REMINDER_CHANNELS.map((ch) => {
                    const cfg = channelConfig[ch]
                    const Icon = cfg?.icon || Bell
                    return (
                      <SelectItem key={ch} value={ch}>
                        <span className="flex items-center gap-2">
                          <Icon className="size-4" />
                          {cfg?.label || ch}
                        </span>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="template">Template</Label>
              <Select value={newReminder.template} onValueChange={(v) => setNewReminder((prev) => ({ ...prev, template: v ?? "24h_appointment" }))}>
                <SelectTrigger id="template">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REMINDER_TEMPLATES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sendAt">Schedule Date & Time</Label>
              <Input
                id="sendAt"
                type="datetime-local"
                value={newReminder.sendAt}
                onChange={(e) => setNewReminder((prev) => ({ ...prev, sendAt: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>Cancel</Button>
            <Button onClick={createNewReminder} disabled={saving} className="gap-2">
              <Send className="size-4" />
              {saving ? "Scheduling..." : "Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Reminder Settings</DialogTitle>
            <DialogDescription>Configure default reminder behavior and channels.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Default Reminder Timing</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="before-day" className="text-xs text-muted-foreground">Day Before</Label>
                  <Input id="before-day" type="time" defaultValue="09:00" className="h-9" />
                </div>
                <div>
                  <Label htmlFor="before-hours" className="text-xs text-muted-foreground">Hours Before</Label>
                  <Input id="before-hours" type="time" defaultValue="14:00" className="h-9" />
                </div>
              </div>
            </div>
            <Separator />
            <div className="space-y-3">
              <Label>Active Channels</Label>
              {REMINDER_CHANNELS.map((ch) => {
                const cfg = channelConfig[ch]
                const Icon = cfg?.icon || Bell
                return (
                  <div key={ch} className="flex items-center gap-3">
                    <Icon className="size-4 text-muted-foreground" />
                    <span className="flex-1 text-sm">{cfg?.label || ch}</span>
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">Active</Badge>
                  </div>
                )
              })}
            </div>
            <Separator />
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked className="rounded border-muted-foreground/30" />
                <span className="text-sm font-normal">Send thank-you message after each visit</span>
              </Label>
              <Label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked className="rounded border-muted-foreground/30" />
                <span className="text-sm font-normal">Enable follow-up reminders for active plans</span>
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => { toast.success("Reminder settings saved"); setShowSettings(false) }}>
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
