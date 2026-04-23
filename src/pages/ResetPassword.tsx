import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearAuthMessages, resetPassword } from "@/store/slices/authSlice";
import { useToast } from "@/hooks/useToast";

export default function ResetPassword() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const { loading, error, successMessage } = useAppSelector((state) => state.auth);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);

  useEffect(() => {
    dispatch(clearAuthMessages());
  }, [dispatch]);

  useEffect(() => {
    if (successMessage) {
      toast.success(successMessage, "Password reset");
      window.setTimeout(() => navigate("/login", { replace: true }), 1000);
    }
  }, [navigate, successMessage, toast]);

  useEffect(() => {
    if (error) {
      toast.error(error, "Password reset");
    }
  }, [error, toast]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!token) {
      toast.error("Reset token is missing from the URL.", "Password reset");
      return;
    }

    if (password !== confirmPassword) {
      toast.warning("Passwords do not match.", "Password reset");
      return;
    }

    await dispatch(resetPassword({ token, password }));
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#0F172A_0%,#1E3A8A_35%,#F8FAFC_35%,#FFFFFF_100%)] p-4 sm:p-6">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-[32px] border border-white/70 bg-white shadow-[0_40px_120px_rgba(15,23,42,0.22)]">
        <div className="hidden flex-1 bg-[radial-gradient(circle_at_top,#60A5FA_0%,transparent_38%),linear-gradient(180deg,rgba(9,38,84,0.82)_0%,rgba(10,30,72,0.92)_100%)] p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <img src="/Login/daps.svg" alt="DAPS" className="h-10 w-fit" />
          <div>
            <p className="max-w-md text-4xl font-semibold leading-tight">
              Set a fresh password and return to your scheduling workspace.
            </p>
            <p className="mt-4 max-w-lg text-white/70">
              This reset flow is built into the same frontend state layer as the
              login experience.
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
              Create New Password
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Use a strong password you have not used before.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <PasswordField
                label="New Password"
                value={password}
                visible={showPassword}
                onToggle={() => setShowPassword((previous) => !previous)}
                onChange={setPassword}
              />
              <PasswordField
                label="Confirm Password"
                value={confirmPassword}
                visible={showPassword}
                onToggle={() => setShowPassword((previous) => !previous)}
                onChange={setConfirmPassword}
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-custom-gradient px-4 py-3 font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Updating..." : "Reset Password"}
              </button>

              <Link
                to="/login"
                className="block text-center text-sm font-semibold text-blue-700 hover:text-blue-900"
              >
                Back to login
              </Link>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function PasswordField({
  label,
  value,
  visible,
  onToggle,
  onChange,
}: {
  label: string;
  value: string;
  visible: boolean;
  onToggle: () => void;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </span>
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 pr-12 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          required
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </label>
  );
}
