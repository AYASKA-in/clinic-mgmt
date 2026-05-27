import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—"
  const d = new Date(date)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—"
  const d = new Date(date)
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function formatTime(date: Date | string | null | undefined): string {
  if (!date) return "—"
  const d = new Date(date)
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function startOfDay(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function endOfDay(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
}

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000

export function toDateIST(value: string): Date {
  if (value.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(value)) {
    return new Date(value)
  }
  return new Date(value + "+05:30")
}

export function istMidnightUTC(): Date {
  const nowIst = Date.now() + IST_OFFSET_MS
  const midnightIst = Math.floor(nowIst / 86400000) * 86400000
  return new Date(midnightIst - IST_OFFSET_MS)
}



export function generateReceiptNumber(): string {
  const date = new Date()
  const y = date.getFullYear().toString().slice(2)
  const m = (date.getMonth() + 1).toString().padStart(2, "0")
  const d = date.getDate().toString().padStart(2, "0")
  const rand = Math.floor(Math.random() * 9999)
    .toString()
    .padStart(4, "0")
  return `ZF-${y}${m}${d}-${rand}`
}
