import { LogOut } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import LogoutConfirmModal from "@/components/LogoutConfirmModal";
import { useAppDispatch } from "@/store/hooks";
import { logoutUser } from "@/store/slices/authSlice";

export default function LogoutButton() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogout = async (): Promise<void> => {
    try {
      setLoading(true);
      await dispatch(logoutUser());
      navigate("/login", { replace: true });
    } finally {
      setLoading(false);
      setConfirmOpen(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setConfirmOpen(true)}
        className="flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-white transition hover:bg-red-600"
      >
        <LogOut size={18} />
        Logout
      </button>

      {confirmOpen ? (
        <LogoutConfirmModal
          loading={loading}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => void handleLogout()}
        />
      ) : null}
    </>
  );
}

