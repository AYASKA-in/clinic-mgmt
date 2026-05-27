"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Download,
  Loader2,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
} from "lucide-react"
import { cn, formatDateTime } from "@/lib/utils"
import { exportAuditLogs, getAuditLogsAction } from "@/lib/actions"

const ENTITY_TYPES = ["Patient", "User", "Visit", "TreatmentPlan", "PlanSession", "Reminder", "ScheduleSlot", "ClinicSetting"]
const ACTIONS = ["create", "update", "delete"]

const actionBadge: Record<string, string> = {
  create: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400",
  update: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
  delete: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400",
}

type AuditEntry = {
  id: string
  createdAt: Date
  actor: { name: string; role: string } | null
  entityType: string
  entityId: string | null
  action: string
  before: string | null
  after: string | null
}

const pageSize = 10

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [filters, setFilters] = useState({
    entityType: "",
    action: "",
    actorId: "",
    search: "",
  })

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true)
      const result = await getAuditLogsAction({
        entityType: filters.entityType || undefined,
        action: filters.action || undefined,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      })
      setLogs(result.logs as unknown as AuditEntry[])
      setTotal(result.total)
    } catch (e: any) {
      setError(e.message || "Failed to load audit logs")
    } finally {
      setLoading(false)
    }
  }, [filters.entityType, filters.action, page])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  function handleFilterChange(key: string, value: string) {
    setFilters((f) => ({ ...f, [key]: value }))
    setPage(1)
  }

  function formatDiff(raw: string | null): string {
    if (!raw) return "—"
    try {
      return JSON.stringify(JSON.parse(raw), null, 2)
    } catch {
      return raw
    }
  }

  async function handleExport() {
    try {
      const csv = await exportAuditLogs({
        entityType: filters.entityType || undefined,
        action: filters.action || undefined,
      })
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      setError(e.message || "Export failed")
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="size-8 mx-auto mb-3 text-destructive" />
            <p className="text-destructive font-medium">Failed to load audit logs</p>
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
          <h1 className="text-2xl font-semibold tracking-tight">Audit Logs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track all changes made across the system.
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleExport}>
          <Download className="size-4" />
          Export
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Entity Type</Label>
              <Select value={filters.entityType} onValueChange={(v) => handleFilterChange("entityType", v ?? "")}>
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  {ENTITY_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Action</Label>
              <Select value={filters.action} onValueChange={(v) => handleFilterChange("action", v ?? "")}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Actions</SelectItem>
                  {ACTIONS.map((a) => (
                    <SelectItem key={a} value={a} className="capitalize">{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Search Actor</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Actor name..."
                  className="h-9 w-[180px] pl-8"
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground ml-auto">
              <Info className="size-3.5" />
              <span>{total} total entries</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left font-medium text-muted-foreground px-4 py-3 w-40">Timestamp</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">Actor</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">Entity</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">Entity ID</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">Action</th>
                    <th className="text-right font-medium text-muted-foreground px-4 py-3 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const isExpanded = expandedId === log.id
                    return (
                      <React.Fragment key={log.id}>
                        <tr
                          className="border-b border-border/50 hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => setExpandedId(isExpanded ? null : log.id)}
                        >
                          <td className="px-4 py-3 text-muted-foreground text-xs">
                            {formatDateTime(log.createdAt)}
                          </td>
                          <td className="px-4 py-3 font-medium">
                            {log.actor?.name || "System"}
                            <span className="text-xs text-muted-foreground ml-1.5">
                              ({log.actor?.role || "—"})
                            </span>
                          </td>
                          <td className="px-4 py-3">{log.entityType}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs font-mono hidden sm:table-cell">
                            {log.entityId || "—"}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className={cn("text-xs", actionBadge[log.action])}>
                              {log.action}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {isExpanded ? <ChevronDown className="size-4 inline-block text-muted-foreground" /> : <ChevronRightIcon className="size-4 inline-block text-muted-foreground" />}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${log.id}-diff`} className="bg-muted/30">
                            <td colSpan={6} className="px-4 py-4">
                              <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                  <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Before</h4>
                                  <pre className="text-xs bg-background rounded-lg border border-border p-3 overflow-auto max-h-48 font-mono">
                                    {formatDiff(log.before)}
                                  </pre>
                                </div>
                                <div>
                                  <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">After</h4>
                                  <pre className="text-xs bg-background rounded-lg border border-border p-3 overflow-auto max-h-48 font-mono">
                                    {formatDiff(log.after)}
                                  </pre>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Info className="size-8 mx-auto mb-3 opacity-50" />
              <p>No audit logs found for the selected filters.</p>
            </div>
          )}
        </CardContent>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages} ({total} total)
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="size-4" />
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
