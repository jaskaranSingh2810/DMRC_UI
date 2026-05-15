import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  FileText,
  LampDesk,
  MapPin,
  Monitor,
  MoveRight,
  Search,
  Video,
} from "lucide-react";
import { useToast } from "@/hooks/useToast";
import AdCampaignStepOne from "./AdCampaignStepOne";
import {
  createDefaultSchedule,
  createMediaSlots,
  createInitialWizardState,
  mapDraftMediaToSlots,
  WIZARD_STEPS,
} from "./adCampaignWizardData";
import {
  createEmptyMediaSlot,
  buildMediaPreviewUrl,
  formatBytes,
  getOrientationLabel,
  getStepOneValidationMessage,
  getUploadedMedia,
  isStepOneReady,
} from "./adCampaignWizardHelpers";
import { safeFixed } from "./adManagementApiHelpers";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  assignLocationScreens,
  clearAdForecast,
  fetchAdContent,
  fetchAssignedLocationScreens,
  fetchInventoryForecast,
  fetchLocationScreens,
  saveAdDraft,
  scheduleAdContent,
  type InventoryForecastResponse,
} from "@/store/slices/adSlice";
import { fetchLocations } from "@/store/slices/locationSlice";
import type {
  AdCampaignWizardProps,
  CampaignWizardState,
  DraftContentResponse,
  LocationOption,
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
        orientation: "PORTRAIT" | "LANDSCAPE" | "UNKNOWN";
      };
    }
  | { type: "REMOVE_MEDIA_SLOT"; payload: { slotId: string } }
  | { type: "SET_CONTENT_ID"; payload: string | number | null }
  | { type: "HYDRATE_DRAFT"; payload: DraftContentResponse }
  | {
      type: "HYDRATE_SELECTED_DEVICES";
      payload: Record<string, string[]>;
    }
  | { type: "TOGGLE_LOCATION"; payload: string }
  | { type: "TOGGLE_DEVICE"; payload: { locationId: string; deviceId: string } }
  | {
      type: "TOGGLE_SELECT_ALL_DEVICES";
      payload: { locationId: string; deviceIds: Array<string | number> };
    }
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
                  orientation: action.payload.orientation,
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
    case "HYDRATE_SELECTED_DEVICES":
      return {
        ...state,
        locations: {
          selectedDevices: {
            ...state.locations.selectedDevices,
            ...action.payload,
          },
        },
      };
    case "TOGGLE_LOCATION": {
      const locationId = action.payload;
      const nextSelectedDevices = { ...state.locations.selectedDevices };

      if (nextSelectedDevices[locationId]) {
        delete nextSelectedDevices[locationId];
      } else {
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
      const { locationId, deviceIds } = action.payload;

      if (!state.locations.selectedDevices[locationId]) {
        return state;
      }

      const currentlySelected = state.locations.selectedDevices[locationId];
      const nextDevices =
        currentlySelected.length === deviceIds.length
          ? []
          : deviceIds.map(String);

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

  return (
    isStepOneValid(state) && isStepTwoValid(state) && isStepThreeValid(state)
  );
}

export default function AdCampaignWizard({ initialAd }: AdCampaignWizardProps) {
  const appDispatch = useAppDispatch();
  const navigate = useNavigate();
  const toast = useToast();
  const { items: locationItems, listLoaded: locationsLoaded } = useAppSelector(
    (state) => state.locations,
  );
  const { screensByLocation, assignedScreensByLocation, forecast } =
    useAppSelector((state) => state.ads);
  const [state, dispatch] = useReducer(
    wizardReducer,
    createInitialWizardState(initialAd),
  );
  const [draftSaving, setDraftSaving] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [expandedLocationId, setExpandedLocationId] = useState<string | null>(
    Object.keys(state.locations.selectedDevices)[0] ?? null,
  );
  const uploadedMediaRef = useRef(state.campaign.uploadedMedia);

  useEffect(() => {
    if (!locationsLoaded) {
      void appDispatch(fetchLocations());
    }
  }, [appDispatch, locationsLoaded]);

  const locationOptions = useMemo<LocationOption[]>(
    () =>
      locationItems.map((location) => {
        const locationId = String(location.locationId);
        const devices = screensByLocation[locationId] ?? [];

        return {
          id: locationId,
          apiLocationId: location.locationId,
          name: location.locationName,
          devices: devices.map((device) => ({
            ...device,
            id: device.id,
            name: device.deviceCode,
          })),
        };
      }),
    [locationItems, screensByLocation],
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
      expandedLocationId !== null &&
      !state.locations.selectedDevices[expandedLocationId]
    ) {
      setExpandedLocationId(selectedLocationIds[0]);
    }
  }, [expandedLocationId, state.locations.selectedDevices]);

  useEffect(() => {
    uploadedMediaRef.current = state.campaign.uploadedMedia;
  }, [state.campaign.uploadedMedia]);

  useEffect(() => {
    return () => {
      uploadedMediaRef.current.forEach((media) => {
        if (media.previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(media.previewUrl);
        }
      });
    };
  }, []);

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
  }, [appDispatch, initialAd?.contentId]);

  useEffect(() => {
    locationItems.forEach((location) => {
      if (
        !screensByLocation[String(location.locationId)] &&
        state.locations.selectedDevices[String(location.locationId)]
      ) {
        void appDispatch(fetchLocationScreens(location.locationId));
      }
    });
  }, [
    appDispatch,
    locationItems,
    screensByLocation,
    state.locations.selectedDevices,
  ]);

  useEffect(() => {
    if (!initialAd?.locations?.length) {
      return;
    }

    initialAd.locations.forEach((location) => {
      const locationId = location.locationId;

      if (locationId == null) {
        return;
      }

      void appDispatch(fetchLocationScreens(locationId));
      void appDispatch(fetchAssignedLocationScreens(locationId))
        .unwrap()
        .then((response) => {
          const assignedDeviceIds = [
            ...response.data.portraitScreens,
            ...response.data.landscapeScreens,
          ].map((device) => String(device.id));

          dispatch({
            type: "HYDRATE_SELECTED_DEVICES",
            payload: {
              [String(locationId)]: assignedDeviceIds,
            },
          });
        })
        .catch(() => {});
    });
  }, [appDispatch, initialAd?.locations]);

  useEffect(() => {
    const contentId = state.campaign.contentId;

    if (!contentId || !isStepThreeValid(state)) {
      void appDispatch(clearAdForecast());
      return;
    }

    void appDispatch(
      fetchInventoryForecast({
        contentId,
        locations: locationOptions.filter(
          (location) => state.locations.selectedDevices[location.id],
        ),
        schedule: state.schedule,
        selectedDevices: state.locations.selectedDevices,
      }),
    );
  }, [
    appDispatch,
    locationOptions,
    state.campaign.contentId,
    state.locations.selectedDevices,
    state.schedule,
  ]);

  const selectedLocationIds = Object.keys(state.locations.selectedDevices);
  const selectedLocations = useMemo(
    () =>
      locationOptions.filter((location) =>
        selectedLocationIds.includes(location.id),
      ),
    [locationOptions, selectedLocationIds],
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

    const metadata = await getVideoMetadata(file);

    dispatch({
      type: "SET_MEDIA_SLOT",
      payload: {
        slotId,
        file,
        previewUrl: URL.createObjectURL(file),
        fileName: file.name,
        sizeLabel: formatBytes(file),
        durationSeconds: metadata.durationSeconds,
        orientation: metadata.orientation,
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
      const hasNewUploads = state.campaign.uploadedMedia.some(
        (media) => media.file instanceof File,
      );
      const savedContentId =
        state.campaign.contentId && !hasNewUploads
          ? state.campaign.contentId
          : (await appDispatch(saveAdDraft(state.campaign)).unwrap()).contentId;

      dispatch({ type: "SET_CONTENT_ID", payload: savedContentId });

      if (state.step >= 2 && selectedLocations.length) {
        await appDispatch(
          assignLocationScreens({
            contentId: savedContentId,
            locations: selectedLocations,
            selectedDevices: state.locations.selectedDevices,
          }),
        ).unwrap();
      }

      if (!state.campaign.contentId || hasNewUploads) {
        const hydratedDraft = await appDispatch(
          fetchAdContent(savedContentId),
        ).unwrap();
        dispatch({ type: "HYDRATE_DRAFT", payload: hydratedDraft });
      }
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

    if (
      state.step === 2 &&
      state.campaign.contentId &&
      selectedLocations.length
    ) {
      void appDispatch(
        assignLocationScreens({
          contentId: state.campaign.contentId,
          locations: selectedLocations,
          selectedDevices: state.locations.selectedDevices,
        }),
      )
        .unwrap()
        .then(() => {
          dispatch({ type: "SET_STEP", payload: 3 });
        })
        .catch((error) => {
          toast.error(
            typeof error === "string"
              ? error
              : error instanceof Error
                ? error.message
                : "Unable to save location screens.",
            "Ad",
          );
        });
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

  const handlePublish = async () => {
    if (!state.campaign.contentId) {
      toast.error("Save the campaign draft before publishing.", "Ad");
      return;
    }

    setPublishing(true);

    try {
      await appDispatch(
        scheduleAdContent({
          contentId: state.campaign.contentId,
          locations: selectedLocations,
          schedule: state.schedule,
          publish: true,
        }),
      ).unwrap();
      dispatch({ type: "PUBLISH" });
    } catch (error) {
      toast.error(
        typeof error === "string"
          ? error
          : error instanceof Error
            ? error.message
            : "Unable to publish campaign.",
        "Ad",
      );
    } finally {
      setPublishing(false);
    }
  };

  if (state.published) {
    return (
      <WizardShell
        state={state}
        selectedLocations={selectedLocations}
        totalSelectedDevices={totalSelectedDevices}
        onBack={goBack}
      >
        <StepIndicator
          currentStep={4}
          isEditMode={state.isEditMode}
          canReachStep={canReachStep}
          onStepClick={(step) => dispatch({ type: "SET_STEP", payload: step })}
        />
        <div className="rounded-[24px] border border-slate-200 bg-white px-6 py-20 shadow-sm">
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

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
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
                locations={locationOptions}
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
                    payload: {
                      locationId,
                      deviceIds:
                        locationOptions
                          .find((location) => location.id === locationId)
                          ?.devices.map((device) => device.id) ?? [],
                    },
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
                publishing={publishing}
                onPublish={() => void handlePublish()}
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
            <div className="lg:top-6">
              {state.step === 1 ? (
                <InventoryForecastPanel
                  selectedLocations={selectedLocations}
                  selectedDevices={state.locations.selectedDevices}
                  schedule={state.schedule}
                  forecast={forecast}
                  compact={false}
                />
              ) : (
                <div className="space-y-4">
                  <CampaignMediaPreview campaign={state.campaign} />
                  <InventoryForecastPanel
                    selectedLocations={selectedLocations}
                    selectedDevices={state.locations.selectedDevices}
                    schedule={state.schedule}
                    forecast={forecast}
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
  selectedLocations: LocationOption[];
  totalSelectedDevices: number;
  onBack: () => void;
}) {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-sm text-[#333333]">
        <span
          className="text-[24px] font-[400] cursor-pointer"
          onClick={() => navigate("/ads-management")}
        >
          Ad Management
        </span>
        <ChevronRight className="h-6 w-6" />
        {state.isEditMode ? (
          <span className="font-semibold text-[#333333] text-[24px]">
            Edit Details
          </span>
        ) : (
          <span className="font-semibold text-[#333333] text-[24px]">
            Create New Content
          </span>
        )}
      </div>

      {children}
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
            <div
              key={step.id}
              className="flex items-center gap-2 md:gap-3 w-full"
            >
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
                <span className="text-[14px] text-[#333333] font-medium lg:text-nowrap text-wrap">
                  {step.label}
                </span>
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
  const uploadedMedia = getUploadedMedia(campaign);

  console.log(uploadedMedia);

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-[18px] font-semibold text-[#333333]">
        <FileText className="h-5 w-5 text-violet-700" />
        <span>Campaign Media</span>
      </div>

      <div className="mt-4 space-y-3">
        {uploadedMedia.length ? (
          uploadedMedia.map((media, index) => (
            <div
              key={`${media.fileName}-${index}`}
              className="rounded-2xl border border-slate-200 p-3"
            >
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="h-16 w-full overflow-hidden rounded-xl bg-black sm:w-24">
                  {media.previewUrl ? (
                    <video
                      src={media.previewUrl}
                      className={`h-full w-full ${
                        media.orientation === "PORTRAIT"
                          ? "object-contain bg-black"
                          : "object-cover"
                      }`}
                      muted
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm font-semibold text-white/90">
                      Media
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-[#333333]">
                      {campaign.name || "Untitled campaign"}
                    </p>
                    {campaign.mediaMode === "CUSTOM" ? (
                      <span className="rounded-full bg-[#F2EAF6] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#5E1B7F]">
                        {getOrientationLabel(media.orientation)}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 truncate text-xs text-[#333333]">
                    {media.fileName || "No media uploaded yet"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-4 text-xs text-[#333333]">
                    <span className="inline-flex items-center gap-1">
                      <Video className="h-3.5 w-3.5" />
                      {media.durationSeconds?.toPrecision(3)} seconds
                    </span>
                    {media.sizeLabel ? (
                      <span className="inline-flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5" />
                        {media.sizeLabel}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-slate-200 p-3 text-sm text-[#333333]">
            No media uploaded yet
          </div>
        )}
      </div>
    </div>
  );
}

export function InventoryForecastPanel({
  selectedLocations,
  selectedDevices,
  schedule,
  forecast,
  compact,
}: {
  selectedLocations: LocationOption[];
  selectedDevices: Record<string, string[]>;
  schedule: Record<string, ScheduleEntry>;
  forecast: InventoryForecastResponse | null;
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
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-[#333333]">
            <BarChart3 className="h-8 w-8" />
          </div>
          <p className="mt-5 max-w-xs text-sm leading-6">
            Select locations &amp; configure Schedule to the forecast
          </p>
        </div>
      </div>
    );
  }

  if (!forecast) {
    return (
      <div className="rounded-[18px] border border-[#E8E1EE] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-base font-semibold text-[#333333]">
          <BarChart3 className="h-5 w-5 text-violet-700" />
          <h3>Inventory Forecast</h3>
        </div>
        <div className="flex min-h-[260px] flex-col items-center justify-center text-center text-[#333333]">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-[#333333]">
            <BarChart3 className="h-8 w-8" />
          </div>
          <p className="mt-5 max-w-xs text-sm leading-6">
            Save a draft and complete screen selection plus schedule details to
            fetch the forecast.
          </p>
        </div>
      </div>
    );
  }

  const totalTargetPlays = selectedLocations.reduce(
    (sum, location) => sum + (schedule[location.id]?.targetPlays ?? 0),
    0,
  );
  const totalSelectedDevices = forecast.totalScreens;
  const utilisationPercentage = Number(
    safeFixed(forecast.overallUtilization, 4),
  );

  return (
    <div className="space-y-4 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-[18px] font-semibold text-[#333333]">
        <BarChart3 className="h-5 w-5 text-violet-700" />
        <span className="text-[18px] font-semibold text-[#333333]">
          Inventory Forecast
        </span>
      </div>

      {selectedLocations.map((location) => {
        const selectedCount = selectedDevices[location.id]?.length ?? 0;
        const terminalForecast =
          forecast.terminals.find(
            (terminal) =>
              String(terminal.locationId) ===
              String(location.apiLocationId ?? location.id),
          ) ?? null;
        const capacityHours = terminalForecast?.capacityHours ?? 0;
        const requiredHours = terminalForecast?.requiredHours ?? 0;
        const availableHours = terminalForecast?.availableHours ?? 0;
        const locationUtilization = terminalForecast
          ? Number(safeFixed(terminalForecast.utilizationPercentage, 4))
          : 0;

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
                {locationUtilization}%
              </span>
            </div>

            <div className="mt-3 h-2 rounded-full bg-emerald-100">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{
                  width: `${Math.min(100, locationUtilization)}%`,
                }}
              />
            </div>

            <div
              className={`mt-4 grid gap-3 text-sm text-slate-600 ${
                compact ? "grid-cols-2" : "grid-cols-2 xl:grid-cols-3"
              }`}
            >
              <ForecastStat
                label="Capacity"
                value={`${safeFixed(capacityHours, 1)}h`}
              />
              <ForecastStat
                label="Available"
                value={`${safeFixed(availableHours, 1)}h`}
              />
              <ForecastStat
                label="Required"
                value={`${safeFixed(requiredHours, 2)}h`}
              />
              <ForecastStat
                label="Campaign Days"
                value={String(getCampaignDays(schedule[location.id]))}
              />
              <ForecastStat
                label="Daily Window"
                value={
                  schedule[location.id]
                    ? `${Math.max(
                        0,
                        Number(schedule[location.id].endTime.split(":")[0]) -
                          Number(schedule[location.id].startTime.split(":")[0]),
                      )}h`
                    : "0h"
                }
              />
              <ForecastStat
                label="Interval"
                value={`${terminalForecast?.pacingIntervalSeconds ?? 0}s`}
              />
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
            <p>{safeFixed(forecast.totalRequiredHours, 4)}h required</p>
          </div>
        </div>

        <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 text-sm text-slate-600">
          <SummaryRow
            label="Total Screens"
            value={String(totalSelectedDevices)}
          />
          <SummaryRow
            label="Total Target Plays"
            value={String(totalTargetPlays)}
          />
          <SummaryRow
            label="Total Required Time"
            value={`${safeFixed(forecast.totalRequiredHours, 4)}h`}
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
      <p className="text-xs uppercase tracking-wide text-[#333333]">{label}</p>
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
  locations,
  selectedDevices,
  expandedLocationId,
  onExpandLocation,
  onToggleLocation,
  onToggleDevice,
  onToggleSelectAll,
}: {
  locations: LocationOption[];
  selectedDevices: Record<string, string[]>;
  expandedLocationId: string | null;
  onExpandLocation: (locationId: string | null) => void;
  onToggleLocation: (locationId: string) => void;
  onToggleDevice: (locationId: string, deviceId: string) => void;
  onToggleSelectAll: (locationId: string) => void;
}) {
  const selectedLocationIds = Object.keys(selectedDevices);
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <section className="space-y-6">
      <div>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-semibold text-[#333333]">
              Location &amp; Screens
            </h2>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#333333]" />

            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search"
              className="h-10 w-full rounded-xl border border-[#9870AD] pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-violet-100"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {locations.map((location) => {
            const isSelected = Boolean(selectedDevices[location.id]);

            return (
              <label
                key={location.id}
                className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                  isSelected
                    ? "border-[#9870AD] bg-[#F2EAF6] text-[#5E1B7F]"
                    : "border-[#D1D5DC] bg-white text-[#333333] hover:border-slate-300"
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
                  className="hidden h-4 w-4 rounded border-slate-300 text-violet-700 focus:ring-violet-400"
                />
                <MapPin
                  className={`h-5 w-5 ${isSelected ? "text-violet-700" : "text-[#333333]"}`}
                />
                <span>{location.name}</span>
                <span
                  className={`rounded-full ${isSelected ? "bg-white" : "bg-[#D1D5DC]"} px-2 py-1.5 text-xs font-semibold text-[#333333]`}
                >
                  {location.devices.length}
                </span>
              </label>
            );
          })}
        </div>

        <div className="mt-6 space-y-4">
          {selectedLocationIds.length ? (
            locations
              .filter((location) => selectedLocationIds.includes(location.id))
              .map((location) => {
                const isExpanded = expandedLocationId === location.id;
                const allSelected =
                  selectedDevices[location.id]?.length ===
                  location.devices.length;

                return (
                  <div
                    key={location.id}
                    className="rounded-[24px] border border-[#D1D5DC] bg-white"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        onExpandLocation(isExpanded ? null : location.id)
                      }
                      className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                    >
                      <div className="flex gap-2 items-center">
                        <Monitor className="h-5 w-5 text-[#333333]" />
                        <div>
                          <p className="text-[14px] font-medium text-[#333333]">
                            {location.name}
                          </p>
                          <p className="text-[12px] text-[#566272]">
                            {location.devices.length} Screens
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="rounded-full bg-[#5E1B7F] px-3 py-1 text-[14px] font-medium text-white">
                          {selectedDevices[location.id]?.length}/
                          {location.devices.length} Selected
                        </span>
                        <ChevronDown
                          className={`h-5 w-5 text-[#333333] transition ${
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
                            className="h-4 w-4 rounded-sm  accent-[#5E1B7F] p-2 focus:ring-[#5E1B7F]"
                          />
                          Select all
                        </label>

                        <ScreenSection
                          title="Portrait Screens"
                          devices={location.devices.filter(
                            (device) =>
                              String(device.orientation).toLowerCase() ===
                              "portrait",
                          )}
                          locationId={location.id}
                          searchTerm={searchTerm}
                          selectedDevices={selectedDevices}
                          onToggleDevice={onToggleDevice}
                        />
                        <hr className="w-full lg:mt-8 md:mt-6 mt-4 h-2 text-[#E2E4EA]"></hr>
                        <ScreenSection
                          title="Landscape Screens"
                          devices={location.devices.filter(
                            (device) =>
                              String(device.orientation).toLowerCase() ===
                              "landscape",
                          )}
                          locationId={location.id}
                          searchTerm={searchTerm}
                          selectedDevices={selectedDevices}
                          onToggleDevice={onToggleDevice}
                        />
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
  selectedLocations: LocationOption[];
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

    if (
      !openLocationId ||
      !selectedLocations.some((item) => item.id === openLocationId)
    ) {
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
              <div
                key={location.id}
                className="rounded-[24px] border border-slate-200"
              >
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
                    className={`h-5 w-5 text-[#333333] transition ${
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
                            onScheduleChange(
                              location.id,
                              "startDate",
                              event.target.value,
                            )
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
                            onScheduleChange(
                              location.id,
                              "startTime",
                              event.target.value,
                            )
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
                            onScheduleChange(
                              location.id,
                              "endDate",
                              event.target.value,
                            )
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
                            onScheduleChange(
                              location.id,
                              "endTime",
                              event.target.value,
                            )
                          }
                          className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                        />
                      </Field>
                    </div>

                    {/* <div className="mt-5">
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
                    </div> */}
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

function ScreenSection({
  title,
  devices,
  locationId,
  searchTerm,
  selectedDevices,
  onToggleDevice,
}: {
  title: string;
  devices: LocationOption["devices"];
  locationId: string;
  searchTerm: string;
  selectedDevices: Record<string, string[]>;
  onToggleDevice: (locationId: string, deviceId: string) => void;
}) {
  const filteredDevices = devices.filter((device) =>
    `${device.deviceCode} ${device.brand} ${device.model} ${device.landmark ?? ""}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase().trim()),
  );

  if (!filteredDevices.length) {
    return null;
  }

  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-[#333333]">{title}</p>
        <div className="flex items-center gap-3 text-xs text-[#333333]">
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded-sm bg-[#3EAF3F] border border-[#3EAF3F]" />
            Working
          </span>
          <hr className="h-3 w-px bg-[#D1D5DC]" />
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded-sm bg-[#B4272A] border border-[#B4272A]" />
            Not Working
          </span>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filteredDevices.map((device) => {
          const isSelected = selectedDevices[locationId]?.includes(
            String(device.id),
          );
          const isWorking = String(device.status).toLowerCase() === "active";

          return (
            <label
              key={device.id}
              className={`flex cursor-pointer flex-col gap-3 rounded-2xl border p-3 text-sm transition ${
                isWorking
                  ? "border-[#3EAF3F] bg-[#3EAF3F1A]"
                  : "border-[#B4272A] bg-[#B4272A1A]"
              } ${isSelected ? "ring-2 ring-[#5E1B7F1F]" : ""}`}
            >
              <div className="flex items-center gap-2">
                <input
                  aria-label={`Select ${device.deviceCode}`}
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleDevice(locationId, String(device.id))}
                  className="h-4 w-4 rounded-sm  accent-[#5E1B7F] p-2 focus:ring-[#5E1B7F]"
                />
                <span className="truncate font-medium text-[#333333]">
                  {device.deviceCode}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 text-[11px] text-[#6A7282]">
                <span className="rounded-full bg-white px-2 py-1">
                  {device.brand}
                </span>
                <span className="rounded-full bg-white px-2 py-1">
                  {device.deviceSize
                    ? `${device.deviceSize} inch`
                    : device.model}
                </span>
              </div>
              <span className="rounded-full bg-white px-2 py-1 text-center text-[11px] text-[#6A7282]">
                {device.landmark || "No landmark"}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export function Step4Submit({
  state,
  selectedLocations,
  publishing,
  onPublish,
}: {
  state: CampaignWizardState;
  selectedLocations: LocationOption[];
  publishing: boolean;
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
                <SummaryCard
                  label="Campaign Name"
                  value={state.campaign.name}
                />
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
                        {state.locations.selectedDevices[location.id]?.length ??
                          0}{" "}
                        devices
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {location.devices
                        .filter((device) =>
                          state.locations.selectedDevices[
                            location.id
                          ]?.includes(String(device.id)),
                        )
                        .map((device) => (
                          <span
                            key={device.id}
                            className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600"
                          >
                            {device.deviceCode}
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
              disabled={publishing}
              className="w-full rounded-2xl bg-custom-gradient px-5 py-4 text-base font-semibold text-white shadow-lg shadow-violet-200 transition hover:opacity-95"
            >
              {publishing ? "Publishing..." : "Publish Campaign"}
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

function getVideoMetadata(file: File): Promise<{
  durationSeconds: number;
  orientation: "PORTRAIT" | "LANDSCAPE" | "UNKNOWN";
}> {
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
      const durationSeconds =
        Number.isFinite(video.duration) && video.duration > 0
          ? Number(video.duration.toFixed(2))
          : 0;
      const orientation =
        video.videoWidth && video.videoHeight
          ? video.videoHeight > video.videoWidth
            ? "PORTRAIT"
            : "LANDSCAPE"
          : "UNKNOWN";
      cleanup();
      resolve({ durationSeconds, orientation });
    };
    video.onerror = () => {
      cleanup();
      resolve({ durationSeconds: 0, orientation: "UNKNOWN" });
    };
    video.src = objectUrl;
  });
}
