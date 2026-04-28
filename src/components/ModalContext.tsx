import { createContext, useContext, useState, ReactNode } from "react";
import AddDeviceModal from "@/components/DeviceManagement/AddDeviceModal";

export type ModalType = "ADD_DEVICE" | null;

interface ModalContextType {
  openModal: (type: ModalType) => void;
  closeModal: () => void;
}

const ModalContext = createContext<ModalContextType | null>(null);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<ModalType>(null);

  const openModal = (type: ModalType) => setModal(type);
  const closeModal = () => setModal(null);

  return (
    <ModalContext.Provider value={{ openModal, closeModal }}>
      {children}

      {/* {modal === "ADD_DEVICE" && (
        <AddDeviceModal onClose={closeModal} />
      )}

      {modal === "ADD_USER" && (
        <AddUserModal onClose={closeModal} />
      )} */}
      {modal === "ADD_DEVICE" && <AddDeviceModal onClose={closeModal} />}
    </ModalContext.Provider>
  );
}

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModal must be used within ModalProvider");
  }
  return context;
};
