import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearAuthMessages, forgotPassword } from "@/store/slices/authSlice";
import { useToast } from "@/hooks/useToast";

export default function ForgotPassword() {
  const dispatch = useAppDispatch();
  const toast = useToast();
  const { loading, error, successMessage } = useAppSelector((state) => state.auth);
  const [email, setEmail] = useState("");

  useEffect(() => {
    dispatch(clearAuthMessages());
  }, [dispatch]);

  useEffect(() => {
    if (successMessage) {
      toast.success(successMessage, "Password reset");
    }
  }, [successMessage, toast]);

  useEffect(() => {
    if (error) {
      toast.error(error, "Password reset");
    }
  }, [error, toast]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await dispatch(forgotPassword({ email }));
  };

  return (
    <AuthShell
      title="Reset Password"
      subtitle="Enter your registered email and we will send reset instructions."
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[#333333]">
            Email
          </span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Please enter your email id"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            required
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-custom-gradient px-4 py-3 font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Sending..." : "Send Reset Link"}
        </button>

        <Link
          to="/login"
          className="block text-center text-sm font-semibold text-blue-700 hover:text-blue-900"
        >
          Back to login
        </Link>
      </form>
    </AuthShell>
  );
}

function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#0F172A_0%,#1E3A8A_35%,#F8FAFC_35%,#FFFFFF_100%)] p-4 sm:p-6">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-[32px] border border-white/70 bg-white shadow-[0_40px_120px_rgba(15,23,42,0.22)]">
        <div className="hidden flex-1 bg-[radial-gradient(circle_at_top,#60A5FA_0%,transparent_38%),linear-gradient(180deg,rgba(9,38,84,0.82)_0%,rgba(10,30,72,0.92)_100%)] p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <img src="/Login/waisl.svg" alt="WAISL" className="h-10 w-fit" />
          <div>
            <p className="max-w-md text-4xl font-semibold leading-tight">
              Device operations and campaign control from a single secure
              dashboard.
            </p>
            <p className="mt-4 max-w-lg text-white/70">
              Keep airport displays, notices, tickers, and ads aligned with one
              controlled workflow.
            </p>
          </div>
          <img
            src="/Login/login-illustration.svg"
            alt="Illustration"
            className="max-h-[420px] w-full object-contain"
          />
        </div>

        <div className="flex w-full items-center justify-center bg-white px-6 py-10 lg:w-[46%] lg:px-10">
          <div className="w-full max-w-md">
            <img
              src="/Login/DELHI-IGIA-GMR.png"
              alt="Delhi Metro"
              className="ml-auto h-16 w-fit"
            />
            <h1 className="mt-10 text-4xl font-bold tracking-tight text-slate-900">
              {title}
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">{subtitle}</p>
            <div className="mt-8">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
