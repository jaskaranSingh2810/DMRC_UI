import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearAuthMessages, loginUser } from "@/store/slices/authSlice";
import { useToast } from "@/hooks/useToast";

interface LoginFormState {
  username: string;
  password: string;
  remember: boolean;
}

export default function Login() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const toast = useToast();
  const { user, error, loading } = useAppSelector((state) => state.auth);

  const [form, setForm] = useState<LoginFormState>({
    username: "",
    password: "",
    remember: false,
  });
  const [showPassword, setShowPassword] = useState<boolean>(false);

  useEffect(() => {
    dispatch(clearAuthMessages());
  }, [dispatch]);

  useEffect(() => {
    if (user?.accessToken) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate, user?.accessToken]);

  useEffect(() => {
    if (error) {
      toast.error(error, "Login");
    }
  }, [error, toast]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const { name, value, type, checked } = event.target;
    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    await dispatch(
      loginUser({
        username: form.username,
        password: form.password,
        remember: form.remember,
      })
    );
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#0F172A_0%,#1D4ED8_28%,#F8FAFC_28%,#FFFFFF_100%)] p-4 sm:p-6">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1500px] overflow-hidden rounded-[34px] border border-white/70 bg-white shadow-[0_40px_120px_rgba(15,23,42,0.24)]">
        <div className="relative hidden flex-1 overflow-hidden lg:block">
          <img
            src="/Login/Login-page-1.png"
            alt="Login Visual"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,18,43,0.16)_0%,rgba(7,18,43,0.38)_100%)]" />
          <div className="absolute inset-x-10 bottom-10 rounded-[28px] border border-white/20 bg-white/10 p-6 text-white backdrop-blur-md">
            <img src="/Login/waisl.svg" alt="WAISL" className="h-9 w-fit" />
            <p className="mt-6 max-w-lg text-3xl font-semibold leading-tight">
              Secure control for airport media devices, notices, tickers, and ad
              operations.
            </p>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/80">
              Designed for real-time monitoring and operational teams that need a
              fast, role-aware workflow.
            </p>
          </div>
        </div>

        <div className="flex w-full items-center justify-center bg-white px-6 py-8 sm:px-8 lg:w-[42%] lg:px-12">
          <form onSubmit={handleLogin} className="w-full max-w-md">
            <div className="flex items-start justify-between gap-6">
              <img
                src="/Login/Login-page-2.png"
                alt="DMRC Logo"
                className="h-14 w-auto sm:h-16"
              />
            </div>

            <h1 className="mt-12 text-4xl font-bold tracking-tight text-slate-900">
              Welcome Back
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              Log in to manage, track, and optimize your ad campaigns
              effortlessly.
            </p>

            <div className="mt-8 space-y-5">
              <div className="relative">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Email
                </label>
                <input
                  type="text"
                  name="username"
                  value={form.username}
                  placeholder="Please enter your email id"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="relative">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Password
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  placeholder="Please enter your password"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 pr-12 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-[42px] rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  onClick={() => setShowPassword((previous) => !previous)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div className="flex items-center justify-between gap-4 text-sm">
                <label className="flex items-center gap-2 text-slate-600">
                  <input
                    type="checkbox"
                    name="remember"
                    checked={form.remember}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-slate-300 accent-blue-700"
                  />
                  Remember me
                </label>
                <Link
                  to="/forgot-password"
                  className="font-semibold text-blue-700 transition hover:text-blue-900"
                >
                  Forgot Password
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-8 w-full rounded-2xl bg-custom-gradient py-3 font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-80"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

