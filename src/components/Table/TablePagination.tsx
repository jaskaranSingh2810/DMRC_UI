import { ChevronLeft, ChevronRight } from "lucide-react";

function getVisiblePages(page: number, totalPages: number): Array<number | "..."> {
  if (totalPages <= 6) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (page <= 3) {
    return [1, 2, 3, "...", totalPages];
  }

  if (page >= totalPages - 2) {
    return [1, "...", totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, page, page + 1, "...", totalPages];
}

export default function TablePagination({
  page = 1,
  totalPages = 1,
  onPageChange,
}: {
  page?: number;
  totalPages?: number;
  onPageChange?: (p: number) => void;
}) {
  const currentPage = Math.max(1, Number(page) || 1);
  const normalizedTotalPages = Math.max(1, Number(totalPages) || 1);
  const visiblePages = getVisiblePages(currentPage, normalizedTotalPages);

  return (
    <div className="flex items-center justify-end gap-4 p-3 bg-white w-fit ml-auto rounded-[8px]">
      <button
        type="button"
        disabled={currentPage === 1}
        onClick={() => onPageChange?.(currentPage - 1)}
        className="flex h-8 w-8 items-center justify-center rounded-[2px] border border-[#5E1B7F] text-[#5E1B7F] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-[#E6E6E6] disabled:border-[#E6E6E6]"
        aria-label="Previous page"
      >
        <ChevronLeft size={24} strokeWidth={2.2} />
      </button>

      <div className="flex items-center gap-5">
        {visiblePages.map((item, index) => {
          if (item === "...") {
            return (
            <span
              key={`ellipsis-${index}`}
              className="text-[18px] font-medium text-[#333333]"
            >
              ...
            </span>
            );
          }

          const isActive = Number(item) === currentPage;

          return (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange?.(item)}
              className={`flex h-8 min-w-8 items-center justify-center rounded-[2px] px-3 text-[16px] font-700 transition`}
              aria-current={isActive ? "page" : undefined}
              style={{
                backgroundColor: isActive ? "#6D2C91" : "transparent",
                color: isActive ? "white" : "#333333",
              }}
            >
              {item}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        disabled={currentPage === normalizedTotalPages}
        onClick={() => onPageChange?.(currentPage + 1)}
        className="flex h-8 w-8 items-center justify-center rounded-[2px] border border-[#5E1B7F] text-[#5E1B7F] transition hover:bg-[#F8F1FD] disabled:cursor-not-allowed disabled:border-[#E6E6E6] disabled:text-[#E6E6E6]"
        aria-label="Next page"
      >
        <ChevronRight size={24} strokeWidth={2.2} />
      </button>
    </div>
  );
}
