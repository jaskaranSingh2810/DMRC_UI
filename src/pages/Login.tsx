import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
  const [searchParams] = useSearchParams();
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

  useEffect(() => {
    if (!user?.accessToken) return;

    const isKiosk = searchParams.get("kiosk");

    if (isKiosk === "true") {
      window.location.href = "http://localhost:8083/device/view?kiosk=true";
          return;
    }

    const redirectPath = searchParams.get("redirect") || "/dashboard";
    navigate(redirectPath, { replace: true });

  }, [user?.accessToken]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const { name, value, type, checked } = event.target;
    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleLogin = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    await dispatch(
      loginUser({
        username: form.username,
        password: form.password,
        remember: form.remember,
      }),
    );
  };

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex overflow-hidden border border-white/70 bg-white shadow-[0_40px_120px_rgba(15,23,42,0.24)]">
        <div className="relative hidden overflow-hidden lg:block flex-[0.5]">
          <img
            src="/Images/Login/Login_Left.png"
            alt="Login Visual"
            className="h-full w-full object-cover"
          />
        </div>

        <div className="flex flex-[0.5] w-full items-center justify-center bg-white px-6 py-8 sm:px-8 lg:w-[42%] lg:px-12">
          <div className="absolute top-[30px] right-[30px] overflow-hidden">
            <img
              src="/Images/Login/Delhi_Metro.png"
              alt="Login Visual"
              className="h-8 w-auto object-cover"
            />
          </div>
          <form onSubmit={handleLogin} className="w-full max-w-lg">
            <div className="flex items-start justify-between gap-6">
              <img
                src="/Images/Login/Login_Top.png"
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
                  className="absolute right-3 top-[34px] rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
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
