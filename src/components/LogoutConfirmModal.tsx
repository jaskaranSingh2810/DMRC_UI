import { LogOut } from "lucide-react";
import Modal from "@/components/ui/Modal";

interface LogoutConfirmModalProps {
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}

export default function LogoutConfirmModal({
  loading = false,
  onCancel,
  onConfirm,
}: LogoutConfirmModalProps) {
  return (
    <Modal onClose={onCancel} className="max-w-[420px]">
      <div className="px-5 py-8 text-center sm:px-8 sm:py-9">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#FCE8E8]">
          {/* <LogOut size={38} className="text-[#F05A59]" /> */}
          <img src="/Logout_Confirmation.png" alt="Logout Confirmation" />
        </div>

        <h3 className="mt-6 text-[22px] font-semibold leading-tight text-[#333333]">
          Are you sure want Logout?
        </h3>

        <p className="mt-4 text-[14px] leading-7 text-[#566272]">
          Logging out will stop all scheduled activities and remove this device
          from active operations.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-4">
          <button
            type="button"
            disabled={loading}
            onClick={() => void onConfirm()}
            className="rounded-[10px] bg-custom-gradient px-4 py-3 font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Logging out..." : "Yes, Logout"}
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="rounded-[10px] border border-[#333333] px-4 py-3 font-semibold text-[#333333] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}
