"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import {
  ArrowLeft,
  Search,
  CalendarDays,
  Save,
  FileText,
  AlertTriangle,
  Check,
  ChevronsUpDown,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { treatmentPlanSchema, type TreatmentPlanFormData } from "@/lib/validators"
import { createTreatmentPlan, getTreatmentPlans, searchPatients, getDoctors } from "@/lib/actions"
import { formatDate, getInitials } from "@/lib/utils"

type PatientResult = Awaited<ReturnType<typeof searchPatients>>[number]
type PlanVersion = Awaited<ReturnType<typeof getTreatmentPlans>>[number]
type Doctor = Awaited<ReturnType<typeof getDoctors>>[number]

export default function NewPlanPage() {
  const router = useRouter()
  const sp = useSearchParams()
  const preselectedPatientId = sp.get("patientId") || ""

  const [patientSearch, setPatientSearch] = useState("")
  const [patientResults, setPatientResults] = useState<PatientResult[]>([])
  const [selectedPatient, setSelectedPatient] = useState<PatientResult | null>(null)
  const [searching, setSearching] = useState(false)
  const [previousPlans, setPreviousPlans] = useState<PlanVersion[]>([])
  const [schedulePreview, setSchedulePreview] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [doctorSearch, setDoctorSearch] = useState("")
  const [doctorOpen, setDoctorOpen] = useState(false)
  const [selectedDoctorName, setSelectedDoctorName] = useState("")

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<TreatmentPlanFormData>({
    resolver: zodResolver(treatmentPlanSchema) as any,
    defaultValues: {
      patientId: preselectedPatientId,
      doctorId: "",
      condition: "",
      stagesTotal: 1,
      sittingsTotal: 6,
      intervalDays: 7,
      plannedVisitDates: "",
      expectedEndDate: "",
      startDate: new Date(Date.now() + 86400000).toISOString().split("T")[0],
      status: "active",
      specialNotes: "",
    } as TreatmentPlanFormData,
  })

  const stagesTotal = watch("stagesTotal")
  const sittingsTotal = watch("sittingsTotal")
  const intervalDays = watch("intervalDays")
  const startDate = watch("startDate")

  useEffect(() => {
    getDoctors().then(setDoctors)
  }, [])

  const filteredDoctors = useMemo(() => {
    if (!doctorSearch) return doctors
    const q = doctorSearch.toLowerCase()
    return doctors.filter((d) => d.name.toLowerCase().includes(q))
  }, [doctors, doctorSearch])

  async function handlePatientSearch(query: string) {
    setPatientSearch(query)
    if (query.length < 2) {
      setPatientResults([])
      return
    }
    setSearching(true)
    const results = await searchPatients(query)
    setPatientResults(results)
    setSearching(false)
  }

  async function selectPatient(patient: PatientResult) {
    setSelectedPatient(patient)
    setValue("patientId", patient.id, { shouldValidate: true })
    setPatientResults([])
    setPatientSearch(patient.name)

    const plans = await getTreatmentPlans({ patientId: patient.id })
    setPreviousPlans(plans)
  }

  function selectDoctor(doctor: Doctor) {
    setValue("doctorId", doctor.id, { shouldValidate: true })
    setSelectedDoctorName(doctor.name)
    setDoctorOpen(false)
    setDoctorSearch("")
  }

  function generateSchedule() {
    const total = Number(stagesTotal) * Number(sittingsTotal)
    const days: string[] = []
    const start = startDate ? new Date(startDate + "T00:00:00") : new Date()
    if (!startDate) start.setDate(start.getDate() + 1)

    for (let i = 0; i < total; i++) {
      const d = new Date(start)
      d.setDate(d.getDate() + i * Number(intervalDays))
      days.push(d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) + " 10:00 AM")
    }
    setSchedulePreview(days)
  }

  const stageBreakdown = useMemo(() => {
    const sittings = Number(sittingsTotal)
    const stages = Number(stagesTotal)
    if (!sittings || !stages) return []
    return Array.from({ length: stages }, (_, i) => ({
      stage: i + 1,
      sittings: Math.ceil(sittings / stages),
    }))
  }, [stagesTotal, sittingsTotal])

  async function onSubmit(data: TreatmentPlanFormData) {
    if (!selectedPatient) {
      toast.error("Please select a patient.")
      return
    }
    if (!data.doctorId) {
      toast.error("Please select a practitioner.")
      return
    }
    setSubmitting(true)
    try {
      const result = await createTreatmentPlan(data)
      if (result.success) {
        toast.success("Treatment plan created successfully.")
        router.push(`/patients/${data.patientId}`)
      } else {
        toast.error(result.error || "Failed to create treatment plan.")
      }
    } catch {
      toast.error("Failed to create treatment plan.")
    } finally {
      setSubmitting(false)
    }
  }

  function handleSaveDraft() {
    setValue("status", "draft")
    handleSubmit(onSubmit)()
  }

  function handleSaveActivate() {
    setValue("status", "active")
    handleSubmit(onSubmit)()
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/patients">
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">New Treatment Plan</h1>
          <p className="text-sm text-muted-foreground">
            Create a structured treatment plan for a patient.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-6">
            <Card className="overflow-visible">
              <CardHeader>
                <CardTitle className="text-base">Patient</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedPatient ? (
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
                    <Avatar className="size-9">
                      <AvatarFallback className="text-sm font-medium bg-primary/10 text-primary">
                        {getInitials(selectedPatient.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{selectedPatient.name}</p>
                      <p className="text-xs text-muted-foreground">{selectedPatient.phone}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedPatient(null)
                        setPatientSearch("")
                        setValue("patientId", "", { shouldValidate: true })
                        setPreviousPlans([])
                      }}
                    >
                      Change
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search patient by name..."
                      className="h-9 pl-8"
                      value={patientSearch}
                      onChange={(e) => handlePatientSearch(e.target.value)}
                    />
                    {patientResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border border-border bg-card shadow-lg max-h-48 overflow-y-auto">
                        {patientResults.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            className="flex w-full items-center gap-3 px-3 py-2 text-sm hover:bg-muted text-left"
                            onClick={() => selectPatient(p)}
                          >
                            <Avatar className="size-7">
                              <AvatarFallback className="text-xs font-medium bg-muted text-muted-foreground">
                                {getInitials(p.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{p.name}</p>
                              <p className="text-xs text-muted-foreground">{p.phone}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {searching && patientSearch.length >= 2 && patientResults.length === 0 && (
                      <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border border-border bg-card shadow-lg p-3 text-sm text-muted-foreground">
                        Searching...
                      </div>
                    )}
                    {!searching && patientSearch.length >= 2 && patientResults.length === 0 && (
                      <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border border-border bg-card shadow-lg p-3 text-sm text-muted-foreground">
                        No patients found.
                      </div>
                    )}
                  </div>
                )}
                {errors.patientId && (
                  <p className="text-xs text-destructive mt-2">{errors.patientId.message}</p>
                )}
              </CardContent>
            </Card>

            <Card className="overflow-visible">
              <CardHeader>
                <CardTitle className="text-base">Clinical Parameters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 overflow-visible">
                <div className="space-y-2">
                  <Label htmlFor="doctorId">Practitioner *</Label>
                  <Controller
                    name="doctorId"
                    control={control}
                    render={({ field }) => (
                      <Popover open={doctorOpen} onOpenChange={setDoctorOpen}>
                        <PopoverTrigger
                          id="doctorId"
                          role="combobox"
                          aria-expanded={doctorOpen}
                          className="flex w-full items-center justify-between rounded-lg border border-border bg-background px-3 py-1.5 text-sm hover:bg-muted h-9"
                        >
                          {selectedDoctorName ? (
                            <span className="flex items-center gap-2">
                              <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary">
                                {getInitials(selectedDoctorName)}
                              </span>
                              {selectedDoctorName}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Select practitioner...</span>
                          )}
                          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 z-50" align="start">
                          <Command>
                            <CommandInput
                              placeholder="Search doctor..."
                              value={doctorSearch}
                              onValueChange={setDoctorSearch}
                            />
                            <CommandList>
                              <CommandEmpty>No doctor found.</CommandEmpty>
                              <CommandGroup>
                                {filteredDoctors.map((doctor) => (
                                  <CommandItem
                                    key={doctor.id}
                                    value={doctor.name}
                                    onSelect={() => selectDoctor(doctor)}
                                  >
                                    <div className="flex items-center gap-2 flex-1">
                                      <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary">
                                        {getInitials(doctor.name)}
                                      </span>
                                      <div className="flex flex-col">
                                        <span>{doctor.name}</span>
                                        <span className="text-xs text-muted-foreground">Doctor</span>
                                      </div>
                                    </div>
                                    {field.value === doctor.id && (
                                      <Check className="size-4 ml-auto text-primary" />
                                    )}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                  {errors.doctorId && (
                    <p className="text-xs text-destructive">{errors.doctorId.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="condition">Condition *</Label>
                  <Input
                    id="condition"
                    {...register("condition")}
                    placeholder="e.g. Chronic Lower Back Pain"
                  />
                  {errors.condition && (
                    <p className="text-xs text-destructive">{errors.condition.message}</p>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="stagesTotal">Total Stages</Label>
                    <Select
                      onValueChange={(v: string | null) => setValue("stagesTotal", Number(v), { shouldValidate: true })}
                      defaultValue="1"
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Stages" />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6].map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n} {n === 1 ? "Stage" : "Stages"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sittingsTotal">Sittings per Stage</Label>
                    <Input
                      id="sittingsTotal"
                      type="number"
                      min={1}
                      max={100}
                      {...register("sittingsTotal")}
                    />
                    {errors.sittingsTotal && (
                      <p className="text-xs text-destructive">{errors.sittingsTotal.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="intervalDays">Interval (days)</Label>
                    <Input
                      id="intervalDays"
                      type="number"
                      min={1}
                      max={90}
                      {...register("intervalDays")}
                    />
                    {errors.intervalDays && (
                      <p className="text-xs text-destructive">{errors.intervalDays.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      {...register("startDate")}
                    />
                    {errors.startDate && (
                      <p className="text-xs text-destructive">{errors.startDate.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Sessions will be scheduled at <strong>10:00 AM</strong> for 1 hour. You can change individual session times later.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={generateSchedule}
                  >
                    <CalendarDays className="size-3.5" />
                    Generate Schedule
                  </Button>
                </div>
              </CardContent>
            </Card>

            {schedulePreview.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CalendarDays className="size-4 text-muted-foreground" />
                    Planned Schedule Preview
                  </CardTitle>
                  <CardDescription>
                    {stageBreakdown.map((s) => (
                      <span key={s.stage} className="mr-3">
                        Stage {s.stage}: {s.sittings} sitting{s.sittings > 1 ? "s" : ""}
                      </span>
                    ))}
                    &mdash; Total: {schedulePreview.length} sessions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {schedulePreview.map((date, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs"
                      >
                        <Badge variant="outline" className="size-5 p-0 flex items-center justify-center text-[10px]">
                          {i + 1}
                        </Badge>
                        <span className="text-muted-foreground">{date}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Special Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  {...register("specialNotes")}
                  placeholder="Any special instructions or notes for this treatment plan"
                  rows={3}
                />
              </CardContent>
            </Card>

            <div className="flex items-center justify-end gap-3">
              <Link href="/patients">
                <Button variant="outline" disabled={submitting}>Cancel</Button>
              </Link>
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={handleSaveDraft}
                className="gap-1.5"
              >
                {submitting ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
                {submitting ? "Saving..." : "Save as Draft"}
              </Button>
              <Button type="button" disabled={submitting} onClick={handleSaveActivate} className="gap-1.5">
                {submitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                {submitting ? "Saving..." : "Save & Activate Plan"}
              </Button>
            </div>
          </div>
        </form>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full gap-1.5" onClick={handleSaveActivate} disabled={submitting}>
                {submitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                {submitting ? "Saving..." : "Save & Activate Plan"}
              </Button>
              <Button
                variant="outline"
                className="w-full gap-1.5"
                disabled={submitting}
                onClick={handleSaveDraft}
              >
                {submitting ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
                {submitting ? "Saving..." : "Save as Draft"}
              </Button>
              <Link href="/patients">
                <Button variant="ghost" className="w-full" disabled={submitting}>
                  Cancel
                </Button>
              </Link>
            </CardContent>
          </Card>

          {previousPlans.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="size-3.5 text-amber-500" />
                  Version Comparison
                </CardTitle>
                <CardDescription>
                  {previousPlans.length} previous plan{previousPlans.length > 1 ? "s" : ""} for this patient
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {previousPlans.slice(0, 3).map((plan) => (
                  <div
                    key={plan.id}
                    className="rounded-lg border border-border p-3 text-sm"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{plan.condition}</span>
                      <Badge variant="outline" className="text-[10px]">
                        v{plan.version}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {plan.stagesTotal} stages, {plan.sittingsTotal} sittings
                      {plan.intervalDays && `, every ${plan.intervalDays} days`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(plan.createdAt)}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
