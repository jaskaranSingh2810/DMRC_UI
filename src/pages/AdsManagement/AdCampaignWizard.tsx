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
  Upload,
} from "lucide-react";
import {
  createDefaultSchedule,
  createInitialWizardState,
  DEFAULT_MEDIA_STATE,
  LOCATION_OPTIONS,
  WIZARD_STEPS,
} from "./adCampaignWizardData";
import type {
  AdCampaignWizardProps,
  CampaignWizardState,
  ScheduleEntry,
  WizardStep,
} from "./adCampaignWizardTypes";

type WizardAction =
  | { type: "SET_STEP"; payload: WizardStep }
  | { type: "SET_CAMPAIGN_NAME"; payload: string }
  | {
      type: "SET_MEDIA";
      payload: {
        file: File | null;
        previewUrl: string;
        fileName: string;
        sizeLabel: string;
      };
    }
  | { type: "REMOVE_MEDIA" }
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

function formatBytes(file: File): string {
  const mb = file.size / (1024 * 1024);
  return `${mb.toFixed(1)} mb`;
}

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
    case "SET_MEDIA":
      return {
        ...state,
        campaign: {
          ...state.campaign,
          mediaFile: action.payload.file,
          previewUrl: action.payload.previewUrl,
          fileName: action.payload.fileName,
          sizeLabel: action.payload.sizeLabel,
          durationSeconds: 30,
        },
      };
    case "REMOVE_MEDIA":
      return {
        ...state,
        campaign: {
          ...DEFAULT_MEDIA_STATE,
          name: state.campaign.name,
        },
      };
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
  return Boolean(state.campaign.name.trim() && state.campaign.fileName);
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
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(
    wizardReducer,
    createInitialWizardState(initialAd),
  );
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
      if (state.campaign.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(state.campaign.previewUrl);
      }
    };
  }, [state.campaign.previewUrl]);

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

  const handleMediaUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (state.campaign.previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(state.campaign.previewUrl);
    }

    dispatch({
      type: "SET_MEDIA",
      payload: {
        file,
        previewUrl: URL.createObjectURL(file),
        fileName: file.name,
        sizeLabel: formatBytes(file),
      },
    });
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
            <h2 className="mt-8 text-3xl font-semibold text-slate-900">
              Congratulations!
            </h2>
            <p className="mt-3 max-w-xl text-sm text-slate-500">
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
      <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
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
          <div className="min-w-0 space-y-6">
            {state.step === 1 ? (
              <Step1CampaignMedia
                campaign={state.campaign}
                onNameChange={(value) =>
                  dispatch({ type: "SET_CAMPAIGN_NAME", payload: value })
                }
                onMediaUpload={handleMediaUpload}
                onRemoveMedia={() => dispatch({ type: "REMOVE_MEDIA" })}
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
                onBack={goBack}
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
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <span>Ad Management</span>
        <ChevronRight className="h-4 w-4" />
        <span className="font-semibold text-slate-900">Create New Ad</span>
        {state.isEditMode ? (
          <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
            Edit mode
          </span>
        ) : null}
      </div>

      {children}

      {state.step === 4 && !state.published ? null : (
        <div className="hidden rounded-[24px] border border-slate-200 bg-white px-6 py-4 text-sm text-slate-500 xl:flex xl:items-center xl:justify-between">
          <div>
            <span className="font-semibold text-slate-900">
              {selectedLocations.length}
            </span>{" "}
            locations selected with{" "}
            <span className="font-semibold text-slate-900">
              {totalSelectedDevices}
            </span>{" "}
            screens configured.
          </div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>
      )}
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
      <div className="flex min-w-max items-center gap-2 md:gap-3">
        {WIZARD_STEPS.map((step, index) => {
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          const isEnabled = isEditMode || canReachStep(step.id);

          return (
            <div key={step.id} className="flex items-center gap-2 md:gap-3">
              <button
                type="button"
                onClick={() => onStepClick(step.id)}
                disabled={!isEnabled}
                className={`flex min-w-[220px] items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                  isActive
                    ? "border-violet-300 bg-violet-50 text-violet-800"
                    : isCompleted
                      ? "border-violet-200 bg-white text-slate-700"
                      : "border-slate-200 bg-white text-slate-500"
                } ${isEnabled ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                    isActive
                      ? "bg-violet-700 text-white"
                      : isCompleted
                        ? "bg-violet-100 text-violet-700"
                        : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : step.id}
                </span>
                <span className="text-sm font-medium">{step.label}</span>
              </button>

              {index < WIZARD_STEPS.length - 1 ? (
                <ChevronRight className="hidden h-4 w-4 text-slate-300 md:block" />
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
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-xl font-semibold text-slate-900">
        <FileText className="h-5 w-5 text-violet-700" />
        <h3>Campaign Media</h3>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 p-3">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="h-24 w-full overflow-hidden rounded-xl bg-gradient-to-br from-[#7b1fa2] via-[#1a56db] to-[#0f172a] sm:w-36">
            {campaign.previewUrl ? (
              <video
                src={campaign.previewUrl}
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
            <p className="truncate text-lg font-semibold text-slate-900">
              {campaign.name || "Untitled campaign"}
            </p>
            <p className="mt-1 truncate text-sm text-slate-500">
              {campaign.fileName || "No media uploaded yet"}
            </p>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-500">
              <span className="inline-flex items-center gap-1">
                <Clock3 className="h-4 w-4" />
                {campaign.durationSeconds} seconds
              </span>
              {campaign.sizeLabel ? (
                <span className="inline-flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  {campaign.sizeLabel}
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
      <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-xl font-semibold text-slate-900">
          <BarChart3 className="h-5 w-5 text-violet-700" />
          <h3>Inventory Forecast</h3>
        </div>
        <div className="flex min-h-[260px] flex-col items-center justify-center text-center text-slate-500">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <BarChart3 className="h-8 w-8" />
          </div>
          <p className="mt-5 max-w-xs text-base">
            Select locations and configure schedule to view the forecast.
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
      <div className="flex items-center gap-2 text-xl font-semibold text-slate-900">
        <BarChart3 className="h-5 w-5 text-violet-700" />
        <h3>Inventory Forecast</h3>
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
        <p className="text-lg font-semibold text-slate-900">Campaign Summary</p>
        <div className="mt-4 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-slate-200 text-sm font-semibold text-slate-700">
            {utilisationPercentage}%
          </div>
          <div className="text-sm text-slate-500">
            <p className="font-semibold text-slate-900">Overall utilisation</p>
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
  valueClassName = "text-slate-900",
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

export function Step1CampaignMedia({
  campaign,
  onNameChange,
  onMediaUpload,
  onRemoveMedia,
}: {
  campaign: CampaignWizardState["campaign"];
  onNameChange: (value: string) => void;
  onMediaUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveMedia: () => void;
}) {
  return (
    <section className="space-y-6">
      <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <label
            htmlFor="campaign-name"
            className="block text-lg font-semibold text-slate-900"
          >
            Campaign Name
          </label>
          <input
            id="campaign-name"
            aria-label="Campaign Name"
            type="text"
            value={campaign.name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="Enter Campaign Name"
            className="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          />
        </div>

        <div className="mt-6">
          <p className="text-lg font-semibold text-slate-900">Upload Media</p>

          {campaign.fileName ? (
            <div className="mt-4 rounded-2xl border border-slate-200 p-3">
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="h-28 w-full overflow-hidden rounded-xl bg-gradient-to-br from-[#a21caf] via-[#2563eb] to-[#0f172a] sm:w-40">
                  {campaign.previewUrl ? (
                    <video
                      src={campaign.previewUrl}
                      className="h-full w-full object-cover"
                      muted
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm font-semibold text-white/90">
                      Preview
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-emerald-600">
                        Upload Complete
                      </p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">
                        {campaign.fileName}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={onRemoveMedia}
                      className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-500 transition hover:bg-slate-50"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-4 w-4" />
                      {campaign.durationSeconds} seconds
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      {campaign.sizeLabel}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <label
              htmlFor="campaign-media"
              className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed border-violet-200 bg-violet-50/40 px-6 py-16 text-center transition hover:border-violet-300 hover:bg-violet-50"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-700 text-white">
                <Upload className="h-6 w-6" />
              </span>
              <span className="mt-5 text-lg font-semibold text-slate-900">
                Drag &amp; drop your file here or Click to browse
              </span>
              <span className="mt-2 max-w-md text-sm text-slate-500">
                Media guidelines: Duration 5-40 sec, Max size 50 MB, MP4 and MOV
                supported.
              </span>
            </label>
          )}

          <input
            id="campaign-media"
            aria-label="Upload Media"
            type="file"
            accept="video/mp4,video/quicktime"
            onChange={onMediaUpload}
            className="sr-only"
          />
        </div>
      </div>
    </section>
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
          <h2 className="text-2xl font-semibold text-slate-900">
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
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
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
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
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
                      <p className="text-lg font-semibold text-slate-900">
                        {location.name}
                      </p>
                      <p className="text-sm text-slate-500">
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
                      <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
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
            <div className="rounded-[24px] border border-dashed border-slate-300 px-6 py-12 text-center text-slate-500">
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
          <h2 className="text-2xl font-semibold text-slate-900">
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
                      <p className="text-lg font-semibold text-slate-900">
                        {location.name}
                      </p>
                      <p className="text-sm text-slate-500">
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
          <h2 className="text-2xl font-semibold text-slate-900">Submit</h2>
        </div>

        <div
          data-testid="campaign-summary"
          className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]"
        >
          <div className="space-y-6">
            <div className="rounded-[24px] border border-slate-200 p-5">
              <h3 className="text-lg font-semibold text-slate-900">
                Campaign Summary
              </h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <SummaryCard label="Campaign Name" value={state.campaign.name} />
                <SummaryCard
                  label="Uploaded Media"
                  value={state.campaign.fileName || "No file"}
                />
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 p-5">
              <h3 className="text-lg font-semibold text-slate-900">
                Locations &amp; Devices
              </h3>
              <div className="mt-4 space-y-4">
                {selectedLocations.map((location) => (
                  <div
                    key={location.id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-lg font-semibold text-slate-900">
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
              <h3 className="text-lg font-semibold text-slate-900">Schedule</h3>
              <div className="mt-4 space-y-4">
                {selectedLocations.map((location) => {
                  const entry = state.schedule[location.id];
                  return (
                    <div
                      key={location.id}
                      className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-lg font-semibold text-slate-900">
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
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function WizardFooter({
  step,
  canProceed,
  onBack,
  onNext,
}: {
  step: WizardStep;
  canProceed: boolean;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Save Draft
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!canProceed}
          className={`rounded-2xl px-6 py-3 text-sm font-semibold text-white transition ${
            canProceed
              ? "bg-custom-gradient shadow-lg shadow-violet-200 hover:opacity-95"
              : "bg-slate-300"
          }`}
        >
          {step === 3 ? "Next" : "Next"}
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
