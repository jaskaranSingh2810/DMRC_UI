import type { ChangeEvent } from "react";
import { Check, CheckCircle2, Circle, Upload, Video, X } from "lucide-react";
import type {
  CampaignMediaSlotState,
  CampaignMediaState,
  MediaMode,
} from "./adCampaignWizardTypes";
import { getOrientationLabel } from "./adCampaignWizardHelpers";

interface Step1Props {
  campaign: CampaignMediaState;
  onNameChange: (value: string) => void;
  onMediaModeChange: (value: MediaMode) => void;
  onMediaUpload: (slotId: string, event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveMedia: (slotId: string) => void;
}

export default function AdCampaignStepOne({
  campaign,
  onNameChange,
  onMediaModeChange,
  onMediaUpload,
  onRemoveMedia,
}: Step1Props) {
  return (
    <section>
      <div>
        <label
          htmlFor="campaign-name"
          className="block text-[18px] font-semibold text-[#2D2A32]"
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
          className="mt-3 h-11 w-full rounded-xl border border-[#E6E6E6] px-4 text-[16px] text-[#333333] outline-none transition focus:border-[#7A3FA0] focus:ring-2 focus:ring-[#7A3FA01A]"
        />
      </div>

      <div className="mt-6">
        <p className="text-[18px] font-semibold text-[#2D2A32]">Upload Media</p>
        <div className="mt-3 flex flex-wrap gap-5 text-[16px] font-[400] text-[#333333]">
          <label className="inline-flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="media-mode"
              checked={campaign.mediaMode === "AUTO_FIT"}
              onChange={() => onMediaModeChange("AUTO_FIT")}
              className="hidden"
            />
            <div className="relative flex items-center justify-center">
              <Circle className="h-5 w-5 text-[#5E1B7F]" strokeWidth={2} />

              {campaign.mediaMode === "AUTO_FIT" && (
                <Check className="absolute h-[16px] w-[16px] rounded-full overflow-hidden text-[#FFFFFF] bg-[#5E1B7F]" />
              )}
            </div>
            Generic
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="media-mode"
              checked={campaign.mediaMode === "CUSTOM"}
              onChange={() => onMediaModeChange("CUSTOM")}
              className="hidden"
            />
            <div className="relative flex items-center justify-center">
              <Circle className="h-5 w-5 text-[#5E1B7F]" strokeWidth={2} />

              {campaign.mediaMode === "CUSTOM" && (
                <Check className="absolute h-[16px] w-[16px] rounded-full overflow-hidden text-[#FFFFFF] bg-[#5E1B7F]" />
              )}
            </div>
            Custom
          </label>
        </div>

        <div
          className={`mt-4 grid gap-4 ${
            campaign.mediaMode === "CUSTOM" ? "2xl:grid-cols-2 grid-cols-1" : "grid-cols-1"
          }`}
        >
          {campaign.uploadedMedia.map((media) => (
            <MediaSlotCard
              key={media.id}
              media={media}
              multiple={campaign.mediaMode === "CUSTOM"}
              required={campaign.mediaMode === "CUSTOM" ? 2 : 1}
              onUpload={(event) => onMediaUpload(media.id, event)}
              onRemove={() => onRemoveMedia(media.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function MediaSlotCard({
  media,
  multiple,
  required,
  onUpload,
  onRemove,
}: {
  media: CampaignMediaSlotState;
  multiple: boolean;
  required: number;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
}) {
  const inputId = `campaign-media-${media.id}`;

  if (media.status === "uploaded") {
    return (
      <div className="overflow-hidden rounded-[14px] border border-[#E6E2EB] bg-white">
        <div className="flex flex-wrap gap-4 p-3 flex-row items-start">
          <div className="h-[130px] overflow-hidden rounded-[10px] bg-black w-[230px]">
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
              <div className="flex h-full items-center justify-center text-xs font-medium text-slate-500">
                Preview
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="inline-flex items-center gap-2 text-[14px] font-medium text-[#3EAF3F]">
                  <CheckCircle2 className="h-5 w-5" />
                  Upload Complete
                </p>
                <p className="mt-2 truncate text-[16px] font-medium text-[#333333]">
                  {media.fileName}
                </p>
                {multiple ? (
                  <span className="mt-2 inline-flex rounded-full bg-[#F2EAF6] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#5E1B7F]">
                    {getOrientationLabel(media.orientation)}
                  </span>
                ) : null}
              </div>

              <button
                type="button"
                onClick={onRemove}
                className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label={`Remove ${media.fileName}`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-4 text-[12px] font-medium text-[#566272]">
              <span className="flex gap-1 items-center"> <Video className="h-4 w-4" />{formatDuration(media.durationSeconds)}</span>
              <span>{media.sizeLabel}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <label
      htmlFor={inputId}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-[14px] border border-dashed border-[#D8C7E3] bg-[#FCFAFD] px-5 text-center transition hover:border-[#B689D1] hover:bg-[#FAF5FD] ${
        multiple ? "min-h-[150px] py-10" : "min-h-[182px] py-12"
      }`}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#5E1B7F] text-white">
        <Upload className="h-4 w-4" />
      </span>
      <span className="mt-4 text-[14px] font-medium text-[#333333]">
        {multiple
          ? media.label
          : "Drag & drop your file here or click to browse, Upload Ad (Auto-fit)"}
      </span>
      {multiple ? (
        <span className="mt-2 text-[12px] font-medium text-[#5E1B7F]">
          {media.id === "primary" ? "Portrait media required" : "Landscape media required"}
        </span>
      ) : null}
      <span className="mt-2 max-w-[440px] text-xs leading-5 text-[#6A7282]">
        {multiple
          ? "Media Guidelines: Duration 5-40 sec | Max size 50 MB | MP4, MOV supported"
          : "Upload one file. We'll automatically adapt it to all supported screen formats. Media Guidelines: Duration 5-40 sec | Max size 50 MB | MP4, MOV supported"}
      </span>
      <span className="mt-2 text-[11px] text-[#6A7282]">
        Required: {required} file{required > 1 ? "s" : ""}
      </span>
      <input
        id={inputId}
        aria-label={media.label}
        type="file"
        accept="video/mp4,video/quicktime"
        onChange={onUpload}
        className="sr-only"
      />
    </label>
  );
}

function formatDuration(durationSeconds: number) {
  if (!durationSeconds) {
    return "0 seconds";
  }

  return `${Math.round(durationSeconds)} seconds`;
}
