import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Eye,
  Megaphone,
  Monitor,
  X,
} from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/hooks/useToast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchLocations } from "@/store/slices/locationSlice";
import {
  clearNoticeMessages,
  createNotice,
  fetchNoticeById,
  noticeThemes,
  updateNotice,
} from "@/store/slices/noticeSlice";
import type {
  DeviceLocation,
  Notice,
  NoticeMutationFormValues,
  NoticeThemeOption,
} from "@/types";
import {
  createNoticeMutationPayload,
  getNoticeThemeById,
  toggleNoticeLocationSelection,
} from "./noticeManagementHelpers";

interface NoticeFormState {
  announcementName: string;
  description: string;
  selectedLocationIds: string[];
  themeId: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
}

interface NoticeLocationState {
  notice?: Notice;
}

const previewRows = [
  { destination: "New Delhi", platform: "5", time: "5 mins" },
  { destination: "Yashobhoomi", platform: "6", time: "5 mins" },
  { destination: "Dwarka Sec 21", platform: "3", time: "3 mins" },
  // { destination: "T3 Terminal", platform: "2", time: "7 mins" },
];

function createInitialFormState(notice?: Notice | null): NoticeFormState {
  return {
    announcementName: notice?.announcementName ?? notice?.title ?? "",
    description: notice?.description ?? "",
    selectedLocationIds:
      notice?.locations?.map((location) => String(location.locationId)) ?? [],
    themeId: notice?.themeId ?? noticeThemes[0]?.id ?? "",
    startDate: notice?.startDate ?? "",
    endDate: notice?.endDate ?? "",
    startTime: notice?.startTime ?? "",
    endTime: notice?.endTime ?? "",
  };
}

