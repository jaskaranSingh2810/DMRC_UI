import { useEffect, useMemo, useReducer, useState } from "react";
import type { ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  FileText,
  MapPin,
  Monitor,
  MoveRight,
} from "lucide-react";
import { useToast } from "@/hooks/useToast";
import AdCampaignStepOne from "./AdCampaignStepOne";
import {
  createDefaultSchedule,
  createMediaSlots,
  createInitialWizardState,
  LOCATION_OPTIONS,
  mapDraftMediaToSlots,
  WIZARD_STEPS,
} from "./adCampaignWizardData";
import {
  createEmptyMediaSlot,
  buildMediaPreviewUrl,
  formatBytes,
  getStepOneValidationMessage,
  getUploadedMedia,
  isStepOneReady,
} from "./adCampaignWizardHelpers";
import { useAppDispatch } from "@/store/hooks";
import { fetchAdContent, saveAdDraft } from "@/store/slices/adSlice";
import type {
  AdCampaignWizardProps,
  CampaignWizardState,
  DraftContentResponse,
  MediaMode,
  ScheduleEntry,
  WizardStep,
} from "./adCampaignWizardTypes";

type WizardAction =
  | { type: "SET_STEP"; payload: WizardStep }
  | { type: "SET_CAMPAIGN_NAME"; payload: string }
  | { type: "SET_MEDIA_MODE"; payload: MediaMode }
  | {
      type: "SET_MEDIA_SLOT";
      payload: {
        slotId: string;
        file: File | null;
        previewUrl: string;
        fileName: string;
        sizeLabel: string;
        durationSeconds: number;
      };
    }
  | { type: "REMOVE_MEDIA_SLOT"; payload: { slotId: string } }
  | { type: "SET_CONTENT_ID"; payload: string | number | null }
  | { type: "HYDRATE_DRAFT"; payload: DraftContentResponse }
  | { type: "TOGGLE_LOCATION"; payload: string }
  | { type: "TOGGLE_DEVICE"; payload: { locationId: string; deviceId: string } }
  | { type: "TOGGLE_SELECT_ALL_DEVICES"; payload: { locationId: string } }
  | {
      type: "UPDATE_SCHEDULE";
      payload: {
        locationId: string;
        field: keyof ScheduleEntry;
        value: string | number | string[];
      };
    }
  | { type: "SYNC_SCHEDULE" }
  | { type: "PUBLISH" };

function wizardReducer(
  state: CampaignWizardState,
  action: WizardAction,
): CampaignWizardState {
  switch (action.type) {
    case "SET_STEP":
      return {
        ...state,
        step: action.payload,
      };
    case "SET_CAMPAIGN_NAME":
      return {
        ...state,
        campaign: {
          ...state.campaign,
          name: action.payload,
        },
      };
    case "SET_MEDIA_MODE": {
      const existingMedia = state.campaign.uploadedMedia.filter(
        (media) => media.status === "uploaded",
      );
      const nextSlots = createMediaSlots(action.payload).map((slot, index) => {
        const existingSlot = existingMedia[index];
        return existingSlot
          ? {
              ...slot,
              ...existingSlot,
              id: slot.id,
              label: slot.label,
            }
          : slot;
      });

      return {
        ...state,
        campaign: {
          ...state.campaign,
          mediaMode: action.payload,
          uploadedMedia: nextSlots,
        },
      };
    }
    case "SET_MEDIA_SLOT":
      return {
        ...state,
        campaign: {
          ...state.campaign,
          uploadedMedia: state.campaign.uploadedMedia.map((media) =>
            media.id === action.payload.slotId
              ? {
                  ...media,
                  file: action.payload.file,
                  previewUrl: action.payload.previewUrl,
                  fileName: action.payload.fileName,
                  sizeLabel: action.payload.sizeLabel,
                  durationSeconds: action.payload.durationSeconds,
                  status: action.payload.file ? "uploaded" : "empty",
                  remoteFilePath: null,
                }
              : media,
          ),
        },
      };
    case "REMOVE_MEDIA_SLOT":
      return {
        ...state,
        campaign: {
          ...state.campaign,
          uploadedMedia: state.campaign.uploadedMedia.map((media) =>
            media.id === action.payload.slotId
              ? createEmptyMediaSlot(media.id, media.label)
              : media,
          ),
        },
      };
    case "SET_CONTENT_ID":
      return {
        ...state,
        campaign: {
          ...state.campaign,
          contentId: action.payload,
        },
      };
    case "HYDRATE_DRAFT": {
      const mediaMode: MediaMode =
        action.payload.media.length > 1 ? "CUSTOM" : "AUTO_FIT";
      return {
        ...state,
        campaign: {
          contentId: action.payload.contentId,
          name: action.payload.contentName,
          mediaMode,
          uploadedMedia:
            action.payload.media.length > 0
              ? mapDraftMediaToSlots(action.payload.media, buildMediaPreviewUrl)
              : createMediaSlots(mediaMode),
        },
      };
    }
    case "TOGGLE_LOCATION": {
      const locationId = action.payload;
      const nextSelectedDevices = { ...state.locations.selectedDevices };
      const location = LOCATION_OPTIONS.find((item) => item.id === locationId);

      if (nextSelectedDevices[locationId]) {
        delete nextSelectedDevices[locationId];
      } else if (location) {
        nextSelectedDevices[locationId] = [];
      }

      return {
        ...state,
        locations: {
          selectedDevices: nextSelectedDevices,
        },
      };
    }
    case "TOGGLE_DEVICE": {
      const { locationId, deviceId } = action.payload;
      const currentDevices = state.locations.selectedDevices[locationId];

      if (!currentDevices) {
        return state;
      }

      const deviceSet = new Set(currentDevices);

      if (deviceSet.has(deviceId)) {
        deviceSet.delete(deviceId);
      } else {
        deviceSet.add(deviceId);
      }

      return {
        ...state,
        locations: {
          selectedDevices: {
            ...state.locations.selectedDevices,
            [locationId]: Array.from(deviceSet),
          },
        },
      };
    }
    case "TOGGLE_SELECT_ALL_DEVICES": {
      const { locationId } = action.payload;
      const location = LOCATION_OPTIONS.find((item) => item.id === locationId);

      if (!location || !state.locations.selectedDevices[locationId]) {
        return state;
      }

      const currentlySelected = state.locations.selectedDevices[locationId];
      const nextDevices =
        currentlySelected.length === location.devices.length
          ? []
          : location.devices.map((device) => device.id);

      return {
        ...state,
        locations: {
          selectedDevices: {
            ...state.locations.selectedDevices,
            [locationId]: nextDevices,
          },
        },
      };
    }
    case "UPDATE_SCHEDULE": {
      const currentSchedule =
        state.schedule[action.payload.locationId] ?? createDefaultSchedule();

      return {
        ...state,
        schedule: {
          ...state.schedule,
          [action.payload.locationId]: {
            ...currentSchedule,
            [action.payload.field]: action.payload.value,
          },
        },
      };
    }
    case "SYNC_SCHEDULE": {
      const nextSchedule = Object.keys(state.locations.selectedDevices).reduce<
        Record<string, ScheduleEntry>
      >((accumulator, locationId) => {
        accumulator[locationId] =
          state.schedule[locationId] ?? createDefaultSchedule();
        return accumulator;
      }, {});

      return {
        ...state,
        schedule: nextSchedule,
      };
    }
    case "PUBLISH":
      return {
        ...state,
        published: true,
        step: 4,
      };
    default:
      return state;
  }
}

