"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Mail, Lock, ArrowRight, Leaf, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

function LoginForm() {
  const router = useRouter()
  const sp = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Login failed")
      }

      toast.success("Signed in successfully")
      const redirect = sp.get("redirect") || "/dashboard"
      router.push(redirect)
    } catch (err: any) {
      setError(err.message || "Invalid credentials")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          Email
        </label>
        <div className="relative">
          <Mail className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            placeholder="name@clinic.com"
            className="h-9 pl-8"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="text-sm font-medium text-foreground">
            Password
          </label>
          <a href="#" className="text-xs font-medium text-primary hover:text-primary/80">
            Forgot Password?
          </a>
        </div>
        <div className="relative">
          <Lock className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="password"
            type="password"
            placeholder="Enter your password"
            className="h-9 pl-8"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
      </div>

      {error && <p className="text-xs text-destructive text-center">{error}</p>}
      <Button type="submit" className="w-full gap-2" disabled={loading}>
        {loading ? "Signing in..." : "Sign in"}
        {!loading && <ArrowRight className="size-4" />}
      </Button>
    </form>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      }
    >
      <div className="flex min-h-screen">
        <div className="relative hidden flex-1 bg-gradient-to-br from-[#0f5238] to-[#2d6a4f] lg:flex lg:flex-col lg:items-center lg:justify-center">
          <div className="absolute inset-0 bg-black/20" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.12)_0%,_transparent_70%)]" />
          <div className="relative z-10 max-w-md px-8 text-center">
            <div className="mb-6 inline-flex size-16 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
              <Leaf className="size-8 text-white" />
            </div>
            <h1 className="font-heading text-4xl font-semibold tracking-tight text-white">
              Find your center.
            </h1>
            <p className="mt-3 text-base text-white/70">
              Book appointments, manage patients, and streamline your practice.
            </p>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm">
            <div className="mb-8 text-center lg:text-left">
              <div className="mb-4 inline-flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <Leaf className="size-5" />
                </div>
                <span className="font-heading text-lg font-semibold">ZenFlow Clinic</span>
              </div>
              <h2 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
                Welcome back
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Sign in to manage your practice
              </p>
            </div>

            <LoginForm />

            <div className="mt-8 text-center">
              <a
                href="#"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <ShieldAlert className="size-3.5" />
                Contact IT Support
              </a>
            </div>
          </div>
        </div>
      </div>
    </Suspense>
  )
}
