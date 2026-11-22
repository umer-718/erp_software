"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2 } from "lucide-react";

const INPUT =
  "w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-slate-600 focus:ring-2 focus:ring-slate-200";

function Field({ id, label, optional, ...props }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-slate-700">
        {label}
        {optional && <span className="ml-1 font-normal text-slate-400">(optional)</span>}
      </label>
      <input id={id} name={id} className={INPUT} required={!optional} {...props} />
    </div>
  );
}

export default function CompanySignupPage() {
  const [form, setForm] = useState({
    companyName: "",
    currency: "PKR",
    phone: "",
    address: "",
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const update = (event) =>
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    if (loading) return;

    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/companies/signup", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, confirmPassword: undefined }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.message || "Company sign-up failed. Please try again.");
        return;
      }

      setDone(data.message || "Company registered.");
    } catch {
      setError("Unable to connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white">
            <Building2 size={28} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Register your company</h1>
          <p className="mt-2 text-slate-500">
            Your company gets its own private database.
          </p>
        </div>

        {done ? (
          <div className="space-y-5">
            <div role="status" className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              {done}
            </div>
            <Link
              href="/login"
              className="block w-full rounded-lg bg-slate-900 py-3 text-center font-semibold text-white transition hover:bg-slate-800"
            >
              Go to Sign In
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Company</p>
              <Field id="companyName" label="Company name" value={form.companyName} onChange={update} maxLength={150} />
              <div className="grid gap-5 sm:grid-cols-2">
                <Field id="currency" label="Currency" value={form.currency} onChange={update} maxLength={3} pattern="[A-Za-z]{3}" />
                <Field id="phone" label="Phone" optional value={form.phone} onChange={update} maxLength={50} />
              </div>
              <Field id="address" label="Address" optional value={form.address} onChange={update} maxLength={500} />

              <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Your admin account</p>
              <Field id="fullName" label="Full name" value={form.fullName} onChange={update} autoComplete="name" maxLength={150} />
              <Field id="email" label="Email" type="email" value={form.email} onChange={update} autoComplete="email" maxLength={150} />
              <div className="grid gap-5 sm:grid-cols-2">
                <Field id="password" label="Password" type="password" value={form.password} onChange={update} autoComplete="new-password" minLength={8} />
                <Field id="confirmPassword" label="Confirm password" type="password" value={form.confirmPassword} onChange={update} autoComplete="new-password" minLength={8} />
              </div>
              <p className="text-xs text-slate-500">
                Already have an account? Use the same email and password to add another company to it.
              </p>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-slate-900 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Creating your company..." : "Register Company"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              Already registered?{" "}
              <Link href="/login" className="font-medium text-blue-700 hover:underline">
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