function isStepOneValid(state: CampaignWizardState) {
  return isStepOneReady(state.campaign);
}

function isStepTwoValid(state: CampaignWizardState) {
  const selectedLocationIds = Object.keys(state.locations.selectedDevices);
  const selectedDeviceCount = selectedLocationIds.reduce(
    (total, locationId) =>
      total + state.locations.selectedDevices[locationId].length,
    0,
  );

  return selectedLocationIds.length > 0 && selectedDeviceCount > 0;
}

function isStepThreeValid(state: CampaignWizardState) {
  const selectedLocationIds = Object.keys(state.locations.selectedDevices);

  if (!selectedLocationIds.length) {
    return false;
  }

  return selectedLocationIds.every((locationId) => {
    const schedule = state.schedule[locationId];

    return Boolean(
      schedule &&
        schedule.targetPlays > 0 &&
        schedule.startDate &&
        schedule.endDate &&
        schedule.startTime &&
        schedule.endTime,
    );
  });
}

function isStepValid(step: WizardStep, state: CampaignWizardState) {
  if (step === 1) {
    return isStepOneValid(state);
  }

  if (step === 2) {
    return isStepTwoValid(state);
  }

  if (step === 3) {
    return isStepThreeValid(state);
  }

  return isStepOneValid(state) && isStepTwoValid(state) && isStepThreeValid(state);
}

