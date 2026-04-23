import { useAppDispatch } from "@/store/hooks";
import { pushToast } from "@/store/slices/uiSlice";

export function useToast() {
  const dispatch = useAppDispatch();

  return {
    success(message: string, title: string = "Success") {
      dispatch(pushToast({ variant: "success", title, message }));
    },
    error(message: string, title: string = "Error") {
      dispatch(pushToast({ variant: "error", title, message }));
    },
    warning(message: string, title: string = "Warning") {
      dispatch(pushToast({ variant: "warning", title, message }));
    },
    info(message: string, title: string = "Info") {
      dispatch(pushToast({ variant: "info", title, message }));
    },
  };
}
