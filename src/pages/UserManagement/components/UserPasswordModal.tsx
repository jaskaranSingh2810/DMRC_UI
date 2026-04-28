import { useState } from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import Modal from "@/components/ui/Modal";
import type { ManagedUserRecord } from "@/types";

interface UserPasswordModalProps {
  user: ManagedUserRecord;
  onClose: () => void;
  onSubmit: (password: string) => Promise<void>;
}

export default function UserPasswordModal({
  user,
  onClose,
  onSubmit,
}: UserPasswordModalProps) {
  const [password, setPassword] = useState(user.password ?? "");
  const [confirmPassword, setConfirmPassword] = useState(user.password ?? "");
  const [showPassword, setShowPassword] = useState(true);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!password.trim() || !confirmPassword.trim()) {
      setError("Both password fields are required.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    await onSubmit(password);
  };

  return (
    <Modal onClose={onClose} className="max-w-[460px] rounded-[20px]">
      <div className="px-7 py-8">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F2F4F7] text-[#003975]">
            <LockKeyhole size={26} />
          </div>
          <h3 className="mt-5 text-[26px] font-semibold text-[#101828]">
            Change Password
          </h3>
          <p className="mt-2 max-w-[280px] text-[13px] leading-5 text-[#667085]">
            Set a new password for this user to maintain account security.
          </p>
        </div>

        <div className="mt-6 space-y-4">
          <PasswordField
            label="New Password*"
            value={password}
            type={showPassword ? "text" : "password"}
            onChange={setPassword}
            visible={showPassword}
            onToggleVisibility={() => setShowPassword((current) => !current)}
          />
          <PasswordField
            label="Confirm New Password*"
            value={confirmPassword}
            type={showConfirmPassword ? "text" : "password"}
            onChange={setConfirmPassword}
            visible={showConfirmPassword}
            onToggleVisibility={() =>
              setShowConfirmPassword((current) => !current)
            }
          />
          {error ? <p className="text-[12px] text-[#D92D20]">{error}</p> : null}
        </div>

        <div className="mt-7 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => void handleSubmit()}
            className="rounded-[10px] bg-custom-gradient px-4 py-3 text-[14px] font-semibold text-white"
          >
            Change Password
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[10px] border border-[#D0D5DD] px-4 py-3 text-[14px] font-semibold text-[#344054]"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}

function PasswordField({
  label,
  value,
  type,
  visible,
  onChange,
  onToggleVisibility,
}: {
  label: string;
  value: string;
  type: "text" | "password";
  visible: boolean;
  onChange: (value: string) => void;
  onToggleVisibility: () => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium text-[#344054]">
        {label}
      </span>
      <div className="flex items-center rounded-[10px] border border-[#D0D5DD] px-3">
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full py-2.5 text-[14px] outline-none"
        />
        <button
          type="button"
          onClick={onToggleVisibility}
          className="text-[#667085]"
        >
          {visible ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>
      </div>
    </label>
  );
}