export default function AdCampaignWizard({
  initialAd,
}: AdCampaignWizardProps) {
  const appDispatch = useAppDispatch();
  const navigate = useNavigate();
  const toast = useToast();
  const [state, dispatch] = useReducer(
    wizardReducer,
    createInitialWizardState(initialAd),
  );
  const [draftSaving, setDraftSaving] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);
  const [expandedLocationId, setExpandedLocationId] = useState<string | null>(
    Object.keys(state.locations.selectedDevices)[0] ?? null,
  );

  useEffect(() => {
    dispatch({ type: "SYNC_SCHEDULE" });
  }, [state.locations.selectedDevices]);

  useEffect(() => {
    const selectedLocationIds = Object.keys(state.locations.selectedDevices);

    if (!selectedLocationIds.length) {
      setExpandedLocationId(null);
      return;
    }

    if (
      !expandedLocationId ||
      !state.locations.selectedDevices[expandedLocationId]
    ) {
      setExpandedLocationId(selectedLocationIds[0]);
    }
  }, [expandedLocationId, state.locations.selectedDevices]);

  useEffect(() => {
    return () => {
      state.campaign.uploadedMedia.forEach((media) => {
        if (media.previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(media.previewUrl);
        }
      });
    };
  }, [state.campaign.uploadedMedia]);

  useEffect(() => {
    const contentId = initialAd?.contentId;

    if (!contentId) {
      return;
    }

    setDraftLoading(true);

    void appDispatch(fetchAdContent(contentId))
      .unwrap()
      .then((draft) => {
        dispatch({ type: "HYDRATE_DRAFT", payload: draft });
      })
      .catch((error) => {
        toast.error(
          typeof error === "string"
            ? error
            : error instanceof Error
              ? error.message
              : "Unable to load content.",
          "Ad",
        );
      })
      .finally(() => {
        setDraftLoading(false);
      });
  }, [appDispatch, initialAd?.contentId, toast]);

  const selectedLocationIds = Object.keys(state.locations.selectedDevices);
  const selectedLocations = useMemo(
    () =>
      LOCATION_OPTIONS.filter((location) =>
        selectedLocationIds.includes(location.id),
      ),
    [selectedLocationIds],
  );

  const totalSelectedDevices = selectedLocationIds.reduce(
    (total, locationId) =>
      total + state.locations.selectedDevices[locationId].length,
    0,
  );

  const currentStepValid = isStepValid(state.step, state);

  const canReachStep = (targetStep: WizardStep) => {
    if (state.isEditMode) {
      return true;
    }

    if (targetStep <= state.step) {
      return true;
    }

    if (targetStep === 2) {
      return isStepOneValid(state);
    }

    if (targetStep === 3) {
      return isStepOneValid(state) && isStepTwoValid(state);
    }

    return (
      isStepOneValid(state) && isStepTwoValid(state) && isStepThreeValid(state)
    );
  };

  const handleMediaUpload = async (
    slotId: string,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const previousMedia = state.campaign.uploadedMedia.find(
      (media) => media.id === slotId,
    );

    if (previousMedia?.previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previousMedia.previewUrl);
    }

    const durationSeconds = await getVideoDuration(file);

    dispatch({
      type: "SET_MEDIA_SLOT",
      payload: {
        slotId,
        file,
        previewUrl: URL.createObjectURL(file),
        fileName: file.name,
        sizeLabel: formatBytes(file),
        durationSeconds,
      },
    });

    event.target.value = "";
  };

  const handleMediaModeChange = (mediaMode: MediaMode) => {
    if (mediaMode === state.campaign.mediaMode) {
      return;
    }

    if (mediaMode === "AUTO_FIT") {
      const secondaryMedia = state.campaign.uploadedMedia.slice(1);
      secondaryMedia.forEach((media) => {
        if (media.previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(media.previewUrl);
        }
      });
    }

    dispatch({ type: "SET_MEDIA_MODE", payload: mediaMode });
  };

  const handleRemoveMedia = (slotId: string) => {
    const existingMedia = state.campaign.uploadedMedia.find(
      (media) => media.id === slotId,
    );

    if (existingMedia?.previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(existingMedia.previewUrl);
    }

    dispatch({ type: "REMOVE_MEDIA_SLOT", payload: { slotId } });
  };

  const handleSaveDraft = async () => {
    const validationMessage = getStepOneValidationMessage(state.campaign);

    if (state.step === 1 && validationMessage) {
      toast.error(validationMessage, "Ad");
      return;
    }

    setDraftSaving(true);

    try {
      const draft = await appDispatch(saveAdDraft(state.campaign)).unwrap();
      dispatch({ type: "HYDRATE_DRAFT", payload: draft });
      dispatch({ type: "SET_CONTENT_ID", payload: draft.contentId });
      toast.success("Content upload successfully", "Ad");
    } catch (error) {
      toast.error(
        typeof error === "string"
          ? error
          : error instanceof Error
            ? error.message
            : "Unable to save draft.",
        "Ad",
      );
    } finally {
      setDraftSaving(false);
    }
  };

  const goNext = () => {
    if (!currentStepValid || state.step === 4) {
      return;
    }

    dispatch({ type: "SET_STEP", payload: (state.step + 1) as WizardStep });
  };

  const goBack = () => {
    if (state.step === 1) {
      navigate("/ads-management");
      return;
    }

    dispatch({ type: "SET_STEP", payload: (state.step - 1) as WizardStep });
  };

  if (state.published) {
    return (
      <WizardShell
        state={state}
        selectedLocations={selectedLocations}
        totalSelectedDevices={totalSelectedDevices}
        onBack={goBack}
      >
        <div className="rounded-[24px] border border-slate-200 bg-white px-6 py-20 shadow-sm">
          <StepIndicator
            currentStep={4}
            isEditMode={state.isEditMode}
            canReachStep={canReachStep}
            onStepClick={(step) => dispatch({ type: "SET_STEP", payload: step })}
          />
          <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-200">
              <Check className="h-10 w-10" />
            </div>
            <h2 className="mt-8 text-3xl font-semibold text-[#333333]">
              Congratulations!
            </h2>
            <p className="mt-3 max-w-xl text-sm text-[#333333]">
              Your announcement has been successfully scheduled. It will be
              published automatically at the selected time.
            </p>
          </div>
        </div>
      </WizardShell>
    );
  }

  return (
    <WizardShell
      state={state}
      selectedLocations={selectedLocations}
      totalSelectedDevices={totalSelectedDevices}
      onBack={goBack}
    >
      <div className="rounded-[24px] shadow-sm">
        <StepIndicator
          currentStep={state.step}
          isEditMode={state.isEditMode}
          canReachStep={canReachStep}
          onStepClick={(step) => {
            if (canReachStep(step)) {
              dispatch({ type: "SET_STEP", payload: step });
            }
          }}
        />

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-6 rounded-[18px] border border-[#E8E1EE] bg-white p-4 shadow-sm sm:p-5">
            {state.step === 1 ? (
              <AdCampaignStepOne
                campaign={state.campaign}
                onNameChange={(value) =>
                  dispatch({ type: "SET_CAMPAIGN_NAME", payload: value })
                }
                onMediaModeChange={handleMediaModeChange}
                onMediaUpload={handleMediaUpload}
                onRemoveMedia={handleRemoveMedia}
              />
            ) : null}

            {state.step === 2 ? (
              <Step2LocationScreens
                selectedDevices={state.locations.selectedDevices}
                expandedLocationId={expandedLocationId}
                onExpandLocation={setExpandedLocationId}
                onToggleLocation={(locationId) =>
                  dispatch({ type: "TOGGLE_LOCATION", payload: locationId })
                }
                onToggleDevice={(locationId, deviceId) =>
                  dispatch({
                    type: "TOGGLE_DEVICE",
                    payload: { locationId, deviceId },
                  })
                }
                onToggleSelectAll={(locationId) =>
                  dispatch({
                    type: "TOGGLE_SELECT_ALL_DEVICES",
                    payload: { locationId },
                  })
                }
              />
            ) : null}

            {state.step === 3 ? (
              <Step3ScheduleTarget
                selectedLocations={selectedLocations}
                schedule={state.schedule}
                onScheduleChange={(locationId, field, value) =>
                  dispatch({
                    type: "UPDATE_SCHEDULE",
                    payload: { locationId, field, value },
                  })
                }
              />
            ) : null}

            {state.step === 4 ? (
              <Step4Submit
                state={state}
                selectedLocations={selectedLocations}
                onPublish={() => dispatch({ type: "PUBLISH" })}
              />
            ) : null}

            {state.step !== 4 ? (
              <WizardFooter
                step={state.step}
                canProceed={currentStepValid}
                draftSaving={draftSaving}
                draftDisabled={state.step === 1 && draftLoading}
                onBack={goBack}
                onSaveDraft={() => void handleSaveDraft()}
                onNext={goNext}
              />
            ) : null}
          </div>
          <div className="order-last lg:order-none">
            <div className="lg:sticky lg:top-6">
              {state.step === 1 ? (
                <InventoryForecastPanel
                  selectedLocations={selectedLocations}
                  selectedDevices={state.locations.selectedDevices}
                  schedule={state.schedule}
                  compact={false}
                />
              ) : (
                <div className="space-y-4">
                  <CampaignMediaPreview campaign={state.campaign} />
                  <InventoryForecastPanel
                    selectedLocations={selectedLocations}
                    selectedDevices={state.locations.selectedDevices}
                    schedule={state.schedule}
                    compact={state.step >= 2}
                  />
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </WizardShell>
  );
}

function WizardShell({
  children,
  state,
  selectedLocations,
  totalSelectedDevices,
  onBack,
}: {
  children: React.ReactNode;
  state: CampaignWizardState;
  selectedLocations: typeof LOCATION_OPTIONS;
  totalSelectedDevices: number;
  onBack: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-sm text-[#333333]">
        <span className="text-[24px] font-[400]">Ad Management</span>
        <ChevronRight className="h-6 w-6" />
        <span className="font-semibold text-[#333333] text-[24px]">Create New Ad</span>
        {state.isEditMode ? (
          <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
            Edit mode
          </span>
        ) : null}
      </div>

      {children}

      {/* {state.step === 4 && !state.published ? null : (
        <div className="hidden rounded-[24px] border border-slate-200 bg-white px-6 py-4 text-sm text-[#333333] xl:flex xl:items-center xl:justify-between">
          <div>
            <span className="font-semibold text-[#333333]">
              {selectedLocations.length}
            </span>{" "}
            locations selected with{" "}
            <span className="font-semibold text-[#333333]">
              {totalSelectedDevices}
            </span>{" "}
            screens configured.
          </div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 font-medium text-[#333333] transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>
      )} */}
    </div>
  );
}

export function StepIndicator({
  currentStep,
  isEditMode,
  canReachStep,
  onStepClick,
}: {
  currentStep: WizardStep;
  isEditMode: boolean;
  canReachStep: (step: WizardStep) => boolean;
  onStepClick: (step: WizardStep) => void;
}) {
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-max items-center gap-2 md:gap-3 justify-between">
        {WIZARD_STEPS.map((step, index) => {
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          const isEnabled = isEditMode || canReachStep(step.id);

          return (
            <div key={step.id} className="flex items-center gap-2 md:gap-3 w-full">
              <button
                type="button"
                onClick={() => onStepClick(step.id)}
                disabled={!isEnabled}
                className={`flex min-w-[260px] w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                  isActive
                    ? "border-[#9870AD] bg-[#F2EAF6] text-[#5E1B7F]"
                    : isCompleted
                      ? "border-[#D1D5DC] bg-white text-[#333333]"
                      : "border-[#D1D5DC] bg-white text-[#333333]"
                } ${isEnabled ? "cursor-pointer" : "cursor-not-allowed"}`}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-[14px] font-medium ${
                    isActive
                      ? "bg-[#5E1B7F] text-white"
                      : isCompleted
                        ? "bg-[#F2EAF6] text-[#5E1B7F]"
                        : "bg-[#E2E4EA] text-[#333333]"
                  }`}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : step.id}
                </span>
                <span className="text-[14px] text-[#333333] font-medium lg:text-nowrap text-wrap">{step.label}</span>
              </button>

              {index < WIZARD_STEPS.length - 1 ? (
                <MoveRight className="h-8 w-full text-[#B8B8B8]" />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CampaignMediaPreview({
  campaign,
}: {
  campaign: CampaignWizardState["campaign"];
}) {
  const primaryMedia = getUploadedMedia(campaign)[0] ?? campaign.uploadedMedia[0];

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-[18px] font-semibold text-[#333333]">
        <FileText className="h-5 w-5 text-violet-700" />
        <span>Campaign Media</span>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 p-3">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="h-24 w-full overflow-hidden rounded-xl bg-gradient-to-br from-[#7b1fa2] via-[#1a56db] to-[#0f172a] sm:w-36">
            {primaryMedia?.previewUrl ? (
              <video
                src={primaryMedia.previewUrl}
                className="h-full w-full object-cover"
                muted
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm font-semibold text-white/90">
                Media
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold text-[#333333]">
              {campaign.name || "Untitled campaign"}
            </p>
            <p className="mt-1 truncate text-sm text-[#333333]">
              {getUploadedMedia(campaign).map((item) => item.fileName).join(", ") ||
                "No media uploaded yet"}
            </p>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-[#333333]">
              <span className="inline-flex items-center gap-1">
                <Clock3 className="h-4 w-4" />
                {primaryMedia?.durationSeconds ?? 0} seconds
              </span>
              {primaryMedia?.sizeLabel ? (
                <span className="inline-flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  {primaryMedia.sizeLabel}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function InventoryForecastPanel({
  selectedLocations,
  selectedDevices,
  schedule,
  compact,
}: {
  selectedLocations: typeof LOCATION_OPTIONS;
  selectedDevices: Record<string, string[]>;
  schedule: Record<string, ScheduleEntry>;
  compact: boolean;
}) {
  if (!selectedLocations.length) {
    return (
      <div className="rounded-[18px] border border-[#E8E1EE] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-base font-semibold text-[#333333]">
          <BarChart3 className="h-5 w-5 text-violet-700" />
          <h3>Inventory Forecast</h3>
        </div>
        <div className="flex min-h-[260px] flex-col items-center justify-center text-center text-[#333333]">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <BarChart3 className="h-8 w-8" />
          </div>
          <p className="mt-5 max-w-xs text-sm leading-6">
            Select locations &amp; configure Schedule to the forecast
          </p>
        </div>
      </div>
    );
  }

  const totalTargetPlays = selectedLocations.reduce(
    (sum, location) => sum + (schedule[location.id]?.targetPlays ?? 100),
    0,
  );
  const totalSelectedDevices = selectedLocations.reduce(
    (sum, location) => sum + (selectedDevices[location.id]?.length ?? 0),
    0,
  );
  const totalCapacityHours = totalSelectedDevices * 252;
  const totalRequiredHours = Number((totalTargetPlays / 120).toFixed(2));
  const utilisationPercentage =
    totalCapacityHours > 0
      ? Math.min(100, Number(((totalRequiredHours / totalCapacityHours) * 100).toFixed(1)))
      : 0;

  return (
    <div className="space-y-4 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-[18px] font-semibold text-[#333333]">
        <BarChart3 className="h-5 w-5 text-violet-700" />
        <span className="text-[18px] font-semibold text-[#333333]">Inventory Forecast</span>
      </div>

      {selectedLocations.map((location) => {
        const selectedCount = selectedDevices[location.id]?.length ?? 0;
        const capacityHours = selectedCount * 315;
        const requiredHours = Number(
          (((schedule[location.id]?.targetPlays ?? 100) * Math.max(selectedCount, 1)) / 1440).toFixed(2),
        );

        return (
          <div
            key={location.id}
            className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Monitor className="h-4 w-4" />
                {location.name}
                <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-xs text-white">
                  {selectedCount}/{location.devices.length}
                </span>
              </div>
              <span className="text-sm font-semibold text-emerald-600">
                {Math.min(
                  100,
                  Number(((requiredHours / Math.max(capacityHours, 1)) * 100).toFixed(1)),
                )}
                %
              </span>
            </div>

            <div className="mt-3 h-2 rounded-full bg-emerald-100">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{
                  width: `${Math.min(
                    100,
                    Number(((requiredHours / Math.max(capacityHours, 1)) * 100).toFixed(1)),
                  )}%`,
                }}
              />
            </div>

            <div
              className={`mt-4 grid gap-3 text-sm text-slate-600 ${
                compact ? "grid-cols-2" : "grid-cols-2 xl:grid-cols-3"
              }`}
            >
              <ForecastStat label="Capacity" value={`${capacityHours.toFixed(1)}h`} />
              <ForecastStat
                label="Available"
                value={`${Math.max(capacityHours - requiredHours, 0).toFixed(1)}h`}
              />
              <ForecastStat label="Required" value={`${requiredHours.toFixed(2)}h`} />
              <ForecastStat
                label="Campaign Days"
                value={String(getCampaignDays(schedule[location.id]))}
              />
              <ForecastStat label="Daily Window" value="10h" />
              <ForecastStat label="Interval" value="136080s" />
            </div>
          </div>
        );
      })}

      <div className="rounded-2xl border border-slate-200 p-4">
        <p className="text-lg font-semibold text-[#333333]">Campaign Summary</p>
        <div className="mt-4 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-slate-200 text-sm font-semibold text-[#333333]">
            {utilisationPercentage}%
          </div>
          <div className="text-sm text-[#333333]">
            <p className="font-semibold text-[#333333]">Overall utilisation</p>
            <p>
              {totalSelectedDevices} screens &nbsp; {totalTargetPlays} Plays
            </p>
            <p>{totalRequiredHours.toFixed(2)}h required</p>
          </div>
        </div>

        <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 text-sm text-slate-600">
          <SummaryRow label="Total Screens" value={String(totalSelectedDevices)} />
          <SummaryRow label="Total Target Plays" value={String(totalTargetPlays)} />
          <SummaryRow
            label="Total Required Time"
            value={`${totalRequiredHours.toFixed(2)}h`}
          />
          <SummaryRow
            label="Overall Utilisation"
            value={`${utilisationPercentage}%`}
            valueClassName="text-emerald-600"
          />
        </div>
      </div>
    </div>
  );
}

function ForecastStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  valueClassName = "text-[#333333]",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span>{label}</span>
      <span className={`font-semibold ${valueClassName}`}>{value}</span>
    </div>
  );
}

export function Step2LocationScreens({
  selectedDevices,
  expandedLocationId,
  onExpandLocation,
  onToggleLocation,
  onToggleDevice,
  onToggleSelectAll,
}: {
  selectedDevices: Record<string, string[]>;
  expandedLocationId: string | null;
  onExpandLocation: (locationId: string) => void;
  onToggleLocation: (locationId: string) => void;
  onToggleDevice: (locationId: string, deviceId: string) => void;
  onToggleSelectAll: (locationId: string) => void;
}) {
  const selectedLocationIds = Object.keys(selectedDevices);

  return (
    <section className="space-y-6">
      <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <MapPin className="h-5 w-5 text-violet-700" />
          <h2 className="text-2xl font-semibold text-[#333333]">
            Location &amp; Screens
          </h2>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {LOCATION_OPTIONS.map((location) => {
            const isSelected = Boolean(selectedDevices[location.id]);

            return (
              <label
                key={location.id}
                className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                  isSelected
                    ? "border-violet-300 bg-violet-50 text-violet-800"
                    : "border-slate-200 bg-white text-[#333333] hover:border-slate-300"
                }`}
              >
                <input
                  aria-label={`Select ${location.name}`}
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => {
                    onToggleLocation(location.id);
                    if (!isSelected) {
                      onExpandLocation(location.id);
                    }
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-violet-700 focus:ring-violet-400"
                />
                <span>{location.name}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-[#333333]">
                  {location.devices.length}
                </span>
              </label>
            );
          })}
        </div>

        <div className="mt-6 space-y-4">
          {selectedLocationIds.length ? (
            LOCATION_OPTIONS.filter((location) =>
              selectedLocationIds.includes(location.id),
            ).map((location) => {
              const isExpanded = expandedLocationId === location.id;
              const allSelected =
                selectedDevices[location.id]?.length === location.devices.length;

              return (
                <div
                  key={location.id}
                  className="rounded-[24px] border border-slate-200"
                >
                  <button
                    type="button"
                    onClick={() => onExpandLocation(location.id)}
                    className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                  >
                    <div>
                      <p className="text-lg font-semibold text-[#333333]">
                        {location.name}
                      </p>
                      <p className="text-sm text-[#333333]">
                        {location.devices.length} Screens
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-violet-700 px-3 py-1 text-sm font-semibold text-white">
                        {selectedDevices[location.id]?.length}/{location.devices.length} Selected
                      </span>
                      <ChevronDown
                        className={`h-5 w-5 text-slate-400 transition ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </button>

                  {isExpanded ? (
                    <div className="border-t border-slate-200 px-5 py-4">
                      <label className="flex items-center gap-3 text-sm font-medium text-[#333333]">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={() => onToggleSelectAll(location.id)}
                          className="h-4 w-4 rounded border-slate-300 text-violet-700 focus:ring-violet-400"
                        />
                        Select all
                      </label>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {location.devices.map((device) => (
                          <label
                            key={device.id}
                            className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition ${
                              selectedDevices[location.id]?.includes(device.id)
                                ? "border-violet-300 bg-violet-50"
                                : "border-slate-200"
                            }`}
                          >
                            <input
                              aria-label={`Select ${device.name}`}
                              type="checkbox"
                              checked={selectedDevices[location.id]?.includes(device.id)}
                              onChange={() => onToggleDevice(location.id, device.id)}
                              className="h-4 w-4 rounded border-slate-300 text-violet-700 focus:ring-violet-400"
                            />
                            <span className="truncate">{device.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })
          ) : (
            <div className="rounded-[24px] border border-dashed border-slate-300 px-6 py-12 text-center text-[#333333]">
              Select at least one location to view and choose its devices.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function Step3ScheduleTarget({
  selectedLocations,
  schedule,
  onScheduleChange,
}: {
  selectedLocations: typeof LOCATION_OPTIONS;
  schedule: Record<string, ScheduleEntry>;
  onScheduleChange: (
    locationId: string,
    field: keyof ScheduleEntry,
    value: string | number | string[],
  ) => void;
}) {
  const [openLocationId, setOpenLocationId] = useState<string | null>(
    selectedLocations[0]?.id ?? null,
  );

  useEffect(() => {
    if (!selectedLocations.length) {
      setOpenLocationId(null);
      return;
    }

    if (!openLocationId || !selectedLocations.some((item) => item.id === openLocationId)) {
      setOpenLocationId(selectedLocations[0].id);
    }
  }, [openLocationId, selectedLocations]);

  return (
    <section className="space-y-6">
      <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-5 w-5 text-violet-700" />
          <h2 className="text-2xl font-semibold text-[#333333]">
            Schedule &amp; Target Plays
          </h2>
        </div>

        <div className="mt-6 space-y-4">
          {selectedLocations.map((location) => {
            const entry = schedule[location.id] ?? createDefaultSchedule();
            const isOpen = openLocationId === location.id;

            return (
              <div key={location.id} className="rounded-[24px] border border-slate-200">
                <button
                  type="button"
                  onClick={() => setOpenLocationId(isOpen ? null : location.id)}
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    <Monitor className="h-5 w-5 text-violet-700" />
                    <div>
                      <p className="text-lg font-semibold text-[#333333]">
                        {location.name}
                      </p>
                      <p className="text-sm text-[#333333]">
                        {location.devices.length} Screens
                      </p>
                    </div>
                  </div>

                  <ChevronDown
                    className={`h-5 w-5 text-slate-400 transition ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isOpen ? (
                  <div className="border-t border-slate-200 px-5 py-5">
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field>
                        <label
                          htmlFor={`target-plays-${location.id}`}
                          className="text-sm font-medium text-slate-600"
                        >
                          Target Plays
                        </label>
                        <input
                          id={`target-plays-${location.id}`}
                          aria-label={`Target Plays for ${location.name}`}
                          type="number"
                          min={1}
                          value={entry.targetPlays}
                          onChange={(event) =>
                            onScheduleChange(
                              location.id,
                              "targetPlays",
                              Number(event.target.value),
                            )
                          }
                          className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                        />
                      </Field>

                      <Field>
                        <label
                          htmlFor={`priority-${location.id}`}
                          className="text-sm font-medium text-slate-600"
                        >
                          Priority
                        </label>
                        <input
                          id={`priority-${location.id}`}
                          type="number"
                          value={entry.priority}
                          onChange={(event) =>
                            onScheduleChange(
                              location.id,
                              "priority",
                              Number(event.target.value),
                            )
                          }
                          className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                        />
                      </Field>

                      <Field>
                        <label
                          htmlFor={`start-date-${location.id}`}
                          className="text-sm font-medium text-slate-600"
                        >
                          Start Date
                        </label>
                        <input
                          id={`start-date-${location.id}`}
                          type="date"
                          value={entry.startDate}
                          onChange={(event) =>
                            onScheduleChange(location.id, "startDate", event.target.value)
                          }
                          className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                        />
                      </Field>

                      <Field>
                        <label
                          htmlFor={`start-time-${location.id}`}
                          className="text-sm font-medium text-slate-600"
                        >
                          Start Time
                        </label>
                        <input
                          id={`start-time-${location.id}`}
                          type="time"
                          value={entry.startTime}
                          onChange={(event) =>
                            onScheduleChange(location.id, "startTime", event.target.value)
                          }
                          className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                        />
                      </Field>

                      <Field>
                        <label
                          htmlFor={`end-date-${location.id}`}
                          className="text-sm font-medium text-slate-600"
                        >
                          End Date
                        </label>
                        <input
                          id={`end-date-${location.id}`}
                          type="date"
                          value={entry.endDate}
                          onChange={(event) =>
                            onScheduleChange(location.id, "endDate", event.target.value)
                          }
                          className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                        />
                      </Field>

                      <Field>
                        <label
                          htmlFor={`end-time-${location.id}`}
                          className="text-sm font-medium text-slate-600"
                        >
                          End Time
                        </label>
                        <input
                          id={`end-time-${location.id}`}
                          type="time"
                          value={entry.endTime}
                          onChange={(event) =>
                            onScheduleChange(location.id, "endTime", event.target.value)
                          }
                          className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                        />
                      </Field>
                    </div>

                    <div className="mt-5">
                      <p className="text-sm font-medium text-slate-600">
                        Time Slots
                      </p>
                      <div className="mt-3 flex flex-wrap gap-3">
                        {entry.timeSlots.map((slot) => (
                          <span
                            key={slot}
                            className="rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm text-violet-700"
                          >
                            {slot}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Field({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

export function Step4Submit({
  state,
  selectedLocations,
  onPublish,
}: {
  state: CampaignWizardState;
  selectedLocations: typeof LOCATION_OPTIONS;
  onPublish: () => void;
}) {
  return (
    <section className="space-y-6">
      <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <Check className="h-5 w-5 text-violet-700" />
          <h2 className="text-2xl font-semibold text-[#333333]">Submit</h2>
        </div>

        <div
          data-testid="campaign-summary"
          className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]"
        >
          <div className="space-y-6">
            <div className="rounded-[24px] border border-slate-200 p-5">
              <h3 className="text-lg font-semibold text-[#333333]">
                Campaign Summary
              </h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <SummaryCard label="Campaign Name" value={state.campaign.name} />
                <SummaryCard
                  label="Uploaded Media"
                  value={
                    getUploadedMedia(state.campaign)
                      .map((item) => item.fileName)
                      .join(", ") || "No file"
                  }
                />
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 p-5">
              <h3 className="text-lg font-semibold text-[#333333]">
                Locations &amp; Devices
              </h3>
              <div className="mt-4 space-y-4">
                {selectedLocations.map((location) => (
                  <div
                    key={location.id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-lg font-semibold text-[#333333]">
                        {location.name}
                      </p>
                      <span className="rounded-full bg-violet-100 px-3 py-1 text-sm font-semibold text-violet-700">
                        {state.locations.selectedDevices[location.id]?.length ?? 0} devices
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {location.devices
                        .filter((device) =>
                          state.locations.selectedDevices[location.id]?.includes(device.id),
                        )
                        .map((device) => (
                          <span
                            key={device.id}
                            className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600"
                          >
                            {device.name}
                          </span>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 p-5">
              <h3 className="text-lg font-semibold text-[#333333]">Schedule</h3>
              <div className="mt-4 space-y-4">
                {selectedLocations.map((location) => {
                  const entry = state.schedule[location.id];
                  return (
                    <div
                      key={location.id}
                      className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-lg font-semibold text-[#333333]">
                          {location.name}
                        </p>
                        <p>
                          {entry.startDate} to {entry.endDate}
                        </p>
                        <p>
                          {entry.startTime} - {entry.endTime}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-violet-50 px-4 py-3 text-violet-700">
                        <span className="text-lg font-semibold">
                          {entry.targetPlays}
                        </span>{" "}
                        plays
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <CampaignMediaPreview campaign={state.campaign} />
            <button
              type="button"
              onClick={onPublish}
              className="w-full rounded-2xl bg-custom-gradient px-5 py-4 text-base font-semibold text-white shadow-lg shadow-violet-200 transition hover:opacity-95"
            >
              Publish Campaign
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-sm text-[#333333]">{label}</p>
      <p className="mt-2 text-lg font-semibold text-[#333333]">{value}</p>
    </div>
  );
}

function WizardFooter({
  step,
  canProceed,
  draftSaving,
  draftDisabled,
  onBack,
  onSaveDraft,
  onNext,
}: {
  step: WizardStep;
  canProceed: boolean;
  draftSaving: boolean;
  draftDisabled: boolean;
  onBack: () => void;
  onSaveDraft: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-[#E2E4EA] py-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] border border-[#E4E4E7] px-5 text-sm font-medium text-[#333333] transition hover:bg-slate-50"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={draftSaving || draftDisabled}
          className="rounded-[10px] border border-[#D8D8DC] px-5 py-2.5 text-sm font-medium text-[#333333] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {draftSaving ? "Saving..." : "Save Draft"}
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!canProceed}
          className={`rounded-[10px] px-6 py-2.5 text-sm font-semibold text-white transition ${
            canProceed
              ? "bg-custom-gradient shadow-lg shadow-violet-200 hover:opacity-95"
              : "bg-slate-300"
          }`}
        >
          Next
        </button>
      </div>
    </div>
  );
}

function getCampaignDays(schedule?: ScheduleEntry) {
  if (!schedule) {
    return 0;
  }

  const startDate = new Date(schedule.startDate);
  const endDate = new Date(schedule.endDate);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return 0;
  }

  const diff = endDate.getTime() - startDate.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      video.removeAttribute("src");
      video.load();
    };

    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const duration =
        Number.isFinite(video.duration) && video.duration > 0
          ? Number(video.duration.toFixed(2))
          : 0;
      cleanup();
      resolve(duration);
    };
    video.onerror = () => {
      cleanup();
      resolve(0);
    };
    video.src = objectUrl;
  });
}
