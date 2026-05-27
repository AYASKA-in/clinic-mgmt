"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { ArrowLeft, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import Link from "next/link"
import { patientSchema, type PatientFormData } from "@/lib/validators"
import { createPatient, getDuplicatePatients } from "@/lib/actions"
import { formatDate, getInitials } from "@/lib/utils"

type DuplicatePatient = Awaited<ReturnType<typeof getDuplicatePatients>>[number]

export default function NewPatientPage() {
  const router = useRouter()
  const [showOptional, setShowOptional] = useState(false)
  const [duplicates, setDuplicates] = useState<DuplicatePatient[]>([])
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [showDuplicates, setShowDuplicates] = useState(false)
  const [pendingAction, setPendingAction] = useState<"create" | "createAndVisit" | null>(null)
  const phoneTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema) as any,
    defaultValues: {
      name: "",
      phone: "",
      address: "",
      reportedProblem: "",
      gender: undefined,
      age: undefined,
      dateOfBirth: "",
      referralSource: "",
      emergencyContact: "",
      notes: "",
    } as PatientFormData,
  })

  const phoneValue = watch("phone")
  const nameValue = watch("name")

  const checkDuplicates = useCallback(async (phone: string, name: string) => {
    if (!phone && !name) {
      setDuplicates([])
      return
    }
    const results = await getDuplicatePatients(phone, name)
    setDuplicates(results)
  }, [])

  useEffect(() => {
    if (phoneTimer.current) clearTimeout(phoneTimer.current)
    phoneTimer.current = setTimeout(() => {
      if (phoneValue || nameValue) checkDuplicates(phoneValue, nameValue)
    }, 600)
    return () => {
      if (phoneTimer.current) clearTimeout(phoneTimer.current)
    }
  }, [phoneValue, nameValue, checkDuplicates])

  async function onSubmit(formData: PatientFormData, action: "create" | "createAndVisit") {
    setSubmitting(action)
    try {
      const patient = await createPatient(formData)
      toast.success(`Patient "${patient.name}" registered successfully.`)
      if (action === "createAndVisit") {
        router.push(`/patients/${patient.id}?newVisit=true`)
      } else {
        router.push(`/patients/${patient.id}`)
      }
    } catch {
      toast.error("Failed to register patient.")
    } finally {
      setSubmitting(null)
    }
  }

  function handleRegisterClick(action: "create" | "createAndVisit") {
    if (duplicates.length > 0) {
      setPendingAction(action)
      setShowDuplicates(true)
    } else {
      handleSubmit((data) => onSubmit(data, action))()
    }
  }

  function handleConfirmRegister() {
    setShowDuplicates(false)
    handleSubmit((data) => onSubmit(data, pendingAction || "create"))()
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
          <h1 className="text-xl font-semibold tracking-tight">New Patient Intake</h1>
          <p className="text-sm text-muted-foreground">
            Register a new patient in the system.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <form onSubmit={handleSubmit((data) => onSubmit(data, pendingAction || "create"))}>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Required Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input id="name" {...register("name")} placeholder="Enter patient's full name" />
                  {errors.name && (
                    <p className="text-xs text-destructive">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    {...register("phone")}
                    placeholder="Enter phone number"
                  />
                  {errors.phone && (
                    <p className="text-xs text-destructive">{errors.phone.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register("email")}
                    placeholder="patient@email.com"
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reportedProblem">Reported Health Problem *</Label>
                  <Textarea
                    id="reportedProblem"
                    {...register("reportedProblem")}
                    placeholder="Describe the patient's reported health concern"
                    rows={3}
                  />
                  {errors.reportedProblem && (
                    <p className="text-xs text-destructive">{errors.reportedProblem.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address *</Label>
                  <Input id="address" {...register("address")} placeholder="Street, City, ZIP" />
                  {errors.address && (
                    <p className="text-xs text-destructive">{errors.address.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <button
                type="button"
                onClick={() => setShowOptional(!showOptional)}
                className="flex w-full items-center justify-between p-4 text-sm font-medium"
              >
                <span>Optional Information</span>
                {showOptional ? (
                  <ChevronUp className="size-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="size-4 text-muted-foreground" />
                )}
              </button>
              {showOptional && (
                <CardContent className="space-y-4 pt-0">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="dateOfBirth">Date of Birth</Label>
                      <Input id="dateOfBirth" type="date" {...register("dateOfBirth")} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gender">Gender</Label>
                      <Select
                        onValueChange={(v: string | null) => setValue("gender", v ?? undefined)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="age">Age</Label>
                      <Input id="age" type="number" {...register("age")} placeholder="Years" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="referralSource">Referral Source</Label>
                      <Input
                        id="referralSource"
                        {...register("referralSource")}
                        placeholder="e.g. Google, Friend, Doctor"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="emergencyContact">Emergency Contact</Label>
                    <Input
                      id="emergencyContact"
                      {...register("emergencyContact")}
                      placeholder="Name and phone of emergency contact"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      {...register("notes")}
                      placeholder="Any additional notes"
                      rows={2}
                    />
                  </div>
                </CardContent>
              )}
            </Card>

            <div className="flex items-center justify-end gap-3">
              <Link href="/patients">
                <Button variant="outline">Cancel</Button>
              </Link>
              <Button
                type="button"
                variant="outline"
                disabled={submitting !== null}
                onClick={() => handleRegisterClick("createAndVisit")}
              >
                {submitting === "createAndVisit" ? "Registering..." : "Register & Create Visit"}
              </Button>
              <Button
                type="button"
                disabled={submitting !== null}
                onClick={() => handleRegisterClick("create")}
              >
                {submitting === "create" ? "Registering..." : "Register Patient"}
              </Button>
            </div>
          </div>
        </form>

        {duplicates.length > 0 && (
          <div className="hidden lg:block space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="size-4 text-amber-500" />
                  Similar Patients
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {duplicates.map((dup) => (
                  <div
                    key={dup.id}
                    className="flex items-start gap-3 p-2 rounded-lg border border-border"
                  >
                    <div className="size-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
                      {getInitials(dup.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{dup.name}</p>
                      <p className="text-xs text-muted-foreground">{dup.phone}</p>
                      {dup.visits[0] && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Last visit: {formatDate(dup.visits[0].dateTime)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <Dialog open={showDuplicates} onOpenChange={setShowDuplicates}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-500" />
              Similar Patients Found
            </DialogTitle>
            <DialogDescription>
              {duplicates.length} similar patient(s) found. Proceed anyway?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {duplicates.map((dup) => (
              <div key={dup.id} className="flex items-center gap-3 p-2 rounded-md bg-muted">
                <div className="size-8 rounded-full bg-muted-foreground/20 flex items-center justify-center text-xs font-medium shrink-0">
                  {getInitials(dup.name)}
                </div>
                <div>
                  <p className="text-sm font-medium">{dup.name}</p>
                  <p className="text-xs text-muted-foreground">{dup.phone}</p>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDuplicates(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmRegister}>
              Register Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
