"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Save, Loader2, AlertTriangle, Info } from "lucide-react"
import { getClinicSettings, setClinicSetting } from "@/lib/actions"
import { toast } from "sonner"
import { ROLES, ROLE_LABELS } from "@/lib/constants"

type SettingsMap = Record<string, string>

const SETTING_KEYS = {
  clinicName: "clinic_name",
  address: "clinic_address",
  phone: "clinic_phone",
  email: "clinic_email",
  reminderDayBefore: "reminder_day_before",
  reminderHoursBefore: "reminder_hours_before",
  channelEmail: "channel_email",
  thankYouAfterVisit: "thank_you_after_visit",
  followUpReminder: "follow_up_reminder",
  doubleBookingOverride: "double_booking_override",
  defaultApptDuration: "default_appt_duration",
  bufferBetweenAppts: "buffer_between_appts",
  maxApptsPerDay: "max_appts_per_day",
  receiptShowHeader: "receipt_show_header",
  receiptShowFooter: "receipt_show_footer",
  receiptFooterMessage: "receipt_footer_message",
  receiptShowDoctor: "receipt_show_doctor",
  dataRetentionDays: "data_retention_days",
  auditLogRetentionDays: "audit_log_retention_days",
  hideSensitiveForReceptionist: "hide_sensitive_receptionist",
} as const

