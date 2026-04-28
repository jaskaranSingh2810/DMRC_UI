import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Eye, EyeOff } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import UserAccessCard from "./components/UserAccessCard";
import UserSuccessModal from "./components/UserSuccessModal";
import { useToast } from "@/hooks/useToast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  clearCurrentUser,
  createUser,
  fetchUserById,
  updateUser,
} from "@/store/slices/userSlice";
import {
  userLocationOptions,
  userModuleOptions,
} from "./userManagementData";
import type { ManagedUserRecord, UserAccessAssignment } from "@/types";

interface UserFormPageProps {
  mode: "create" | "edit";
}

interface UserFormState {
  empId: string;
  employeeName: string;
  emailId: string;
  mobileNumber: string;
  password: string;
  accessAssignments: UserAccessAssignment[];
}

function buildAssignments(user?: ManagedUserRecord | null): UserAccessAssignment[] {
  return userModuleOptions.map((moduleOption) => {
    const existingAssignment = user?.accessAssignments?.find(
      (assignment) => assignment.moduleId === moduleOption.id,
    );

    return (
      existingAssignment ?? {
        moduleId: moduleOption.id,
        moduleName: moduleOption.name,
        locationIds: [],
        locationNames: [],
      }
    );
  });
}

function getInitialFormState(user?: ManagedUserRecord | null): UserFormState {
  return {
    empId: user?.empId ?? "",
    employeeName: user?.employeeName ?? "",
    emailId: user?.emailId ?? "",
    mobileNumber: user?.mobileNumber ?? "",
    password: user?.password ?? "",
    accessAssignments: buildAssignments(user),
  };
}

