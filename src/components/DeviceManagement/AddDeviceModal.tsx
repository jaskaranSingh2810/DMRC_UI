import { ChevronDown, Monitor, Smartphone } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/hooks/useToast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearDeviceMessages, createDevice } from "@/store/slices/deviceSlice";
import {
  clearLocationMessages,
  fetchLocations,
} from "@/store/slices/locationSlice";
import type { DeviceRecord } from "@/types";

interface AddDeviceModalProps {
  onClose: () => void;
  mode?: "create" | "edit";
  device?: DeviceRecord | null;
  onSave?: (payload: DeviceFormSubmitPayload) => Promise<void>;
}

export interface DeviceFormSubmitPayload {
  brand: string;
  model: string;
  landmark?: string;
  orientation: string;
  locationId: number;
  deviceSize: number;
}

interface DeviceFormState {
  serviceId: string;
  brand: string;
  model: string;
  landmark: string;
  orientation: string;
  locationId: string;
  deviceSize: string;
}

const getDeviceLocationId = (device?: DeviceRecord | null): string => {
  if (!device) {
    return "";
  }

  const normalizedLocationId =
    device.locationId ?? device.locations?.locationId ?? "";

  return normalizedLocationId === null || normalizedLocationId === undefined
    ? ""
    : String(normalizedLocationId);
};

const createInitialState = (device?: DeviceRecord | null): DeviceFormState => ({
  serviceId: device?.deviceCode ?? "",
  brand: device?.brand ?? "",
  model: device?.model ?? "",
  landmark: device?.landmark ?? "",
  orientation: device?.orientation ?? "Landscape",
  locationId: getDeviceLocationId(device),
  deviceSize: device ? String(device.deviceSize) : "",
});

