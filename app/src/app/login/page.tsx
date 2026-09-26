"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import AuthLayout, { AuthError, AuthField, AuthHeading, GoogleButton, OrDivider } from "@/components/auth/AuthLayout";
import { buttonClass } from "@/components/ui/button";
import { safeCallbackUrl } from "@/lib/safe-redirect";

function errorMessage(error: string | null) {
  if (!error) return "";
  if (error === "OAuthAccountNotLinked") {
    return "This email already has an account with a password. Sign in with your email and password.";
  }
  return "Sign-in didn’t work. Please try again.";
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"));
  const error = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setFormError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setFormError("Wrong email or password.");
      setLoading(false);
    } else {
      router.replace(callbackUrl);
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-4 md:gap-[22px]">
      <AuthHeading title="Welcome back" lead="Sign in to see who to catch up with today." />
      <AuthError message={formError || errorMessage(error)} />
      <GoogleButton label="Continue with Google" onClick={() => signIn("google", { callbackUrl })} />
      <OrDivider />
      <form onSubmit={handleCredentials} className="flex flex-col gap-4 md:gap-[22px]">
        <div className="flex flex-col gap-3.5">
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
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
          />
        </div>
        <button type="submit" disabled={loading} className={buttonClass("primary", "lg")}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="text-center text-[15px] text-muted">
        New here?{" "}
        <Link href="/register" className="font-bold text-brand hover:text-ink">
          Create an account
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <AuthLayout>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthLayout>
  );
}
