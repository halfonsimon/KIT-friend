"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AuthLayout, { AuthError, AuthField, AuthHeading, GoogleButton, OrDivider } from "@/components/auth/AuthLayout";
import { buttonClass } from "@/components/ui/button";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Couldn’t create the account.");
        setLoading(false);
        return;
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Your account is ready, but signing in didn’t work. Please sign in.");
        setLoading(false);
      } else {
        router.replace("/");
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <div className="flex flex-col gap-4 md:gap-[22px]">
        <AuthHeading title="Create your account" lead="Start with the people you don’t want to lose touch with." />
        <AuthError message={error} />
        <GoogleButton label="Sign up with Google" onClick={() => signIn("google", { callbackUrl: "/" })} />
        <OrDivider />
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 md:gap-[22px]">
          <div className="flex flex-col gap-3.5">
            <AuthField
              id="name"
              label="Name"
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
            <AuthField
              id="email"
              label="Email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
            <AuthField
              id="password"
              label="Password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
          </div>
          <button type="submit" disabled={loading} className={buttonClass("primary", "lg")}>
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>
        <p className="text-center text-[15px] text-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-brand hover:text-ink">
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