export default function AddDeviceModal({
  onClose,
  mode = "create",
  device = null,
  onSave,
}: AddDeviceModalProps) {
  const dispatch = useAppDispatch();
  const toast = useToast();
  const { loading, successMessage } = useAppSelector((state) => state.devices);
  const { items: locationList, listLoaded: locationListLoaded } =
    useAppSelector((state) => state.locations);
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [form, setForm] = useState<DeviceFormState>(createInitialState(device));
  const [orientationMenuOpen, setOrientationMenuOpen] = useState(false);
  const [locationMenuOpen, setLocationMenuOpen] = useState(false);
  const orientationMenuRef = useRef<HTMLDivElement | null>(null);
  const locationMenuRef = useRef<HTMLDivElement | null>(null);

  const isEditMode = mode === "edit";
  const orientationOptions = ["Portrait", "Landscape"] as const;

  useEffect(() => {
    if (!locationListLoaded) {
      void dispatch(fetchLocations());
    }
  }, [dispatch, locationListLoaded]);

  useEffect(() => {
    dispatch(clearDeviceMessages());
    dispatch(clearLocationMessages());
  }, [dispatch]);

  useEffect(() => {
    setForm(createInitialState(device));
    setStep("form");
  }, [device, mode]);

  useEffect(() => {
    if (
      !isEditMode ||
      form.locationId ||
      !device ||
      locationList.length === 0
    ) {
      return;
    }

    const deviceLocationName =
      device.locationName ?? device.locations?.locationName ?? "";

    if (!deviceLocationName) {
      return;
    }

    const matchedLocation = locationList.find(
      (location) => location.locationName === deviceLocationName,
    );

    if (!matchedLocation) {
      return;
    }

    setForm((previous) => ({
      ...previous,
      locationId: String(matchedLocation.locationId),
    }));
  }, [device, form.locationId, isEditMode, locationList]);

  useEffect(() => {
    if (!isEditMode && successMessage === "Device created successfully.") {
      onClose();
    }
  }, [isEditMode, onClose, successMessage]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        orientationMenuRef.current &&
        !orientationMenuRef.current.contains(event.target as Node)
      ) {
        setOrientationMenuOpen(false);
      }

      if (
        locationMenuRef.current &&
        !locationMenuRef.current.contains(event.target as Node)
      ) {
        setLocationMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleOrientationChange = (
    value: (typeof orientationOptions)[number],
  ) => {
    setForm((previous) => ({
      ...previous,
      orientation: value,
    }));
    setOrientationMenuOpen(false);
  };

  const handleLocationChange = (value: string) => {
    setForm((previous) => ({
      ...previous,
      locationId: value,
    }));
    setLocationMenuOpen(false);
  };

  const selectedLocationLabel =
    locationList.find(
      (location) => String(location.locationId) === String(form.locationId),
    )?.locationName ?? "Select location";

  const getPayload = (): DeviceFormSubmitPayload | null => {
    const locationId = Number(form.locationId);
    const deviceSize = Number(form.deviceSize);
    if (!locationId || !Number.isFinite(deviceSize) || deviceSize <= 0) {
      toast.warning(
        "Please fill all required fields before continuing.",
        "Device",
      );
      return null;
    }

    return {
      brand: form.brand.trim(),
      model: form.model.trim(),
      ...(form.landmark.trim() ? { landmark: form.landmark.trim() } : {}),
      orientation: form.orientation,
      locationId,
      deviceSize,
    };
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = getPayload();
    if (!payload) {
      return;
    }

    if (isEditMode) {
      if (!onSave) {
        return;
      }

      void onSave(payload);
      return;
    }

    setStep("confirm");
  };

  const handleCreate = async () => {
    const payload = getPayload();
    if (!payload) {
      setStep("form");
      return;
    }

    const result = await dispatch(
      createDevice({
        ...payload,
        userName: "Jaskaran Singh",
      }),
    );

    if (createDevice.rejected.match(result) && result.payload) {
      toast.error(result.payload, "Device");
      setStep("form");
    }
  };

  if (step === "confirm" && !isEditMode) {
    return (
      <Modal onClose={() => setStep("form")} className="max-w-md">
        <div className="px-8 py-9 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-sky-50">
            <img
              src="/Images/DeviceManagement/Add_Device_Confirmation.png"
              alt="Add Device"
              className="h-20 w-20"
            />
          </div>
          <h3 className="mt-6 text-[22px] font-500 leading-tight text-[#333333]">
            Are you sure want to add this Device?
          </h3>
          <p className="mt-4 text-[14px] font-400 leading-6 text-[#566272]">
            This device will be added and made available for device
            registration. Do you want to continue?
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setStep("form")}
              className="rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => void handleCreate()}
              className="rounded-xl bg-custom-gradient px-4 py-3 font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Adding..." : "Yes"}
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      onClose={onClose}
      className="max-h-[calc(100vh-2rem)] max-w-[880px] overflow-y-auto"
    >
      <form onSubmit={handleSubmit} className="px-6 pb-6 pt-5 sm:px-8 sm:pb-8">
        <h2 className="text-[20px] font-semibold tracking-tight text-slate-900">
          {isEditMode ? "Edit Device" : "Add New Device"}
        </h2>
        <p className="mt-2 text-[14px] font-400">
          {isEditMode
            ? "Update the required details for this device."
            : "Fill in the required details to register a new device for content scheduling and monitoring."}
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {isEditMode ? (
            <Field label="Service ID*">
              <input
                name="serviceId"
                value={form.serviceId}
                disabled
                className="w-full rounded-xl border border-slate-200 bg-[#F6F6F6] px-4 py-3 text-sm text-[#566272] outline-none"
              />
            </Field>
          ) : null}

          <Field label="Brand*">
            <input
              name="brand"
              value={form.brand}
              onChange={handleChange}
              className={`w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition ${
                isEditMode
                  ? "bg-[#F6F6F6] text-[#566272]"
                  : "focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              }`}
              placeholder="Enter Brand"
              required
              disabled={isEditMode}
            />
          </Field>

          <Field label="Model*">
            <input
              name="model"
              value={form.model}
              onChange={handleChange}
              className={`w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition ${
                isEditMode
                  ? "bg-[#F6F6F6] text-[#566272]"
                  : "focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              }`}
              placeholder="Enter Model"
              required
              disabled={isEditMode}
            />
          </Field>

          <Field label="Orientation*">
            <div ref={orientationMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setOrientationMenuOpen((current) => !current)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-[#333333] outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                aria-haspopup="listbox"
                aria-expanded={orientationMenuOpen}
              >
                <span>{form.orientation}</span>
                <ChevronDown
                  size={18}
                  className={`text-[#5E1B7F] transition ${
                    orientationMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {orientationMenuOpen ? (
                <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-20 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
                  {orientationOptions.map((option) => {
                    const isSelected = form.orientation === option;

                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => handleOrientationChange(option)}
                        className={`flex w-full items-center gap-3 px-4 py-3 text-sm transition ${
                          isSelected
                            ? "bg-[#F4ECFA] text-[#7C3AA8]"
                            : "bg-white text-[#333333] hover:bg-slate-50"
                        }`}
                        role="option"
                        aria-selected={isSelected}
                      >
                        <span
                          className={`flex h-5 w-5 items-center justify-center ${
                            isSelected ? "text-[#A855F7]" : "text-slate-500"
                          }`}
                        >
                          {option === "Portrait" ? (
                            <Smartphone size={16} />
                          ) : (
                            <Monitor size={16} />
                          )}
                        </span>
                        <span>{option}</span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </Field>

          <Field label="Select Location*">
            <div ref={locationMenuRef} className="relative">
              <button
                type="button"
                onClick={() =>
                  !isEditMode && setLocationMenuOpen((current) => !current)
                }
                disabled={isEditMode}
                className={`flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-left text-sm outline-none transition ${
                  isEditMode
                    ? "bg-[#F6F6F6] text-[#566272]"
                    : "bg-white text-[#333333] focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                }`}
                aria-haspopup="listbox"
                aria-expanded={locationMenuOpen}
              >
                <span>{selectedLocationLabel}</span>
                <ChevronDown
                  size={18}
                  className={`text-[#5E1B7F] transition ${
                    locationMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {locationMenuOpen && !isEditMode ? (
                <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-20 max-h-56 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
                  {locationList.map((location) => {
                    const isSelected =
                      String(location.locationId) === String(form.locationId);

                    return (
                      <button
                        key={location.locationId}
                        type="button"
                        onClick={() =>
                          handleLocationChange(String(location.locationId))
                        }
                        className={`flex w-full items-center gap-3 px-4 py-3 text-sm transition ${
                          isSelected
                            ? "bg-[#F4ECFA] text-[#7C3AA8]"
                            : "bg-white text-[#333333] hover:bg-slate-50"
                        }`}
                        role="option"
                        aria-selected={isSelected}
                      >
                        <span>{location.locationName}</span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </Field>

          <Field label="Select Size*">
            <div className="relative">
              <input
                name="deviceSize"
                type="number"
                min="1"
                value={form.deviceSize}
                onChange={handleChange}
                className={`w-full rounded-xl border border-slate-200 px-4 py-3 pr-16 text-sm outline-none transition ${
                  isEditMode
                    ? "bg-[#F6F6F6] text-[#566272]"
                    : "focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                }`}
                placeholder="Enter Size"
                required
                disabled={isEditMode}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[16px] font-500 text-[#333333]">
                Inch
              </span>
            </div>
          </Field>

          <Field label="Landmark">
            <input
              name="landmark"
              value={form.landmark}
              onChange={handleChange}
              className={`w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition ${
                isEditMode
                  ? "bg-[#F6F6F6] text-[#566272]"
                  : "focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              }`}
              placeholder="Enter Landmark"
            />
          </Field>
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[8px] border border-[#333333] px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-[8px] bg-custom-gradient px-4 py-3 font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading
              ? isEditMode
                ? "Saving..."
                : "Adding..."
              : isEditMode
                ? "Save"
                : "Add Device"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  const isRequired = label.endsWith("*");
  const labelText = isRequired ? label.slice(0, -1) : label;

  return (
    <label className="block">
      <span className="mb-2 block text-[14px] font-400 text-slate-700">
        {labelText}
        {isRequired ? <span className="text-[#B4272A]">*</span> : null}
      </span>
      {children}
    </label>
  );
}
