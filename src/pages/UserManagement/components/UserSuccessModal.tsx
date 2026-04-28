import { Check } from "lucide-react";
import Modal from "@/components/ui/Modal";

interface UserSuccessModalProps {
  title: string;
  description: string;
  onClose: () => void;
}

export default function UserSuccessModal({
  title,
  description,
  onClose,
}: UserSuccessModalProps) {
  return (
    <Modal onClose={onClose} className="max-w-[420px] rounded-[20px]">
      <div className="px-7 py-10 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#12B76A] text-white">
          <Check size={40} />
        </div>
        <h3 className="mt-6 text-[28px] font-semibold text-[#101828]">{title}</h3>
        <p className="mt-3 text-[14px] leading-6 text-[#667085]">{description}</p>
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
