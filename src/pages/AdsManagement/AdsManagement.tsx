import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Clock3,
  Image as ImageIcon,
  Pencil,
  Radio,
  TimerReset,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import DataTable from "@/components/Table/DataTable";
import type { SortState } from "@/components/Table/types";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/hooks/useToast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  clearAdMessages,
  fetchAds,
  removeAd,
  setAdFilter,
} from "@/store/slices/adSlice";
import type { Ad } from "@/types";

type AdStatFilter = "all" | "live" | "expired";

type AdActionState =
  | {
      ad: Ad;
      type: "remove";
    }
  | null;

function normalizeAdStatus(status: string): AdStatFilter | "other" {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus === "live" || normalizedStatus === "active") {
    return "live";
  }

  if (normalizedStatus === "expired") {
    return "expired";
  }

  return "other";
}

function formatDate(value?: string | null): string {
  if (!value) {
    return "-";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleDateString("en-GB");
}

function formatTime(value?: string | null): string {
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

function getAdLocationsLabel(ad: Ad): string {
  if (ad.locations?.length) {
    return ad.locations.map((location) => location.locationName).join(", ");
  }

  if (ad.locationName) {
    return ad.locationName;
  }

  return "-";
}

function StatusBadge({ status }: { status: string }) {
  const normalizedStatus = normalizeAdStatus(status);
  const displayStatus =
    normalizedStatus === "live"
      ? "Live"
      : normalizedStatus === "expired"
        ? "Expired"
        : status;

  const styles =
    normalizedStatus === "live"
      ? "bg-emerald-50 text-emerald-600"
      : normalizedStatus === "expired"
        ? "bg-rose-50 text-rose-500"
        : "bg-slate-100 text-slate-600";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-[12px] font-semibold ${styles}`}
    >
      {displayStatus}
    </span>
  );
}

export default function AdsManagement() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAppSelector((state) => state.auth);
  const { items, loading, error, successMessage, filters, listLoaded } =
    useAppSelector((state) => state.ads);

  const [page, setPage] = useState(1);
  const [sortState, setSortState] = useState<SortState | null>(null);
  const [selectedStatFilter, setSelectedStatFilter] =
    useState<AdStatFilter>("all");
  const [adAction, setAdAction] = useState<AdActionState>(null);

  useEffect(() => {
    if (!listLoaded) {
      void dispatch(fetchAds());
    }
  }, [dispatch, listLoaded]);

  useEffect(() => {
    if (!listLoaded) {
      return;
    }

    void dispatch(
      fetchAds({
        page: 0,
        size: 10,
        ...(sortState
          ? {
              sortCriteria: [
                {
                  field: sortState.key,
                  direction: sortState.direction,
                },
              ],
            }
          : {}),
      }),
    );
    setPage(1);
  }, [dispatch, listLoaded, sortState]);

  useEffect(() => {
    if (successMessage) {
      toast.success(successMessage, "Ad");
      dispatch(clearAdMessages());
    }
  }, [dispatch, successMessage, toast]);

  useEffect(() => {
    if (error) {
      toast.error(error, "Ad");
      dispatch(clearAdMessages());
    }
  }, [dispatch, error, toast]);

  const filteredAds = useMemo(() => {
    const adsMatchingTableFilters = items.filter((ad: any) =>
      Object.entries(filters).every(([key, value]) => {
        if (!value) {
          return true;
        }

        const normalizedFilter = value.toLowerCase().trim();
        const rawValue =
          key === "locations"
            ? getAdLocationsLabel(ad)
            : String(ad[key as keyof Ad] ?? "");

        return String(rawValue).toLowerCase().includes(normalizedFilter);
      }),
    );

    if (selectedStatFilter === "all") {
      return adsMatchingTableFilters;
    }

    return adsMatchingTableFilters.filter(
      (ad) => normalizeAdStatus(String(ad.status)) === selectedStatFilter,
    );
  }, [filters, items, selectedStatFilter]);

  const totalAdsCount = items.length;
  const liveAdsCount = useMemo(
    () =>
      items.filter((ad) => normalizeAdStatus(String(ad.status)) === "live")
        .length,
    [items],
  );
  const expiredAdsCount = useMemo(
    () =>
      items.filter((ad) => normalizeAdStatus(String(ad.status)) === "expired")
        .length,
    [items],
  );

  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(filteredAds.length / pageSize));
  const paginatedAds = filteredAds.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [selectedStatFilter]);

  const handleStatCardClick = (nextFilter: AdStatFilter) => {
    setSelectedStatFilter((current) => {
      if (nextFilter === "all") {
        return "all";
      }

      return current === nextFilter ? "all" : nextFilter;
    });
  };

  const columns = [
    {
      label: "Content Name",
      key: "contentName",
      filterable: true,
      sortable: true,
    },
    {
      label: "Created By",
      key: "createdBy",
      filterable: true,
      sortable: true,
    },
    {
      label: "Published On",
      key: "publishedOn",
      filterable: true,
      sortable: true,
      render: (row: Ad) => formatDate(row.publishedOn ?? row.createdAt),
    },
    {
      label: "Start Date",
      key: "startDate",
      filterable: true,
      sortable: true,
      render: (row: Ad) => formatDate(row.startDate),
    },
    {
      label: "End Date",
      key: "endDate",
      filterable: true,
      sortable: true,
      render: (row: Ad) => formatDate(row.endDate),
    },
    {
      label: "Locations",
      key: "locations",
      filterable: true,
      sortable: true,
      render: (row: Ad) => getAdLocationsLabel(row),
    },
    {
      label: "Start Time",
      key: "startTime",
      filterable: true,
      sortable: true,
      render: (row: Ad) => formatTime(row.startTime),
    },
    {
      label: "End Time",
      key: "endTime",
      filterable: true,
      sortable: true,
      render: (row: Ad) => formatTime(row.endTime),
    },
    {
      label: "Status",
      key: "status",
      filterable: true,
      render: (row: Ad) => <StatusBadge status={String(row.status)} />,
    },
    {
      label: "Actions",
      key: "actions",
      render: (row: Ad) => (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              navigate("/ads-management/create", {
                state: { ad: row },
              })
            }
            className="inline-flex items-center gap-2 rounded-md border border-[#366FB3] px-3 py-1.5 text-[12px] font-medium text-[#366FB3] transition hover:bg-blue-50"
          >
            <Pencil size={14} />
            Edit
          </button>
          <button
            type="button"
            onClick={() => setAdAction({ ad: row, type: "remove" })}
            className="inline-flex items-center gap-2 rounded-md border border-[#F25F5C] px-3 py-1.5 text-[12px] font-medium text-[#F25F5C] transition hover:bg-rose-50"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Total Ads"
          value={String(totalAdsCount)}
          accent="violet"
          icon={'/Images/AdManagement/Total_Ads.png'}
          isActive={selectedStatFilter === "all"}
          onClick={() => handleStatCardClick("all")}
        />
        <StatCard
          label="Live Ads"
          value={String(liveAdsCount)}
          accent="green"
          icon={'/Images/AdManagement/Live_Ads.png'}
          isActive={selectedStatFilter === "live"}
          onClick={() => handleStatCardClick("live")}
        />
        <StatCard
          label="Expired Ads"
          value={String(expiredAdsCount)}
          accent="red"
          icon={'/Images/AdManagement/Expired_Ads.png'}
          isActive={selectedStatFilter === "expired"}
          onClick={() => handleStatCardClick("expired")}
        />
      </div>

      <div className="shadow-sm">
        <DataTable
          data={paginatedAds}
          columns={columns}
          loading={loading}
          page={page}
          totalPages={totalPages}
          sortState={sortState}
          onPageChange={setPage}
          onFilter={(key, value) => {
            dispatch(setAdFilter({ key, value }));
            setPage(1);
          }}
          onSort={(key) => {
            setSortState((current) => {
              if (current?.key !== key) {
                return { key, direction: "ASC" };
              }

              if (current.direction === "ASC") {
                return { key, direction: "DESC" };
              }

              return null;
            });
            setPage(1);
          }}
        />
      </div>

      {adAction ? (
        <AdConfirmModal
          ad={adAction.ad}
          onClose={() => setAdAction(null)}
          onRemove={async () => {
            const result = await dispatch(
              removeAd({
                id: adAction.ad.contentId,
                userName: user?.profile?.username ?? "Admin",
              }),
            );

            if (removeAd.fulfilled.match(result)) {
              await dispatch(
                fetchAds({
                  page: 0,
                  size: 10,
                  ...(sortState
                    ? {
                        sortCriteria: [
                          {
                            field: sortState.key,
                            direction: sortState.direction,
                          },
                        ],
                      }
                    : {}),
                }),
              );
              setAdAction(null);
            }
          }}
        />
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
  isActive,
  onClick,
}: {
  label: string;
  value: string;
  icon: string;
  accent: "violet" | "green" | "red";
  isActive: boolean;
  onClick: () => void;
}) {
  const accentStyles = {
    violet: {
      card: "border-violet-100",
      tile: "bg-violet-100 text-violet-700",
    },
    green: {
      card: "border-emerald-100",
      tile: "bg-emerald-100 text-emerald-600",
    },
    red: {
      card: "border-rose-100",
      tile: "bg-rose-100 text-rose-500",
    },
  } as const;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={isActive}
      className={`flex items-center justify-between rounded-[8px] border bg-white px-5 py-4 text-left shadow-[rgba(0,0,0,0.05)] transition ${isActive ? "border-[#5E1B7F] ring-2 ring-[#5E1B7F1F]" : accentStyles[accent].card}`}
    >
      <div>
        <p className="text-[16px] font-medium text-[#333333]">{label}</p>
        <p className="mt-2 text-[24px] font-semibold leading-none text-slate-900">
          {value}
        </p>
      </div>
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-xl ${accentStyles[accent].tile}`}
      >
        <img src={icon} alt={label} className="h-12 w-12" />
      </div>
    </button>
  );
}

function AdConfirmModal({
  ad,
  onClose,
  onRemove,
}: {
  ad: Ad;
  onClose: () => void;
  onRemove: () => Promise<void>;
}) {
  return (
    <Modal onClose={onClose} className="max-w-xl">
      <div className="px-8 py-9 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-rose-50">
          <TimerReset size={36} className="text-rose-500" />
        </div>
        <h3 className="mt-6 text-[24px] font-semibold leading-tight text-slate-900">
          Are you sure want to delete this ad?
        </h3>
        <p className="mt-4 text-sm leading-6 text-slate-500">
          Deleting <span className="font-semibold">{ad.contentName}</span> will
          remove it from the ads list and stop future scheduling tied to this
          content.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => void onRemove()}
            className="rounded-xl bg-custom-gradient px-4 py-3 font-semibold text-white transition hover:opacity-95"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-4 py-3 font-semibold text-[#333333] transition hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}
