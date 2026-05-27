"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Plus,
  Shield,
  UserCheck,
  UserX,
  MoreHorizontal,
  Edit,
  Save,
  Trash2,
  Loader2,
  AlertTriangle,
  Users,
} from "lucide-react"
import { cn, formatDateTime, getInitials } from "@/lib/utils"
import { ROLES, ROLE_LABELS } from "@/lib/constants"
import { getUsers, createUser, updateUser } from "@/lib/actions"
import { toast } from "sonner"

type AppUser = {
  id: string
  name: string
  email: string
  role: string
  active: boolean
  createdAt: Date
  updatedAt: Date
}

const roleBadgeStyle: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400",
  doctor: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400",
  receptionist: "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400",
}

const permissions: Record<string, { label: string; actions: string[] }> = {
  admin: {
    label: "Admin",
    actions: ["Full system access", "Manage users & roles", "View audit logs", "Configure settings", "Access all patient data"],
  },
  doctor: {
    label: "Doctor",
    actions: ["Manage treatment plans", "Record visits & receipts", "View assigned patients", "Schedule management", "Access patient history"],
  },
  receptionist: {
    label: "Receptionist",
    actions: ["Register new patients", "Schedule appointments", "Send reminders", "Manage visits", "Limited patient view"],
  },
}

export default function UsersPage() {
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingUser, setEditingUser] = useState<AppUser | null>(null)
  const [search, setSearch] = useState("")

  const [form, setForm] = useState({ name: "", email: "", password: "", role: "receptionist", active: true })
  const [editForm, setEditForm] = useState({ password: "" })
  const [saving, setSaving] = useState(false)

  async function loadUsers() {
    try {
      setLoading(true)
      const data = await getUsers()
      setUsers(data as unknown as AppUser[])
    } catch (e: any) {
      setError(e.message || "Failed to load users")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadUsers() }, [])

  function resetForm() {
    setForm({ name: "", email: "", password: "", role: "receptionist", active: true })
    setEditForm({ password: "" })
  }

  async function handleCreate() {
    if (!form.name || !form.email || !form.password) {
      toast.error("Name, email, and password are required")
      return
    }
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }
    try {
      setSaving(true)
      await createUser(form)
      toast.success("User created successfully")
      setShowAddDialog(false)
      resetForm()
      await loadUsers()
    } catch (e: any) {
      toast.error(e.message || "Failed to create user")
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate(id: string) {
    if (!editingUser) return
    try {
      setSaving(true)
      const data: any = {
        name: editingUser.name,
        email: editingUser.email,
        role: editingUser.role,
        active: editingUser.active,
      }
      if (editForm.password) {
        data.password = editForm.password
      }
      await updateUser(id, data)
      toast.success("User updated successfully")
      setShowEditDialog(false)
      setEditingUser(null)
      resetForm()
      await loadUsers()
    } catch (e: any) {
      toast.error(e.message || "Failed to update user")
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(user: AppUser) {
    try {
      await updateUser(user.id, { active: !user.active })
      toast.success(`User ${user.active ? "deactivated" : "activated"} successfully`)
      await loadUsers()
    } catch (e: any) {
      toast.error(e.message || "Failed to update user")
    }
  }

  const filtered = users.filter((u) =>
    !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  )

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
            <p className="text-destructive font-medium">Failed to load users</p>
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
          <h1 className="text-2xl font-semibold tracking-tight">Users & Roles</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage staff accounts and role-based permissions.
          </p>
        </div>
        <Button className="gap-2" onClick={() => { resetForm(); setShowAddDialog(true) }}>
          <Plus className="size-4" />
          Add User
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-4">
            <Input
              placeholder="Search by name or email..."
              className="h-9 max-w-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Badge variant="outline" className="ml-auto text-sm px-3 py-1">
              {filtered.length} user{filtered.length !== 1 ? "s" : ""}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarFallback className={cn("text-xs font-medium", roleBadgeStyle[user.role])}>
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-xs", roleBadgeStyle[user.role])}>
                        {ROLE_LABELS[user.role] || user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          user.active
                            ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {user.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                      {formatDateTime(user.updatedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => { setEditingUser({ ...user }); setShowEditDialog(true) }}
                        >
                          <Edit className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleToggleActive(user)}
                          title={user.active ? "Deactivate" : "Activate"}
                        >
                          {user.active ? <UserX className="size-4 text-muted-foreground" /> : <UserCheck className="size-4 text-green-600" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="size-8 mx-auto mb-3 opacity-50" />
              <p>{search ? "No users match your search." : "No users found."}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="size-5" />
            Role Permissions
          </CardTitle>
          <CardDescription>Summary of what each role can access in ZenFlow Clinic.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-3">
            {Object.entries(permissions).map(([key, perm]) => (
              <div key={key} className="space-y-3">
                <Badge variant="outline" className={cn("text-sm px-3 py-1", roleBadgeStyle[key])}>
                  {perm.label}
                </Badge>
                <ul className="space-y-2">
                  {perm.actions.map((action, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Checkbox checked disabled className="mt-0.5 size-4" />
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
            <DialogDescription>Create a new staff account.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="add-name">Name</Label>
              <Input id="add-name" placeholder="Full name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-email">Email</Label>
              <Input id="add-email" type="email" placeholder="email@example.com" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-password">Password</Label>
              <Input id="add-password" type="password" placeholder="At least 6 characters" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-role">Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v ?? "receptionist" }))}>
                <SelectTrigger id="add-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.active} onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))} />
              <Label className="text-sm font-normal">Active on creation</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving} className="gap-2">
              {saving && <Loader2 className="size-4 animate-spin" />}
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user details and permissions.</DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input id="edit-name" value={editingUser.name} onChange={(e) => setEditingUser((u) => u ? { ...u, name: e.target.value } : null)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input id="edit-email" type="email" value={editingUser.email} onChange={(e) => setEditingUser((u) => u ? { ...u, email: e.target.value } : null)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
              <Select value={editingUser.role} onValueChange={(v) => setEditingUser((u) => u ? { ...u, role: v ?? "receptionist" } : null)}>
                <SelectTrigger id="edit-role">
                  <SelectValue />
                </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={editingUser.active} onCheckedChange={(v) => setEditingUser((u) => u ? { ...u, active: v } : null)} />
                <Label className="text-sm font-normal">Active</Label>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="edit-password">New Password <span className="text-muted-foreground font-normal">(leave blank to keep current)</span></Label>
                <Input id="edit-password" type="password" placeholder="Min 6 characters" value={editForm.password} onChange={(e) => setEditForm({ password: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button onClick={() => editingUser && handleUpdate(editingUser.id)} disabled={saving} className="gap-2">
              {saving && <Loader2 className="size-4 animate-spin" />}
              <Save className="size-4" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