const defaultValues: SettingsMap = {
  clinic_name: "ZenFlow Acupuncture Clinic",
  clinic_address: "42 Serenity Lane, Beverly Hills, CA 90210",
  clinic_phone: "+1 (310) 555-0199",
  clinic_email: "noreply@srilalithasignaturenoodles.online",
  reminder_day_before: "09:00",
  reminder_hours_before: "14:00",
  channel_email: "true",
  thank_you_after_visit: "true",
  follow_up_reminder: "true",
  double_booking_override: "false",
  default_appt_duration: "45",
  buffer_between_appts: "10",
  max_appts_per_day: "16",
  receipt_show_header: "true",
  receipt_show_footer: "true",
  receipt_footer_message: "Thank you for choosing ZenFlow Acupuncture. We wish you wellness and balance.",
  receipt_show_doctor: "true",
  data_retention_days: "365",
  audit_log_retention_days: "730",
  hide_sensitive_receptionist: "true",
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsMap>(defaultValues)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("clinic")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const data = await getClinicSettings()
        setSettings((prev) => ({ ...prev, ...data }))
      } catch (e: any) {
        setError(e.message || "Failed to load settings")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function updateSetting(key: string, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  async function saveAll() {
    try {
      setSaving(true)
      const promises = Object.entries(settings).map(([key, value]) =>
        setClinicSetting(key, value)
      )
      await Promise.all(promises)
      toast.success("Settings saved successfully")
    } catch (e: any) {
      toast.error(e.message || "Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  function boolVal(key: string): boolean {
    return settings[key] === "true"
  }

  function toggleBool(key: string) {
    updateSetting(key, settings[key] === "true" ? "false" : "true")
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="size-8 mx-auto mb-3 text-destructive" />
            <p className="text-destructive font-medium">Failed to load settings</p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
            <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure clinic preferences and system behavior.
          </p>
        </div>
        <Button onClick={saveAll} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save Changes
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="clinic">Clinic Details</TabsTrigger>
          <TabsTrigger value="reminders">Reminders</TabsTrigger>
          <TabsTrigger value="booking">Booking</TabsTrigger>
          <TabsTrigger value="receipt">Receipt</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
        </TabsList>

        <TabsContent value="clinic" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Clinic Details</CardTitle>
              <CardDescription>Basic information about your practice.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clinicName">Clinic Name</Label>
                <Input id="clinicName" value={settings.clinic_name} onChange={(e) => updateSetting("clinic_name", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea id="address" rows={2} value={settings.clinic_address} onChange={(e) => updateSetting("clinic_address", e.target.value)} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={settings.clinic_phone} onChange={(e) => updateSetting("clinic_phone", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={settings.clinic_email} onChange={(e) => updateSetting("clinic_email", e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reminders" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Reminder Settings</CardTitle>
              <CardDescription>Configure automated patient reminders.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Default Reminder Timing</Label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="reminderDayBefore" className="text-xs text-muted-foreground">Day Before (time)</Label>
                    <Input id="reminderDayBefore" type="time" value={settings.reminder_day_before} onChange={(e) => updateSetting("reminder_day_before", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reminderHoursBefore" className="text-xs text-muted-foreground">Hours Before (time)</Label>
                    <Input id="reminderHoursBefore" type="time" value={settings.reminder_hours_before} onChange={(e) => updateSetting("reminder_hours_before", e.target.value)} />
                  </div>
                </div>
              </div>
              <Separator />
              <div className="space-y-4">
                <Label>Active Channels</Label>
                <div className="flex items-center justify-between">
                  <Label htmlFor="chEmail" className="text-sm font-normal">Email</Label>
                  <Switch id="chEmail" checked={boolVal("channel_email")} onCheckedChange={() => toggleBool("channel_email")} />
                </div>
              </div>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="thankYou" className="text-sm font-normal">Thank-you message after visit</Label>
                    <p className="text-xs text-muted-foreground">Send an automated thank-you message post-session.</p>
                  </div>
                  <Switch id="thankYou" checked={boolVal("thank_you_after_visit")} onCheckedChange={() => toggleBool("thank_you_after_visit")} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="followUp" className="text-sm font-normal">Follow-up reminders</Label>
                    <p className="text-xs text-muted-foreground">Auto-remind patients with active treatment plans.</p>
                  </div>
                  <Switch id="followUp" checked={boolVal("follow_up_reminder")} onCheckedChange={() => toggleBool("follow_up_reminder")} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="booking" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Booking Settings</CardTitle>
              <CardDescription>Configure appointment scheduling rules.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="doubleBooking" className="text-sm font-normal">Allow double-booking override</Label>
                  <p className="text-xs text-muted-foreground">Permit overlapping appointments when necessary.</p>
                </div>
                <Switch id="doubleBooking" checked={boolVal("double_booking_override")} onCheckedChange={() => toggleBool("double_booking_override")} />
              </div>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="apptDuration">Default duration (min)</Label>
                  <Input id="apptDuration" type="number" value={settings.default_appt_duration} onChange={(e) => updateSetting("default_appt_duration", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="buffer">Buffer (min)</Label>
                  <Input id="buffer" type="number" value={settings.buffer_between_appts} onChange={(e) => updateSetting("buffer_between_appts", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxAppts">Max appointments/day</Label>
                  <Input id="maxAppts" type="number" value={settings.max_appts_per_day} onChange={(e) => updateSetting("max_appts_per_day", e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receipt" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Receipt Template</CardTitle>
              <CardDescription>Customize how receipts appear and what they include.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="rcptHeader" className="text-sm font-normal">Show clinic header</Label>
                  <Switch id="rcptHeader" checked={boolVal("receipt_show_header")} onCheckedChange={() => toggleBool("receipt_show_header")} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="rcptFooter" className="text-sm font-normal">Show footer</Label>
                  <Switch id="rcptFooter" checked={boolVal("receipt_show_footer")} onCheckedChange={() => toggleBool("receipt_show_footer")} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="rcptDoctor" className="text-sm font-normal">Show doctor name</Label>
                  <Switch id="rcptDoctor" checked={boolVal("receipt_show_doctor")} onCheckedChange={() => toggleBool("receipt_show_doctor")} />
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="footerMsg">Footer message</Label>
                <Textarea id="footerMsg" rows={2} value={settings.receipt_footer_message} onChange={(e) => updateSetting("receipt_footer_message", e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Privacy & Data Retention</CardTitle>
              <CardDescription>Manage data lifecycle and role-based visibility.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert variant="default" className="bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
                <Info className="size-4 text-blue-600" />
                <AlertTitle className="text-blue-800 dark:text-blue-400">Data Protection</AlertTitle>
                <AlertDescription className="text-blue-700/70 dark:text-blue-300/70">
                  These settings control how long data is retained and which roles can view sensitive information.
                </AlertDescription>
              </Alert>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="dataRetention">Patient data retention (days)</Label>
                  <Input id="dataRetention" type="number" value={settings.data_retention_days} onChange={(e) => updateSetting("data_retention_days", e.target.value)} />
                  <p className="text-xs text-muted-foreground">After this period, inactive patient data is anonymized.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="auditRetention">Audit log retention (days)</Label>
                  <Input id="auditRetention" type="number" value={settings.audit_log_retention_days} onChange={(e) => updateSetting("audit_log_retention_days", e.target.value)} />
                  <p className="text-xs text-muted-foreground">Audit logs older than this are archived.</p>
                </div>
              </div>
              <Separator />
              <div className="space-y-3">
                <Label>Hide sensitive fields per role</Label>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="sensitiveReceptionist" className="text-sm font-normal">
                      Receptionist: hide financial & medical notes
                    </Label>
                    <p className="text-xs text-muted-foreground">Restrict access to billing codes, diagnosis details.</p>
                  </div>
                  <Switch id="sensitiveReceptionist" checked={boolVal("hide_sensitive_receptionist")} onCheckedChange={() => toggleBool("hide_sensitive_receptionist")} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
