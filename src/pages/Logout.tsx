import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useAppDispatch } from "@/store/hooks";
import { logoutUser } from "@/store/slices/authSlice";

const Logout = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const logout = async () => {
      try {
        await dispatch(logoutUser()).unwrap();
      } finally {
        const isKiosk = searchParams.get("kiosk") === "true";

        navigate(isKiosk ? "/login?kiosk=true" : "/login", { replace: true });
      }
    };

    logout();
  }, [dispatch, navigate, searchParams]);

  return null;
};

export default Logout;
