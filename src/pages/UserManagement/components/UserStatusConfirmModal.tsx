import Modal from "@/components/ui/Modal";
import type { ManagedUserRecord } from "@/types";

interface UserStatusConfirmModalProps {
  user: ManagedUserRecord;
  nextStatus: "Active" | "Inactive";
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export default function UserStatusConfirmModal({
  user,
  nextStatus,
  loading = false,
  onClose,
  onConfirm,
}: UserStatusConfirmModalProps) {
  const isActivate = nextStatus === "Active";

  return (
    <Modal onClose={onClose} className="max-w-[420px] rounded-[20px]">
      <div className="px-7 py-8 text-center">
        <img
          src="/Images/UserManagement/Deactivate_Users.png"
          alt="Confirm status change"
          className="mx-auto h-20 w-20"
        />
        <h3 className="mt-5 text-[24px] font-semibold text-[#101828]">
          {isActivate ? "Activate User" : "Deactivate User"}
        </h3>
        <p className="mt-3 text-[14px] leading-6 text-[#667085]">
          Are you sure you want to {isActivate ? "activate" : "deactivate"}{" "}
          {user.employeeName}?
        </p>

        <div className="mt-7 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={loading}
            className="rounded-[10px] bg-custom-gradient px-4 py-3 text-[14px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Processing..." : "Yes"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-[10px] border border-[#D0D5DD] px-4 py-3 text-[14px] font-semibold text-[#344054] disabled:cursor-not-allowed disabled:opacity-70"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}
