import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const statusStyles: Record<string, string> = {
  active: "bg-[#0f5238]/10 text-[#0f5238] border-transparent",
  completed: "bg-muted text-muted-foreground border-transparent",
  overdue: "bg-destructive/10 text-destructive border-transparent",
  paused: "bg-muted text-muted-foreground border-transparent",
  draft: "bg-yellow-100 text-yellow-800 border-transparent dark:bg-yellow-900/30 dark:text-yellow-400",
  arrived: "bg-teal-100 text-teal-800 border-transparent dark:bg-teal-900/30 dark:text-teal-400",
  confirmed: "bg-emerald-100 text-emerald-800 border-transparent dark:bg-emerald-900/30 dark:text-emerald-400",
  in_treatment: "bg-primary/15 text-primary border-transparent",
  scheduled: "bg-blue-100 text-blue-800 border-transparent dark:bg-blue-900/30 dark:text-blue-400",
  failed: "bg-destructive/10 text-destructive border-transparent",
  sent: "bg-green-100 text-green-800 border-transparent dark:bg-green-900/30 dark:text-green-400",
  pending: "bg-yellow-100 text-yellow-800 border-transparent dark:bg-yellow-900/30 dark:text-yellow-400",
  blocked: "bg-muted text-muted-foreground border-transparent",
  cancelled: "bg-destructive/10 text-destructive border-transparent",
  no_show: "bg-orange-100 text-orange-800 border-transparent dark:bg-orange-900/30 dark:text-orange-400",
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const style = statusStyles[status] ?? "bg-muted text-muted-foreground border-transparent"
  return (
    <Badge variant="outline" className={cn("capitalize", style, className)}>
      {status.replace(/_/g, " ")}
    </Badge>
  )
}
