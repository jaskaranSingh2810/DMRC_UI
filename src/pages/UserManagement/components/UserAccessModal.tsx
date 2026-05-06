import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import UserAccessCard from "./UserAccessCard";
import type {
  ManagedUserRecord,
  UserAccessAssignment,
  UserModuleOption,
  UserLocationOption,
} from "@/types";

interface UserAccessModalProps {
  user: ManagedUserRecord;
  locations: UserLocationOption[];
  modules: UserModuleOption[];
  onClose: () => void;
  onSubmit: (accessAssignments: UserAccessAssignment[]) => Promise<void>;
}

export default function UserAccessModal({
  user,
  locations,
  modules,
  onClose,
  onSubmit,
}: UserAccessModalProps) {
  const buildAssignments = (): UserAccessAssignment[] =>
    modules.map((moduleOption) => {
      const existingAssignment = user.accessAssignments.find(
        (assignment) => assignment.moduleId === moduleOption.id,
      );

      return (
        existingAssignment ?? {
          moduleId: moduleOption.id,
          moduleName: moduleOption.name,
          enabled: false,
          locationIds: [],
        }
      );
    });

  const [assignments, setAssignments] = useState<UserAccessAssignment[]>(
    buildAssignments(),
  );
  const [error, setError] = useState("");

  useEffect(() => {
    setAssignments(buildAssignments());
  }, [user]);

  const handleAssignmentChange = (nextAssignment: UserAccessAssignment) => {
    setAssignments((current) =>
      current.map((assignment) =>
        assignment.moduleId === nextAssignment.moduleId
          ? nextAssignment
          : assignment,
      ),
    );
  };

  const handleSubmit = async () => {
    const validAssignments = assignments.filter(
      (assignment) => assignment.enabled && assignment.locationIds.length > 0,
    );

    if (!validAssignments.length) {
      setError("Select at least one location for one module.");
      return;
    }

    setError("");
    await onSubmit(validAssignments);
  };

  return (
    <Modal onClose={onClose} className="max-w-[560px] rounded-[20px]">
      <div className="px-5 py-5">
        <h3 className="text-[24px] font-semibold text-[#101828]">
          Edit Access & Permissions
        </h3>
        <p className="mt-1 text-[12px] text-[#667085]">
          Assign modules for each location. Access is restricted to selected
          combinations.
        </p>

        <div className="mt-4 space-y-3">
          {assignments.map((assignment) => (
            <UserAccessCard
              key={assignment.moduleId}
              assignment={assignment}
              locations={locations}
              onChange={handleAssignmentChange}
            />
          ))}
        </div>

        {error ? <p className="mt-3 text-[12px] text-[#D92D20]">{error}</p> : null}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[10px] border border-[#D0D5DD] px-4 py-3 text-[14px] font-semibold text-[#344054]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            className="rounded-[10px] bg-custom-gradient px-4 py-3 text-[14px] font-semibold text-white"
          >
            Update
          </button>
        </div>
      </div>
    </Modal>
  );
}
