import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch } from "@/store/hooks";
import { logoutUser } from "@/store/slices/authSlice";

export default function LogoutButton() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleLogout = async (): Promise<void> => {
    const shouldLogout = window.confirm("Are you sure you want to logout?");
    if (shouldLogout) {
      await dispatch(logoutUser());
      navigate("/login", { replace: true });
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-white transition hover:bg-red-600"
    >
      <LogOut size={18} />
      Logout
    </button>
  );
}