function validateNoticeForm(values: NoticeFormState): string | null {
  if (!values.announcementName.trim()) {
    return "Announcement name is required.";
  }

  if (!values.description.trim()) {
    return "Description is required.";
  }

  if (!values.selectedLocationIds.length) {
    return "Select at least one location.";
  }

  if (!values.themeId) {
    return "Select a theme.";
  }

  if (!values.startDate || !values.endDate) {
    return "Start date and end date are required.";
  }

  if (!values.startTime || !values.endTime) {
    return "Start time and end time are required.";
  }

  const start = new Date(`${values.startDate}T${values.startTime}:00`);
  const end = new Date(`${values.endDate}T${values.endTime}:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "Enter a valid schedule.";
  }

  if (end.getTime() < start.getTime()) {
    return "End schedule must be after start schedule.";
  }

  return null;
}

function getPublishStatus(values: NoticeFormState): string {
  const start = new Date(`${values.startDate}T${values.startTime}:00`);
  return start.getTime() <= Date.now() ? "LIVE" : "SCHEDULED";
}

export default function CreateNotice() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const toast = useToast();
  const routeState = useLocation().state as NoticeLocationState | null;
  const { noticeId } = useParams<{ noticeId: string }>();
  const isEditMode = Boolean(noticeId);
  const { user } = useAppSelector((state) => state.auth);
  const { items: locations, listLoaded: locationListLoaded } = useAppSelector(
    (state) => state.locations,
  );
  const { loading } = useAppSelector((state) => state.notices);

  const [form, setForm] = useState<NoticeFormState>(() =>
    createInitialFormState(routeState?.notice ?? null),
  );
  const [pageLoading, setPageLoading] = useState(false);
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [publishSuccessOpen, setPublishSuccessOpen] = useState(false);
  const hydratedNoticeKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!locationListLoaded) {
      void dispatch(fetchLocations());
    }
  }, [dispatch, locationListLoaded]);

  useEffect(() => {
    const routeNoticeId = routeState?.notice?.noticeId;
    const currentHydrationKey = String(routeNoticeId ?? noticeId ?? "create");

    if (hydratedNoticeKeyRef.current === currentHydrationKey) {
      return;
    }

    if (
      routeState?.notice &&
      (!noticeId || String(routeNoticeId) === String(noticeId))
    ) {
      setForm(createInitialFormState(routeState.notice));
      hydratedNoticeKeyRef.current = currentHydrationKey;
      return;
    }

    if (!noticeId) {
      hydratedNoticeKeyRef.current = currentHydrationKey;
      return;
    }

    hydratedNoticeKeyRef.current = currentHydrationKey;
    setPageLoading(true);
    void dispatch(fetchNoticeById(noticeId))
      .unwrap()
      .then((payload) => {
        setForm(createInitialFormState(payload.data));
      })
      .catch((error) => {
        toast.error(
          typeof error === "string" ? error : "Unable to load notice.",
          "Notice",
        );
      })
      .finally(() => setPageLoading(false));
  }, [dispatch, noticeId, routeState?.notice]);

  const selectedLocations = useMemo(
    () =>
      locations.filter((location) =>
        form.selectedLocationIds.includes(String(location.locationId)),
      ),
    [form.selectedLocationIds, locations],
  );
  const selectedTheme =
    getNoticeThemeById(noticeThemes, form.themeId) ?? noticeThemes[0];

  const handleFieldChange = <T extends keyof NoticeFormState>(
    key: T,
    value: NoticeFormState[T],
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const submitNotice = async (mode: "draft" | "publish") => {
    const validationError = validateNoticeForm(form);

    if (validationError) {
      toast.error(validationError, "Notice");
      return null;
    }

    const payload = createNoticeMutationPayload({
      ...form,
      status: mode === "draft" ? "DRAFT" : getPublishStatus(form),
      userName: user?.profile?.fullName ?? user?.profile?.username ?? "Admin",
    } satisfies NoticeMutationFormValues);

    try {
      const result = isEditMode
        ? await dispatch(
            updateNotice({
              noticeId,
              payload,
            }),
          ).unwrap()
        : await dispatch(createNotice({ payload })).unwrap();

      dispatch(clearNoticeMessages());

      if (mode === "draft") {
        toast.success(
          isEditMode
            ? "Notice updated successfully."
            : "Notice saved as draft.",
          "Notice",
        );
      } else {
        toast.success(
          isEditMode
            ? "Notice published successfully."
            : "Notice scheduled successfully.",
          "Notice",
        );
      }

      if (!isEditMode) {
        navigate(`/notice-management/${result.data.noticeId}/edit`, {
          replace: true,
          state: { notice: result.data },
        });
      }

      return result.data;
    } catch (error) {
      dispatch(clearNoticeMessages());
      toast.error(
        typeof error === "string" ? error : "Unable to save notice.",
        "Notice",
      );
      return null;
    }
  };

  const handleSaveDraft = async () => {
    await submitNotice("draft");
  };

  const handlePublish = async () => {
    const notice = await submitNotice("publish");

    if (notice) {
      setPublishConfirmOpen(false);
      setPublishSuccessOpen(true);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2 text-sm text-[#333333]">
              <span
                className="text-[24px] font-[400] cursor-pointer
                transition hover:text-[#2C67B3]"
                onClick={() => navigate("/notice-management")}
              >
                Notice Management
              </span>
              <ChevronRight className="h-6 w-6" />
              {!isEditMode ? (
                <span className="font-semibold text-[#333333] text-[24px]">
                  Create New Notice
                </span>
              ) : (
                <span className="font-semibold text-[#333333] text-[24px]">
                  Edit Notice
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => void handleSaveDraft()}
              disabled={loading || pageLoading}
              className="rounded-[10px] border border-[#D8D8DC] px-5 py-2.5 text-sm font-medium text-[#333333] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Save Draft
            </button>
            <button
              type="button"
              onClick={() => setPublishConfirmOpen(true)}
              disabled={loading || pageLoading}
              className="rounded-[10px] bg-custom-gradient px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Publish
            </button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_460px]">
          <div className="space-y-6">
            <section className="rounded-[18px] border border-[#E8E1EE] bg-white p-4 shadow-sm sm:p-5">
              <h2 className="text-[24px] font-semibold text-[#333333]">
                Content Details
              </h2>

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <Field label="Announcement Name*" htmlFor="announcementName">
                  <input
                    id="announcementName"
                    value={form.announcementName}
                    onChange={(event) =>
                      handleFieldChange("announcementName", event.target.value)
                    }
                    placeholder="Please enter announcement name"
                    className="h-12 w-full rounded-[10px] border border-[#E2E8F0] px-4 text-sm outline-none transition focus:border-[#5E1B7F] focus:ring-2 focus:ring-[#5E1B7F1A]"
                  />
                </Field>

                <Field label="Select Locations*" htmlFor="locationSelect">
                  <LocationMultiSelect
                    id="locationSelect"
                    locations={locations}
                    selectedLocationIds={form.selectedLocationIds}
                    onChange={(selectedLocationIds) =>
                      handleFieldChange(
                        "selectedLocationIds",
                        selectedLocationIds,
                      )
                    }
                  />
                </Field>
              </div>

              <div className="mt-5">
                <Field label="Description*" htmlFor="description">
                  <textarea
                    id="description"
                    value={form.description}
                    onChange={(event) =>
                      handleFieldChange("description", event.target.value)
                    }
                    placeholder="Please enter announcement description"
                    rows={4}
                    className="w-full rounded-[10px] border border-[#E2E8F0] px-4 py-3 text-sm outline-none transition focus:border-[#5E1B7F] focus:ring-2 focus:ring-[#5E1B7F1A]"
                  />
                </Field>
              </div>

              <div className="mt-6">
                <p className="text-sm font-medium text-[#333333]">Theme*</p>
                <div className="mt-4 grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                  {noticeThemes.map((theme) => (
                    <ThemeCard
                      key={theme.id}
                      theme={theme}
                      selected={theme.id === selectedTheme.id}
                      onSelect={() => handleFieldChange("themeId", theme.id)}
                    />
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-[18px] border border-[#E8E1EE] bg-white p-4 shadow-sm sm:p-5">
              <h2 className="text-[24px] font-semibold text-[#333333]">
                Schedule Settings
              </h2>

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <Field label="Start Date" htmlFor="startDate">
                  <input
                    id="startDate"
                    type="date"
                    value={form.startDate}
                    onChange={(event) =>
                      handleFieldChange("startDate", event.target.value)
                    }
                    className="h-12 w-full rounded-[10px] border border-[#E2E8F0] bg-transparent px-4 text-sm outline-none transition focus:border-[#5E1B7F] focus:ring-2 focus:ring-[#5E1B7F1A]"
                  />
                </Field>

                <Field label="Start Time" htmlFor="startTime">
                  <input
                    id="startTime"
                    type="time"
                    value={form.startTime}
                    onChange={(event) =>
                      handleFieldChange("startTime", event.target.value)
                    }
                    className="h-12 w-full rounded-[10px] border border-[#E2E8F0] bg-transparent px-4 text-sm outline-none transition focus:border-[#5E1B7F] focus:ring-2 focus:ring-[#5E1B7F1A]"
                  />
                </Field>

                <Field label="End Date" htmlFor="endDate">
                  <input
                    id="endDate"
                    type="date"
                    value={form.endDate}
                    onChange={(event) =>
                      handleFieldChange("endDate", event.target.value)
                    }
                    className="h-12 w-full rounded-[10px] border border-[#E2E8F0] bg-transparent px-4 text-sm outline-none transition focus:border-[#5E1B7F] focus:ring-2 focus:ring-[#5E1B7F1A]"
                  />
                </Field>

                <Field label="End Time" htmlFor="endTime">
                  <input
                    id="endTime"
                    type="time"
                    value={form.endTime}
                    onChange={(event) =>
                      handleFieldChange("endTime", event.target.value)
                    }
                    className="h-12 w-full rounded-[10px] border border-[#E2E8F0] bg-transparent px-4 text-sm outline-none transition focus:border-[#5E1B7F] focus:ring-2 focus:ring-[#5E1B7F1A]"
                  />
                </Field>
              </div>
            </section>
          </div>

          <aside className="rounded-[18px] border border-[#E8E1EE] bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-[#7C3AA8]" />
              <h2 className="text-[24px] font-semibold text-[#333333]">
                Live Preview
              </h2>
            </div>

            <div className="mt-5 space-y-5">
              <PreviewCard
                label="Portrait"
                icon={<Monitor className="h-4 w-4" />}
              >
                <NoticePreviewFrame
                  theme={selectedTheme}
                  title={form.announcementName}
                  description={form.description}
                  locations={selectedLocations}
                  orientation="portrait"
                />
              </PreviewCard>

              <PreviewCard
                label="Landscape"
                icon={<Monitor className="h-4 w-4 rotate-90" />}
              >
                <NoticePreviewFrame
                  theme={selectedTheme}
                  title={form.announcementName}
                  description={form.description}
                  locations={selectedLocations}
                  orientation="landscape"
                />
              </PreviewCard>
            </div>
          </aside>
        </div>
      </div>

      {publishConfirmOpen ? (
        <PublishConfirmModal
          onClose={() => setPublishConfirmOpen(false)}
          onPublish={() => void handlePublish()}
        />
      ) : null}

      {publishSuccessOpen ? (
        <PublishSuccessModal
          onClose={() => {
            setPublishSuccessOpen(false);
            navigate("/notice-management");
          }}
        />
      ) : null}
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="text-sm font-medium text-[#333333]">
        {label}
      </label>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function LocationMultiSelect({
  id,
  locations,
  selectedLocationIds,
  onChange,
}: {
  id: string;
  locations: DeviceLocation[];
  selectedLocationIds: string[];
  onChange: (locationIds: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const allLocationIds = locations.map((location) =>
    String(location.locationId),
  );
  const allSelected =
    allLocationIds.length > 0 &&
    allLocationIds.every((locationId) =>
      selectedLocationIds.includes(locationId),
    );

  const selectedLocations = locations.filter((location) =>
    selectedLocationIds.includes(String(location.locationId)),
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleClickOutside = () => setOpen(false);
    document.addEventListener("click", handleClickOutside);

    return () => document.removeEventListener("click", handleClickOutside);
  }, [open]);

  return (
    <div className="relative">
      <button
        id={id}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
        className="flex min-h-12 w-full items-center justify-between gap-3 rounded-[10px] border border-[#E2E8F0] px-4 py-2 text-left"
      >
        <div className="flex flex-wrap gap-2">
          {selectedLocations.length ? (
            selectedLocations.map((location) => (
              <span
                key={location.locationId}
                className="inline-flex items-center gap-1 rounded-full bg-[#F4ECFA] px-3 py-1 text-xs font-medium text-[#5E1B7F]"
              >
                {location.locationName}
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(event) => {
                    event.stopPropagation();
                    onChange(
                      toggleNoticeLocationSelection(
                        selectedLocationIds,
                        String(location.locationId),
                        allLocationIds,
                      ),
                    );
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onChange(
                        toggleNoticeLocationSelection(
                          selectedLocationIds,
                          String(location.locationId),
                          allLocationIds,
                        ),
                      );
                    }
                  }}
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#7C3AA8] text-white"
                >
                  <X className="h-3 w-3" />
                </span>
              </span>
            ))
          ) : (
            <span className="text-sm text-slate-400">Select Locations</span>
          )}
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[#2C67B3] transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div
          className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-20 max-h-60 overflow-auto rounded-[14px] border border-slate-200 bg-white p-2 shadow-lg"
          onClick={(event) => event.stopPropagation()}
        >
          <label
            className={`flex cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2 text-sm font-semibold transition ${
              allSelected ? "bg-[#F4ECFA] text-[#5E1B7F]" : "hover:bg-slate-50"
            }`}
          >
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => {
                onChange(
                  toggleNoticeLocationSelection(
                    selectedLocationIds,
                    "ALL",
                    allLocationIds,
                  ),
                );
              }}
              className="h-4 w-4 accent-[#5E1B7F]"
            />
            <span>Select All</span>
          </label>
          {locations.map((location) => {
            const value = String(location.locationId);
            const checked = selectedLocationIds.includes(value);

            return (
              <label
                key={location.locationId}
                className={`flex cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2 text-sm transition ${
                  checked ? "bg-[#F4ECFA] text-[#5E1B7F]" : "hover:bg-slate-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    onChange(
                      toggleNoticeLocationSelection(
                        selectedLocationIds,
                        value,
                        allLocationIds,
                      ),
                    );
                  }}
                  className="h-4 w-4 accent-[#5E1B7F]"
                />
                <span>{location.locationName}</span>
              </label>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function ThemeCard({
  theme,
  selected,
  onSelect,
}: {
  theme: NoticeThemeOption;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-[14px] border p-3 text-left transition ${
        selected
          ? "border-[#3EAF3F] ring-2 ring-[#3EAF3F1A]"
          : "border-[#E2E8F0] hover:border-[#C9B6D5]"
      }`}
    >
      <div
        className="h-24 rounded-[12px] border border-white/30 p-3 shadow-inner"
        style={{
          background: `linear-gradient(180deg, ${theme.palette.primary} 0%, ${theme.palette.panel} 100%)`,
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-[0.8]">
            <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-white/80">
              {theme.category}
            </p>
            <p
              className="mt-2 text-sm font-semibold"
              style={{ color: theme.palette.secondary }}
            >
              {theme.label}
            </p>
          </div>
          <div
            className="h-7 rounded-full flex-[0.2]"
            style={{ backgroundColor: theme.palette.accent }}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-sm">
        <span
          className={`inline-flex h-4 w-4 items-center justify-center rounded-full border ${
            selected ? "border-[#3EAF3F] bg-[#3EAF3F]" : "border-slate-300"
          }`}
        >
          {selected ? <Check className="h-3 w-3 text-white" /> : null}
        </span>
        <span
          className={
            selected ? "font-semibold text-[#3EAF3F]" : "text-[#667085]"
          }
        >
          {selected ? "Selected" : "Select"}
        </span>
      </div>
    </button>
  );
}

function PreviewCard({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[16px] border border-[#E2E8F0] bg-[#FCFCFD] p-3">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#333333]">
        {icon}
        {label}
      </div>
      {children}
    </div>
  );
}

function NoticePreviewFrame({
  theme,
  title,
  description,
  locations,
  orientation,
}: {
  theme: NoticeThemeOption;
  title: string;
  description: string;
  locations: DeviceLocation[];
  orientation: "portrait" | "landscape";
}) {
  const locationLabel = locations.length
    ? locations.map((location) => location.locationName).join(", ")
    : "Selected locations will appear here";
  const isPortrait = orientation === "portrait";

  return (
    <div
      className={`mx-auto overflow-hidden rounded-[16px] border-[3px] border-[#151515] bg-white shadow-lg ${
        isPortrait ? "w-[260px]" : "w-full max-w-[420px]"
      }`}
    >
      <div className="bg-[#111111] px-3 py-1.5 text-[8px] text-white">
        <div className="flex items-center justify-between">
          <div className="font-semibold tracking-[0.2em]">GMR | DMRC</div>
          <div>08 Apr 2026 | 10:45 AM</div>
        </div>
      </div>

      {isPortrait ? (
        <div
          className="min-h-[355px]"
          style={{
            background: `linear-gradient(180deg, ${theme.palette.primary} 0%, ${theme.palette.panel} 100%)`,
            color: theme.palette.text,
          }}
        >
          <div className="bg-[#111111] px-5 py-4">
            <div className="grid grid-cols-[1.55fr_0.7fr_0.75fr] gap-3 text-[9px] font-medium text-[#F6D354]">
              <span>Destination</span>
              <span>Platform</span>
              <span>Time</span>
            </div>
            <div className="mt-2 space-y-1.5 text-[9px] text-white">
              {previewRows.map((row) => (
                <div
                  key={row.destination}
                  className="grid grid-cols-[1.55fr_0.7fr_0.75fr] gap-3 border-t border-white/10 pt-1.5"
                >
                  <span className="truncate text-[#F59E0B]">
                    {row.destination}
                  </span>
                  <span>{row.platform}</span>
                  <span className="text-[#F59E0B]">{row.time}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-center px-6 py-7 text-center">
            {/* <div
              className="mb-5 flex h-20 w-20 items-center justify-center rounded-[24px]"
              style={{ backgroundColor: theme.palette.accent }}
            >
              <Megaphone className="h-9 w-9" style={{ color: theme.palette.primary }} />
            </div> */}
            <div className="flex-1">
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.24em]"
                style={{ color: theme.palette.secondary }}
              >
                {theme.label}
              </p>
              <p className="mt-5 text-[16px] font-semibold leading-tight">
                {title || "Your announcement title"}
              </p>
              <p className="mt-4 text-[10px] leading-2 text-white/90">
                {description ||
                  "Your announcement preview will appear here once you start typing."}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid h-[150px] min-h-[220px] grid-cols-[170px_minmax(0,1fr)]">
          <div className="bg-[#111111] px-4 py-4 text-[8px] text-white">
            <div className="grid grid-cols-[1.35fr_0.55fr_0.65fr] gap-2 text-[#F6D354]">
              <span>Destination</span>
              <span>Plat.</span>
              <span>Time</span>
            </div>
            <div className="mt-3 space-y-2">
              {previewRows.map((row) => (
                <div
                  key={row.destination}
                  className="grid grid-cols-[1.35fr_0.55fr_0.65fr] gap-2 border-t border-white/10 pt-2"
                >
                  <span className="truncate text-[#F59E0B]">
                    {row.destination}
                  </span>
                  <span>{row.platform}</span>
                  <span className="text-[#F59E0B]">{row.time}</span>
                </div>
              ))}
            </div>
          </div>

          <div
            className="flex items-center gap-5 px-6 py-5"
            style={{
              background: `linear-gradient(180deg, ${theme.palette.primary} 0%, ${theme.palette.panel} 100%)`,
              color: theme.palette.text,
            }}
          >
            {/* <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px]"
              style={{ backgroundColor: theme.palette.accent }}
            >
              <Megaphone className="h-8 w-8" style={{ color: theme.palette.primary }} />
            </div> */}

            <div className="min-w-0 flex-1">
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.22em]"
                style={{ color: theme.palette.secondary }}
              >
                {theme.label}
              </p>
              <p className="mt-3 text-[16px] font-semibold leading-tight">
                {title || "Your announcement title"}
              </p>
              <p className="mt-3 max-w-[210px] text-[10px] leading-2 text-white/90">
                {description ||
                  "Your announcement preview will appear here once you start typing."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* <div className="border-t border-slate-200 bg-white px-3 py-1.5 text-[7px] text-[#333333]">
        {locationLabel}
      </div> */}
    </div>
  );
}

function PublishConfirmModal({
  onClose,
  onPublish,
}: {
  onClose: () => void;
  onPublish: () => void;
}) {
  return (
    <Modal onClose={onClose} className="max-w-md">
      <div className="px-8 py-8 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#FFF6E8]">
          <Megaphone className="h-9 w-9 text-[#F59E0B]" />
        </div>
        <h3 className="mt-6 text-[24px] font-semibold leading-tight text-slate-900">
          Are you sure want to Publish this announcement?
        </h3>
        <p className="mt-4 text-sm leading-6 text-slate-500">
          Your announcement is scheduled and will go live at the selected time.
          Do you want to proceed?
        </p>

        <div className="mt-8 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-4 py-3 font-semibold text-[#333333] transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onPublish}
            className="rounded-xl bg-custom-gradient px-4 py-3 font-semibold text-white transition hover:opacity-95"
          >
            Publish
          </button>
        </div>
      </div>
    </Modal>
  );
}

function PublishSuccessModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal onClose={onClose} className="max-w-md">
      <div className="px-8 py-8 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500">
          <Check className="h-10 w-10 text-white" />
        </div>
        <h3 className="mt-6 text-[24px] font-semibold leading-tight text-slate-900">
          Congratulations!
        </h3>
        <p className="mt-4 text-sm leading-6 text-slate-500">
          Your announcement has been successfully scheduled. It will be
          published automatically at the selected time.
        </p>

        <div className="mt-8">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-custom-gradient px-4 py-3 font-semibold text-white transition hover:opacity-95"
          >
            Okay
          </button>
        </div>
      </div>
    </Modal>
  );
}
