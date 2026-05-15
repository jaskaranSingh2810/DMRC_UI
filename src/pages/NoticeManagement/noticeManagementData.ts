import type { Notice, NoticeStats, NoticeThemeOption } from "@/types";
import { getNoticeStatusCategory } from "./noticeManagementHelpers";

export const NOTICE_THEMES: NoticeThemeOption[] = [
  {
    id: "weather-blue",
    label: "Weather Disruption",
    category: "Weather",
    palette: {
      primary: "#272A78",
      secondary: "#F59E0B",
      accent: "#8CCBFF",
      text: "#FFFFFF",
      panel: "#1A1C54",
    },
  },
  {
    id: "metro-blue",
    label: "Metro Advisory",
    category: "Metro",
    palette: {
      primary: "#2D3E8B",
      secondary: "#9DD6FF",
      accent: "#D9EDFF",
      text: "#FFFFFF",
      panel: "#182358",
    },
  },
  {
    id: "service-amber",
    label: "Service Advisory",
    category: "Service",
    palette: {
      primary: "#F59E0B",
      secondary: "#1D4ED8",
      accent: "#FFE9B8",
      text: "#FFFFFF",
      panel: "#C97A00",
    },
  },
  {
    id: "passenger-orange",
    label: "Passenger Information",
    category: "Passenger",
    palette: {
      primary: "#F97316",
      secondary: "#FFF7ED",
      accent: "#FED7AA",
      text: "#FFFFFF",
      panel: "#C2410C",
    },
  },
  {
    id: "alert-red",
    label: "Alert Notice",
    category: "Alert",
    palette: {
      primary: "#E11D48",
      secondary: "#FDE68A",
      accent: "#FECDD3",
      text: "#FFFFFF",
      panel: "#9F1239",
    },
  },
  {
    id: "emergency-red",
    label: "Emergency Broadcast",
    category: "Emergency",
    palette: {
      primary: "#DC2626",
      secondary: "#FCA5A5",
      accent: "#FEE2E2",
      text: "#FFFFFF",
      panel: "#991B1B",
    },
  },
];

const initialNotices: Notice[] = [
  {
    noticeId: "notice-1001",
    announcementName: "Metro Express Service Update",
    description:
      "Metro services towards New Delhi are running with a delay of 5 minutes due to operational reasons. Passengers are advised to plan accordingly and arrive early at the platform.",
    createdBy: "Deepak Kumar",
    publishedOn: "2026-04-17T09:00:00Z",
    createdAt: "2026-04-17T09:00:00Z",
    updatedAt: "2026-04-17T09:00:00Z",
    startDate: "2026-04-27",
    endDate: "2026-05-27",
    locations: [
      { locationId: "1", locationName: "Terminal 1" },
      { locationId: "2", locationName: "Terminal 3" },
    ],
    startTime: "09:00",
    endTime: "19:00",
    status: "LIVE",
    themeId: "weather-blue",
    descriptionShort:
      "Metro services towards New Delhi are running with a delay of 5 minutes.",
  } as Notice,
  {
    noticeId: "notice-1002",
    announcementName: "Weekend Maintenance Alert",
    description:
      "Escalator maintenance is scheduled this weekend. Please use alternate access routes and follow platform signage.",
    createdBy: "Anita Sharma",
    publishedOn: "2026-04-12T08:30:00Z",
    createdAt: "2026-04-12T08:30:00Z",
    updatedAt: "2026-04-16T10:00:00Z",
    startDate: "2026-04-14",
    endDate: "2026-04-16",
    locations: [{ locationId: "3", locationName: "Airport Line" }],
    startTime: "06:00",
    endTime: "22:00",
    status: "EXPIRED",
    themeId: "service-amber",
  },
  {
    noticeId: "notice-1003",
    announcementName: "Passenger Assistance Desk Relocated",
    description:
      "The passenger assistance desk at Terminal 1 has temporarily moved near Gate 3 for the next two weeks.",
    createdBy: "Ritika Verma",
    publishedOn: "2026-05-01T07:00:00Z",
    createdAt: "2026-05-01T07:00:00Z",
    updatedAt: "2026-05-01T07:00:00Z",
    startDate: "2026-05-14",
    endDate: "2026-05-30",
    locations: [{ locationId: "1", locationName: "Terminal 1" }],
    startTime: "07:00",
    endTime: "17:00",
    status: "LIVE",
    themeId: "passenger-orange",
  },
];

export let fallbackNoticeDb = [...initialNotices];

export function resetFallbackNoticeDb() {
  fallbackNoticeDb = [...initialNotices];
}

export function getFallbackNotices(): Notice[] {
  return fallbackNoticeDb;
}

export function saveFallbackNotice(notice: Notice) {
  const index = fallbackNoticeDb.findIndex(
    (item) => String(item.noticeId) === String(notice.noticeId),
  );

  if (index === -1) {
    fallbackNoticeDb = [notice, ...fallbackNoticeDb];
    return;
  }

  fallbackNoticeDb = fallbackNoticeDb.map((item) =>
    String(item.noticeId) === String(notice.noticeId) ? notice : item,
  );
}

export function deleteFallbackNotice(id: string | number): Notice | undefined {
  const existing = fallbackNoticeDb.find(
    (notice) => String(notice.noticeId) === String(id),
  );

  fallbackNoticeDb = fallbackNoticeDb.filter(
    (notice) => String(notice.noticeId) !== String(id),
  );

  return existing;
}

export function getFallbackNoticeStats(): NoticeStats {
  return fallbackNoticeDb.reduce(
    (stats, notice) => {
      stats.total += 1;

      const category = getNoticeStatusCategory(String(notice.status));

      if (category === "live") {
        stats.live += 1;
      }

      if (category === "expired") {
        stats.expired += 1;
      }

      return stats;
    },
    { total: 0, live: 0, expired: 0 } as NoticeStats,
  );
}
