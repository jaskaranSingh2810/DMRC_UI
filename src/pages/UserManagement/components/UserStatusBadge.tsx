export default function UserStatusBadge({ status }: { status: string }) {
  const normalizedStatus = status.toLowerCase();
  const styles =
    normalizedStatus === "active"
      ? "bg-[#3EAF3F1A] text-[#3EAF3F]"
      : "bg-[#EFF1F4] text-[#667085]";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-[12px] font-semibold ${styles}`}
    >
      {normalizedStatus === "active"
        ? "Active"
        : normalizedStatus === "inactive"
          ? "Inactive"
          : status}
    </span>
  );
}
