import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  BellRing,
  MoreVertical,
  Pencil,
  Radio,
  TimerReset,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import DataTable from "@/components/Table/DataTable";
import type { SortState } from "@/components/Table/types";
import InfoTooltip from "@/components/ui/InfoTooltip";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/hooks/useToast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  clearNoticeMessages,
  fetchNotices,
  fetchNoticeStats,
  removeNotice,
  setNoticeFilter,
  setNoticeStatusFilter,
} from "@/store/slices/noticeSlice";
import type { Notice, NoticeStatusFilter } from "@/types";
import {
  formatNoticeDate,
  formatNoticeTime,
  getNoticeLocationsLabel,
  getNoticeStatusCategory,
} from "./noticeManagementHelpers";

type NoticeActionState =
  | {
      notice: Notice;
      type: "remove";
    }
  | null;

function getNoticeName(notice: Notice): string {
  return notice.announcementName ?? notice.title ?? "-";
}

function StatusBadge({ status }: { status: string }) {
  const normalizedStatus = String(status).toLowerCase();
  const theme =
    normalizedStatus === "live" || normalizedStatus === "active"
      ? "bg-emerald-50 text-emerald-600"
      : normalizedStatus === "expired"
        ? "bg-rose-50 text-rose-500"
        : normalizedStatus === "scheduled"
          ? "bg-amber-50 text-amber-600"
          : "bg-slate-100 text-slate-600";

  const label =
    normalizedStatus === "active"
      ? "Live"
      : normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1);

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-[12px] font-semibold ${theme}`}>
      {label}
    </span>
  );
}

export default function NoticeManagement() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAppSelector((state) => state.auth);
  const {
    items,
    loading,
    error,
    successMessage,
    filters,
    listLoaded,
    currentPage,
    totalPages,
    totalElements,
    stats,
    selectedStatusFilter,
  } = useAppSelector((state) => state.notices);

  const [page, setPage] = useState(1);
  const [sortState, setSortState] = useState<SortState | null>(null);
  const [noticeAction, setNoticeAction] = useState<NoticeActionState>(null);

  useEffect(() => {
    void dispatch(fetchNoticeStats());
  }, [dispatch]);

  useEffect(() => {
    void dispatch(
      fetchNotices({
        page: page - 1,
        size: 10,
        filters,
        statusFilter: selectedStatusFilter,
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
  }, [dispatch, filters, page, selectedStatusFilter, sortState]);

  useEffect(() => {
    if (!listLoaded) {
      return;
    }

    setPage(currentPage);
  }, [currentPage, listLoaded]);

  useEffect(() => {
    if (successMessage) {
      toast.success(successMessage, "Notice");
      dispatch(clearNoticeMessages());
      void dispatch(fetchNoticeStats());
    }
  }, [dispatch, successMessage, toast]);

  useEffect(() => {
    if (error) {
      toast.error(error, "Notice");
      dispatch(clearNoticeMessages());
    }
  }, [dispatch, error, toast]);

  const columns = useMemo(
    () => [
      {
        label: "Announcement Name",
        key: "announcementName",
        filterable: true,
        sortable: true,
        render: (row: Notice) => getNoticeName(row),
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
        render: (row: Notice) => formatNoticeDate(row.publishedOn ?? row.createdAt),
      },
      {
        label: "Start Date",
        key: "startDate",
        filterable: true,
        sortable: true,
        render: (row: Notice) => formatNoticeDate(row.startDate),
      },
      {
        label: "End Date",
        key: "endDate",
        filterable: true,
        sortable: true,
        render: (row: Notice) => formatNoticeDate(row.endDate),
      },
      {
        label: "Locations",
        key: "locations",
        filterable: true,
        sortable: true,
        render: (row: Notice) => getNoticeLocationsLabel(row),
      },
      {
        label: "Start Time",
        key: "startTime",
        filterable: true,
        sortable: true,
        render: (row: Notice) => formatNoticeTime(row.startTime),
      },
      {
        label: "End Time",
        key: "endTime",
        filterable: true,
        sortable: true,
        render: (row: Notice) => formatNoticeTime(row.endTime),
      },
      {
        label: "Status",
        key: "status",
        filterable: true,
        sortable: true,
        render: (row: Notice) => <StatusBadge status={String(row.status)} />,
      },
      {
        label: "Actions",
        key: "actions",
        render: (row: Notice) => (
          <NoticeActions
            onEdit={() =>
              navigate(`/notice-management/${row.noticeId}/edit`, {
                state: { notice: row },
              })
            }
            onDelete={() => setNoticeAction({ notice: row, type: "remove" })}
          />
        ),
      },
    ],
    [navigate],
  );

  const handleStatCardClick = (nextFilter: NoticeStatusFilter) => {
    dispatch(
      setNoticeStatusFilter(
        nextFilter === selectedStatusFilter && nextFilter !== "all"
          ? "all"
          : nextFilter,
      ),
    );
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Total Announcements"
          value={String(stats.total || totalElements)}
          icon="/Images/NoticeManagement/Total_Announcement.png"
          accent="violet"
          isActive={selectedStatusFilter === "all"}
          onClick={() => handleStatCardClick("all")}
          description="Total number of notices across all schedules and statuses."
        />
        <StatCard
          label="Live Announcements"
          value={String(stats.live)}
          icon="/Images/NoticeManagement/Live_Announcement.png"
          accent="green"
          isActive={selectedStatusFilter === "live"}
          onClick={() => handleStatCardClick("live")}
          description="Notices that are currently visible on devices."
        />
        <StatCard
          label="Expired Announcements"
          value={String(stats.expired)}
          icon="/Images/NoticeManagement/Expired_Announcement.png"
          accent="red"
          isActive={selectedStatusFilter === "expired"}
          onClick={() => handleStatCardClick("expired")}
          description="Notices whose end date or time has passed."
        />
      </div>

      <div className="shadow-sm">
        <DataTable
          data={items}
          columns={columns}
          loading={loading}
          page={page}
          totalPages={totalPages}
          sortState={sortState}
          onPageChange={setPage}
          onFilter={(key, value) => {
            dispatch(setNoticeFilter({ key, value }));
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

      {noticeAction?.type === "remove" ? (
        <NoticeDeleteModal
          notice={noticeAction.notice}
          onClose={() => setNoticeAction(null)}
          onRemove={async () => {
            const result = await dispatch(
              removeNotice({
                id: noticeAction.notice.noticeId,
                userName:
                  user?.profile?.fullName ??
                  user?.profile?.username ??
                  "Admin",
              }),
            );

            if (removeNotice.fulfilled.match(result)) {
              await Promise.all([
                dispatch(
                  fetchNotices({
                    page: page - 1,
                    size: 10,
                    filters,
                    statusFilter: selectedStatusFilter,
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
                ),
                dispatch(fetchNoticeStats()),
              ]);

              setNoticeAction(null);
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
  description,
}: {
  label: string;
  value: string;
  icon: string;
  accent: "violet" | "green" | "red";
  isActive: boolean;
  onClick: () => void;
  description?: string;
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
        <div className="flex items-center gap-1">
          <p className="text-[16px] font-medium text-[#333333]">{label}</p>
          {description ? <InfoTooltip description={description} /> : null}
        </div>
        <p className="mt-2 text-[24px] font-semibold leading-none text-slate-900">
          {value}
        </p>
      </div>
      <img src={icon} alt={label} className="h-12 w-12" />
    </button>
  );
}

function NoticeActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [menuWidth, setMenuWidth] = useState(132);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleClickOutside = () => setOpen(false);
    document.addEventListener("click", handleClickOutside);

    return () => document.removeEventListener("click", handleClickOutside);
  }, [open]);

  const updatePosition = (target: HTMLElement) => {
    const rect = target.getBoundingClientRect();
    const viewportPadding = 16;
    const left = Math.min(
      Math.max(window.scrollX + viewportPadding, rect.right + window.scrollX - menuWidth),
      window.scrollX + window.innerWidth - menuWidth - viewportPadding,
    );

    setPosition({
      top: rect.bottom + window.scrollY + 6,
      left,
    });
  };

  return (
    <div className="relative flex justify-end">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          updatePosition(event.currentTarget);
          setOpen((current) => !current);
        }}
        className="rounded-full p-2 text-[#154489] transition hover:bg-slate-100"
        aria-label="Notice actions"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open
        ? createPortal(
            <div
              style={{
                position: "absolute",
                top: position.top,
                left: position.left,
              }}
              className="z-[9999] min-w-[132px] rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg"
              onClick={(event) => event.stopPropagation()}
              ref={(node) => {
                if (node) {
                  setMenuWidth(node.offsetWidth);
                }
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onEdit();
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[#333333] transition hover:bg-rose-50"
              >
                {/* <Pencil className="h-4 w-4 text-[#154489]" /> */}
                Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onDelete();
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[#333333] transition hover:bg-rose-50"
              >
                {/* <Trash2 className="h-4 w-4" /> */}
                Delete
              </button>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function NoticeDeleteModal({
  notice,
  onClose,
  onRemove,
}: {
  notice: Notice;
  onClose: () => void;
  onRemove: () => Promise<void>;
}) {
  return (
    <Modal onClose={onClose} className="max-w-md">
      <div className="px-8 py-8 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-rose-50">
          <Trash2 className="h-9 w-9 text-rose-500" />
        </div>
        <h3 className="mt-6 text-[24px] font-semibold leading-tight text-slate-900">
          Are you sure want to Delete this announcement?
        </h3>
        <p className="mt-4 text-sm leading-6 text-slate-500">
          This announcement is scheduled to go live. Deleting{" "}
          <span className="font-semibold">{getNoticeName(notice)}</span> will
          permanently remove it from the schedule.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => void onRemove()}
            className="rounded-xl bg-[#C52A2A] px-4 py-3 font-semibold text-white transition hover:opacity-95"
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