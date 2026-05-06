import Toast from "./Toast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { removeToast } from "@/store/slices/uiSlice";

export default function Toaster() {
  const dispatch = useAppDispatch();
  const toasts = useAppSelector((state) => state.ui.toasts);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed top-4 left-1/2 z-[120] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 flex-col gap-3">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast toast={toast} onClose={(id) => dispatch(removeToast(id))} />
        </div>
      ))}
    </div>
  );
}
