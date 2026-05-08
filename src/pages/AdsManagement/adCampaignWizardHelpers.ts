import type {
  CampaignMediaSlotState,
  CampaignMediaState,
  MediaOrientation,
  MediaMode,
} from "./adCampaignWizardTypes";

export function createEmptyMediaSlot(
  id: string,
  label: string = "Upload Portrait Ad",
): CampaignMediaSlotState {
  return {
    id,
    label,
    file: null,
    previewUrl: "",
    fileName: "",
    sizeLabel: "",
    durationSeconds: 0,
    status: "empty",
    remoteFilePath: null,
    orientation: "UNKNOWN",
  };
}

export function formatBytes(file: File): string {
  return formatBytesFromSize(file.size);
}

export function formatBytesFromSize(size: number): string {
  const mb = size / (1024 * 1024);
  return `${mb.toFixed(1)} mb`;
}

export function getUploadedMedia(
  campaign: CampaignMediaState,
): CampaignMediaSlotState[] {
  return campaign.uploadedMedia.filter((media) => Boolean(media.fileName));
}

export function getRequiredMediaCount(campaign: CampaignMediaState): number {
  return campaign.mediaMode === "CUSTOM" ? 2 : 1;
}

export function getDraftMediaType(campaign: CampaignMediaState): MediaMode {
  return getUploadedMedia(campaign).length > 1 ? "CUSTOM" : "AUTO_FIT";
}

export function isStepOneReady(campaign: CampaignMediaState): boolean {
  return Boolean(
    campaign.name.trim() &&
      getUploadedMedia(campaign).length >= getRequiredMediaCount(campaign),
  );
}

export function getStepOneValidationMessage(
  campaign: CampaignMediaState,
): string | null {
  if (!campaign.name.trim()) {
    return "Enter a campaign name to continue.";
  }

  const requiredMediaCount = getRequiredMediaCount(campaign);

  if (getUploadedMedia(campaign).length < requiredMediaCount) {
    return `Upload ${requiredMediaCount} media file${requiredMediaCount > 1 ? "s" : ""} to continue.`;
  }

  return null;
}

export function buildDraftUploadFormData(campaign: CampaignMediaState): FormData {
  const formData = new FormData();
  const uploadedMedia = getUploadedMedia(campaign);
  const request = {
    contentName: campaign.name.trim(),
    contentType: "VIDEO",
    mediaType: getDraftMediaType(campaign),
    isDraft: true,
  };

  formData.append(
    "request",
    new Blob([JSON.stringify(request)], { type: "application/json" }),
  );

  uploadedMedia.forEach((media) => {
    if (media.file) {
      formData.append("files", media.file);
    }
  });

  return formData;
}

export function buildMediaPreviewUrl(filePath: string): string {
  const contentBaseUrl =
    import.meta.env.VITE_CONTENT_API_URL ?? "http://localhost:8085";
  const normalizedPath = filePath.replace(/\\/g, "/");
  const pathWithLeadingSlash = normalizedPath.startsWith("/")
    ? normalizedPath
    : `/${normalizedPath}`;

  return `${contentBaseUrl}${pathWithLeadingSlash}`;
}

export function getOrientationLabel(orientation: MediaOrientation): string {
  if (orientation === "PORTRAIT") {
    return "Portrait";
  }

  if (orientation === "LANDSCAPE") {
    return "Landscape";
  }

  return "Unknown";
}
