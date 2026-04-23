import { ArrowUpDown, Funnel, ListFilter, Search, X } from "lucide-react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { createPortal } from "react-dom";
import type { DataTableProps } from "./types";
import TablePagination from "./TablePagination";
import { useRef, useState, useEffect } from "react";

function getValue(obj: any, path: string) {
  return path.split(".").reduce((acc, key) => acc?.[key], obj);
}

export default function DataTable<T>({
  data = [],
  columns,
  loading = false,
  page = 1,
  totalPages = 1,
  sortState = null,
  onPageChange,
  onFilter,
  onSort,
}: DataTableProps<T>) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const filterRef = useRef<HTMLDivElement | null>(null);
  const filterButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [openFilterKey, setOpenFilterKey] = useState<string | null>(null);
  const [filterDrafts, setFilterDrafts] = useState<Record<string, string>>({});
  const [filterPosition, setFilterPosition] = useState({ top: 0, left: 0 });

  const updateFilterPosition = (key: string, target?: HTMLElement | null) => {
    const anchor = target ?? filterButtonRefs.current[key];

    if (!anchor) {
      return;
    }

    const rect = anchor.getBoundingClientRect();
    const popoverWidth = 256;
    const viewportPadding = 16;
    const left = Math.min(
      Math.max(window.scrollX + viewportPadding, rect.right + window.scrollX - popoverWidth),
      window.scrollX + window.innerWidth - popoverWidth - viewportPadding,
    );

    setFilterPosition({
      top: rect.bottom + window.scrollY + 12,
      left,
    });
  };

  // 🟢 Start dragging
  const handleMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!scrollRef.current) return;

    const target = e.target as HTMLElement;

    if (["INPUT", "BUTTON", "SVG", "PATH"].includes(target.tagName)) return;

    if (scrollRef.current.scrollWidth <= scrollRef.current.clientWidth) return;

    setIsDragging(true);
    setStartX(e.clientX);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!scrollRef.current) return;

      const dx = e.clientX - startX;
      scrollRef.current.scrollLeft = scrollLeft - dx * 1.5;
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, startX, scrollLeft]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        filterRef.current &&
        !filterRef.current.contains(event.target as Node)
      ) {
        setOpenFilterKey(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!openFilterKey) {
      return;
    }

    updateFilterPosition(openFilterKey);

    const handleViewportChange = () => updateFilterPosition(openFilterKey);

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [openFilterKey]);

  return (
    <div className="w-full">
      <div className="relative overflow-visible rounded-[8px] border border-slate-200 bg-white shadow-sm">
        <div
          ref={scrollRef}
          onMouseDown={handleMouseDown}
          className={`w-full overflow-x-auto scroll-smooth rounded-[8px] touch-pan-x
            ${isDragging ? "cursor-grabbing select-none" : "cursor-grab"}`}
        >
          <div className="min-w-[900px]">
            <table className="w-full text-xs sm:text-sm ">
              <thead className="sticky top-0 z-20 text-[#333333] shadow-sm">
                <tr>
                  {columns.map((col) => (
                    <th
                      key={String(col.key)}
                      className="border-r bg-[#E7E5F0] border-[#CDD4DA] px-3 py-3 text-left last:border-r-0 sm:px-4 sm:py-4"
                    >
                      <div className="relative flex min-w-[100px] items-center justify-between gap-2 sm:min-w-[150px]">
                        <span className="text-xs font-semibold capitalize tracking-[0.16em] text-[#333333]">
                          {col.label}
                        </span>

                        <div className="flex items-center gap-1">
                          {col.sortable ? (
                            <button
                              type="button"
                              onClick={() => onSort?.(String(col.key))}
                              className={`rounded-full p-2 transition ${
                                sortState?.key === String(col.key)
                                  ? "bg-blue-100 text-[#4e146a]"
                                  : "text-[#5E1B7F] hover:bg-slate-100 hover:text-slate-700"
                              }`}
                              aria-label={`Sort ${col.label}`}
                            >
                              <ListFilter size={14} />
                            </button>
                          ) : null}

                          {col.filterable ? (
                            <div>
                              <button
                                type="button"
                                ref={(node) => {
                                  filterButtonRefs.current[String(col.key)] = node;
                                }}
                                onClick={(event) => {
                                  const key = String(col.key);
                                  setOpenFilterKey((current) => {
                                    if (current === key) {
                                      return null;
                                    }

                                    updateFilterPosition(key, event.currentTarget);
                                    return key;
                                  });
                                }}
                                className={`rounded-full p-2 transition ${
                                  filterDrafts[String(col.key)]
                                    ? "bg-blue-100 text-[#5E1B7F]"
                                    : "text-[#5E1B7F] hover:bg-slate-100 hover:text-slate-700"
                                }`}
                                aria-label={`Filter ${col.label}`}
                              >
                                <Funnel size={14} />
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="py-10 text-center text-gray-500"
                    >
                      Loading...
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="py-10 text-center text-gray-400"
                    >
                      No data available
                    </td>
                  </tr>
                ) : (
                  data.map((row, rowIndex) => (
                    <tr
                      key={rowIndex}
                      className="border-t border-slate-200 transition hover:bg-slate-50/70"
                    >
                      {columns.map((col) => (
                        <td
                          key={String(col.key)}
                          className="whitespace-nowrap border-r border-slate-200 px-3 py-3 text-[12px] font-[400] text-slate-700 last:border-r-0 sm:px-4 sm:py-4"
                        >
                          {col.render
                            ? col.render(row)
                            : (getValue(row, String(col.key)) ?? "-")}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="mt-3">
        <TablePagination
          page={page}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      </div>

      {openFilterKey
        ? createPortal(
            <div
              ref={filterRef}
              style={{
                position: "absolute",
                top: filterPosition.top,
                left: filterPosition.left,
              }}
              className="z-[9999] w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_18px_40px_rgba(15,23,42,0.14)]"
            >
              <div className="relative">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={filterDrafts[openFilterKey] ?? ""}
                  placeholder={`Filter ${
                    columns.find((col) => String(col.key) === openFilterKey)?.label ??
                    ""
                  }`}
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-9 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setFilterDrafts((previous) => ({
                      ...previous,
                      [openFilterKey]: nextValue,
                    }));
                    onFilter?.(openFilterKey, nextValue);
                  }}
                />
                {filterDrafts[openFilterKey] ? (
                  <button
                    type="button"
                    onClick={() => {
                      setFilterDrafts((previous) => ({
                        ...previous,
                        [openFilterKey]: "",
                      }));
                      onFilter?.(openFilterKey, "");
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    aria-label={`Clear ${
                      columns.find((col) => String(col.key) === openFilterKey)?.label ??
                      "column"
                    } filter`}
                  >
                    <X size={14} />
                  </button>
                ) : null}
              </div>
              {/* <button
                type="button"
                onClick={() => {
                  setFilterDrafts((previous) => ({
                    ...previous,
                    [openFilterKey]: "",
                  }));
                  onFilter?.(openFilterKey, "");
                  setOpenFilterKey(null);
                }}
                className="mt-3 text-sm font-semibold text-slate-500 hover:text-slate-900"
              >
                Clear
              </button> */}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
