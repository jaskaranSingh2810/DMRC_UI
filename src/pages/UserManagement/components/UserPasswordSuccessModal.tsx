import { Check } from "lucide-react";
import Modal from "@/components/ui/Modal";

export default function UserPasswordSuccessModal({
  onClose,
}: {
  onClose: () => void;
}) {
  return (
    <Modal onClose={onClose} className="max-w-[420px] rounded-[20px]">
      <div className="px-7 py-10 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#12B76A] text-white">
          <Check size={40} />
        </div>
        <h3 className="mt-6 text-[28px] font-semibold text-[#101828]">
          Password Changes Successfully
        </h3>
        <p className="mt-3 text-[14px] leading-6 text-[#667085]">
          The password has been updated successfully. The user will be notified
          of this change.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-7 rounded-[10px] bg-custom-gradient px-8 py-3 text-[14px] font-semibold text-white"
        >
          Okay
        </button>
      </div>
    </Modal>
  );
}
