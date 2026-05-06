import { Loader2, LockKeyhole } from "lucide-react";
import Modal from "@/components/ui/Modal";
import type { ManagedUserRecord } from "@/types";

interface UserPasswordModalProps {
  user: ManagedUserRecord;
  loading: boolean;
  message: string | null;
  error: string | null;
  onClose: () => void;
  onSubmit: () => Promise<void>;
}

export default function UserPasswordModal({
  user,
  loading,
  message,
  error,
  onClose,
  onSubmit,
}: UserPasswordModalProps) {
  const resolvedMessage =
    message ??
    "We've sent a password reset link to the user's registered email. Please ask them to check their inbox.";

  return (
    <Modal onClose={onClose} className="max-w-[460px] rounded-[20px]">
      <div className="px-7 py-8 text-center">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#F2F4F7] text-[#003975]">
            {loading ? (
              <Loader2 size={28} className="animate-spin" />
            ) : (
              <LockKeyhole size={32} />
            )}
          </div>
          <h3 className="mt-5 text-[26px] font-semibold text-[#101828]">
            {loading
              ? "Sending Reset Link"
              : error
                ? "Unable to Send Reset Link"
                : "Password Reset Link Sent"}
          </h3>
          <p className="mt-2 max-w-[320px] text-[13px] leading-5 text-[#667085]">
            {loading
              ? `Sending a password reset link for ${user.employeeName}.`
              : error ?? resolvedMessage}
          </p>
        </div>

        <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => void onSubmit()}
            disabled={loading || Boolean(message)}
            className="rounded-[10px] bg-custom-gradient px-4 py-3 text-[14px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Sending..." : message ? "Sent" : "Send Reset Link"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-[10px] border border-[#D0D5DD] px-4 py-3 text-[14px] font-semibold text-[#344054] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {message || error ? "Okay" : "Cancel"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
