import type {
  Notice,
  NoticeListRequest,
  NoticeMutationFormValues,
  NoticeMutationPayload,
  NoticeStatusFilter,
  NoticeThemeOption,
} from "@/types";

function toLower(value: unknown): string {
  return String(value ?? "").toLowerCase().trim();
}

function getLocationsLabel(notice: Notice): string {
  if (notice.locations?.length) {
    return notice.locations.map((location) => location.locationName).join(", ");
  }

  return notice.locationName ?? "";
}

function getFieldValue(notice: Notice, field: string): string {
  switch (field) {
    case "locations":
      return getLocationsLabel(notice);
    case "publishedOn":
      return notice.publishedOn ?? notice.createdAt ?? "";
    default:
      return String(notice[field as keyof Notice] ?? "");
  }
}

function compareValues(left: string, right: string, direction: "ASC" | "DESC") {
  if (left === right) {
    return 0;
  }

  const result = left.localeCompare(right, undefined, {
    numeric: true,
    sensitivity: "base",
  });

  return direction === "ASC" ? result : result * -1;
}

export function getNoticeStatusCategory(status: string): NoticeStatusFilter | "other" {
  const normalized = toLower(status);

  if (normalized === "live" || normalized === "active" || normalized === "published") {
    return "live";
  }

  if (normalized === "expired") {
    return "expired";
  }

  return "other";
}

export function formatNoticeDate(value?: string | null): string {
  if (!value) {
    return "-";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleDateString("en-GB").replace(/\//g, "-");
}

export function formatNoticeTime(value?: string | null): string {
  if (!value) {
    return "-";
  }

  if (/^\d{2}:\d{2}$/.test(value)) {
    return value;
  }

  const parsedDate = new Date(`1970-01-01T${value}`);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function applyNoticeQuery(
  notices: Notice[],
  request: NoticeListRequest,
) {
  const filtered = notices.filter((notice) => {
    const matchesFilters = Object.entries(request.filters ?? {}).every(([key, value]) => {
      if (!value) {
        return true;
      }

      return toLower(getFieldValue(notice, key)).includes(toLower(value));
    });

    if (!matchesFilters) {
      return false;
    }

    if (!request.statusFilter || request.statusFilter === "all") {
      return true;
    }

    return getNoticeStatusCategory(String(notice.status)) === request.statusFilter;
  });

  const sorted = [...filtered];
  const criteria = request.sortCriteria ?? [];

  if (criteria.length) {
    sorted.sort((left, right) => {
      for (const criterion of criteria) {
        const compareResult = compareValues(
          getFieldValue(left, criterion.field),
          getFieldValue(right, criterion.field),
          criterion.direction,
        );

        if (compareResult !== 0) {
          return compareResult;
        }
      }

      return 0;
    });
  }

  const size = Math.max(1, request.size || 10);
  const totalElements = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / size));
  const page = Math.min(Math.max(0, request.page || 0), totalPages - 1);
  const startIndex = page * size;
  const content = sorted.slice(startIndex, startIndex + size);

  return {
    content,
    currentPage: page,
    totalPages,
    totalElements,
    pageSize: size,
    isFirst: page === 0,
    isLast: page >= totalPages - 1,
  };
}

export function createNoticeMutationPayload(
  values: NoticeMutationFormValues,
): NoticeMutationPayload {
  return {
    announcementName: values.announcementName.trim(),
    description: values.description.trim(),
    locationIds: values.selectedLocationIds,
    themeId: values.themeId,
    startDate: values.startDate,
    endDate: values.endDate,
    startTime: values.startTime,
    endTime: values.endTime,
    status: values.status,
    userName: values.userName,
  };
}

export function getNoticeThemeById(
  themes: NoticeThemeOption[],
  themeId?: string | null,
): NoticeThemeOption | undefined {
  return (
    themes.find((theme) => theme.id === themeId) ??
    themes[0]
  );
}

export function getNoticeLocationsLabel(notice: Notice): string {
  return getLocationsLabel(notice) || "-";
}

export function toggleNoticeLocationSelection(
  selectedLocationIds: string[],
  value: string,
  allLocationIds: string[],
): string[] {
  if (value === "ALL") {
    const allSelected =
      allLocationIds.length > 0 &&
      allLocationIds.every((locationId) => selectedLocationIds.includes(locationId));

    return allSelected ? [] : [...allLocationIds];
  }

  if (selectedLocationIds.includes(value)) {
    return selectedLocationIds.filter((locationId) => locationId !== value);
  }

  return [...selectedLocationIds, value];
}
