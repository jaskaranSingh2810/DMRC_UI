export default function Unauthorized() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#dbeafe_0%,#eff6ff_30%,#f8fafc_100%)] p-6">
      <div className="max-w-lg rounded-[28px] border border-slate-200 bg-white p-10 text-center shadow-[0_25px_80px_rgba(15,23,42,0.12)]">
        <p className="text-sm font-semibold uppercase tracking-[0.4em] text-rose-600">
          Access denied
        </p>
        <h1 className="mt-4 text-4xl font-bold text-slate-900">
          403 - Unauthorized Access
        </h1>
        <p className="mt-4 text-sm leading-6 text-slate-500">
          Your account does not have permission to open this area. Sign in with
          a role that is allowed to manage this section.
        </p>
      </div>
    </div>
  );
}