export default function UserFormPage({ mode }: UserFormPageProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const toast = useToast();
  const { userId } = useParams();
  const { currentUser, loading } = useAppSelector((state) => state.users);
  const { user: authUser } = useAppSelector((state) => state.auth);
  const [formState, setFormState] = useState<UserFormState>(getInitialFormState());
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof UserFormState, string>>>(
    {},
  );
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [hasRequestedUser, setHasRequestedUser] = useState(false);

  useEffect(() => {
    if (mode === "edit" && userId) {
      setHasRequestedUser(true);
      void dispatch(fetchUserById({ id: userId }));
    }

    return () => {
      dispatch(clearCurrentUser());
    };
  }, [dispatch, mode, userId]);

  useEffect(() => {
    if (
      mode === "edit" &&
      userId &&
      hasRequestedUser &&
      !loading &&
      currentUser === null
    ) {
      toast.error("Unable to load user.", "User");
      navigate("/user-management");
    }
  }, [currentUser, hasRequestedUser, loading, mode, navigate, toast, userId]);

  useEffect(() => {
    if (mode === "edit" && currentUser) {
      setFormState(getInitialFormState(currentUser));
    }
  }, [currentUser, mode]);

  const pageTitle = mode === "create" ? "Add New User" : "Edit User Details";
  const submitLabel = mode === "create" ? "Add User" : "Update";

  const activeAssignments = useMemo(
    () =>
      formState.accessAssignments.filter(
        (assignment) => assignment.locationIds.length > 0,
      ),
    [formState.accessAssignments],
  );

  const handleAssignmentChange = (nextAssignment: UserAccessAssignment) => {
    setFormState((current) => ({
      ...current,
      accessAssignments: current.accessAssignments.map((assignment) =>
        assignment.moduleId === nextAssignment.moduleId ? nextAssignment : assignment,
      ),
    }));
  };

  const validate = () => {
    const nextErrors: Partial<Record<keyof UserFormState, string>> = {};

    if (!formState.empId.trim()) {
      nextErrors.empId = "Employee ID is required.";
    }

    if (!formState.employeeName.trim()) {
      nextErrors.employeeName = "User name is required.";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.emailId.trim())) {
      nextErrors.emailId = "Enter a valid email address.";
    }

    if (!/^\d{10,15}$/.test(formState.mobileNumber.trim())) {
      nextErrors.mobileNumber = "Enter a valid mobile number.";
    }

    if (!formState.password.trim()) {
      nextErrors.password = "Password is required.";
    }

    if (!activeAssignments.length) {
      nextErrors.accessAssignments = "Select at least one module and location.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    const payload = {
      ...formState,
      accessAssignments: activeAssignments,
      userName: authUser?.profile?.username ?? "Admin",
    };

    if (mode === "create") {
      const result = await dispatch(createUser(payload));

      if (createUser.fulfilled.match(result)) {
        setShowSuccessModal(true);
      }

      return;
    }

    if (!userId) {
      return;
    }

    const result = await dispatch(
      updateUser({
        id: userId,
        ...payload,
      }),
    );

    if (updateUser.fulfilled.match(result)) {
      navigate("/user-management");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-[16px] text-[#667085]">
          <span>User Management</span>
          <ChevronRight size={16} />
          <span className="font-semibold text-[#101828]">{pageTitle}</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/user-management")}
            className="rounded-[8px] border border-[#D0D5DD] px-4 py-2 text-[14px] font-semibold text-[#344054]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            className="rounded-[8px] bg-custom-gradient px-4 py-2 text-[14px] font-semibold text-white"
          >
            {submitLabel}
          </button>
        </div>
      </div>

      <section className="rounded-[14px] border border-[#EAECF0] bg-white p-5 shadow-sm">
        <h2 className="text-[22px] font-semibold text-[#101828]">User Details</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <FormField
            label="Employee ID*"
            value={formState.empId}
            error={errors.empId}
            onChange={(value) =>
              setFormState((current) => ({ ...current, empId: value }))
            }
          />
          <FormField
            label="User Name*"
            value={formState.employeeName}
            error={errors.employeeName}
            onChange={(value) =>
              setFormState((current) => ({ ...current, employeeName: value }))
            }
          />
          <FormField
            label="Email ID*"
            value={formState.emailId}
            error={errors.emailId}
            onChange={(value) =>
              setFormState((current) => ({ ...current, emailId: value }))
            }
          />
          <FormField
            label="Mobile Number*"
            value={formState.mobileNumber}
            error={errors.mobileNumber}
            onChange={(value) =>
              setFormState((current) => ({ ...current, mobileNumber: value }))
            }
          />
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-medium text-[#344054]">
              Password*
            </span>
            <div className="flex items-center rounded-[10px] border border-[#D0D5DD] px-3">
              <input
                type={showPassword ? "text" : "password"}
                value={formState.password}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                className="w-full py-2.5 text-[14px] outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="text-[#667085]"
              >
                {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
            </div>
            {errors.password ? (
              <p className="mt-1 text-[12px] text-[#D92D20]">{errors.password}</p>
            ) : null}
          </label>
        </div>
      </section>

      <section className="rounded-[14px] border border-[#EAECF0] bg-white p-5 shadow-sm">
        <h2 className="text-[22px] font-semibold text-[#101828]">
          Access & Permissions
        </h2>
        <p className="mt-1 text-[12px] text-[#667085]">
          Assign modules for each location. Access is restricted to selected
          combinations.
        </p>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {formState.accessAssignments.map((assignment) => (
            <UserAccessCard
              key={assignment.moduleId}
              assignment={assignment}
              locations={userLocationOptions}
              onChange={handleAssignmentChange}
            />
          ))}
        </div>

        {errors.accessAssignments ? (
          <p className="mt-3 text-[12px] text-[#D92D20]">
            {errors.accessAssignments}
          </p>
        ) : null}
      </section>

      {showSuccessModal ? (
        <UserSuccessModal
          title="User Added Successfully"
          description="The user has been created and granted access to the selected locations and modules."
          onClose={() => {
            setShowSuccessModal(false);
            navigate("/user-management");
          }}
        />
      ) : null}
    </div>
  );
}

function FormField({
  label,
  value,
  error,
  onChange,
}: {
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium text-[#344054]">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-[10px] border border-[#D0D5DD] px-3 py-2.5 text-[14px] outline-none"
      />
      {error ? <p className="mt-1 text-[12px] text-[#D92D20]">{error}</p> : null}
    </label>
  );
}
