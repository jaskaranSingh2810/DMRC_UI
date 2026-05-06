import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Eye, EyeOff } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import UserAccessCard from "./components/UserAccessCard";
import UserSuccessModal from "./components/UserSuccessModal";
import { useToast } from "@/hooks/useToast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchLocations } from "@/store/slices/locationSlice";
import {
  clearUserMessages,
  clearCurrentUser,
  createUser,
  fetchUserById,
  fetchUserModules,
  fetchUserRoles,
  updateUser,
} from "@/store/slices/usersSlice";
import type {
  ManagedUserRecord,
  UserAccessAssignment,
  UserLocationOption,
} from "@/types/user";

interface UserFormPageProps {
  mode: "create" | "edit";
}

interface UserFormState {
  empId: string;
  employeeName: string;
  emailId: string;
  mobileNumber: string;
  password: string;
  confirmPassword: string;
  roleId: string;
  accessAssignments: UserAccessAssignment[];
}

function buildAssignments(
  moduleOptions: Array<{ id: number; name: string }>,
  user?: ManagedUserRecord | null,
  defaultLocationIds: number[] = [],
  enabledByDefault = false,
): UserAccessAssignment[] {
  return moduleOptions.map((moduleOption) => {
    const existingAssignment = user?.accessAssignments.find(
      (assignment) => assignment.moduleId === moduleOption.id,
    );

    return (
      existingAssignment ?? {
        moduleId: moduleOption.id,
        moduleName: moduleOption.name,
        enabled: enabledByDefault,
        locationIds: enabledByDefault ? defaultLocationIds : [],
      }
    );
  });
}

function mergeAssignments(
  currentAssignments: UserAccessAssignment[],
  moduleOptions: Array<{ id: number; name: string }>,
  defaultLocationIds: number[] = [],
  enabledByDefault = false,
): UserAccessAssignment[] {
  return moduleOptions.map((moduleOption) => {
    const existingAssignment = currentAssignments.find(
      (assignment) => assignment.moduleId === moduleOption.id,
    );

    return (
      existingAssignment ?? {
        moduleId: moduleOption.id,
        moduleName: moduleOption.name,
        enabled: enabledByDefault,
        locationIds: enabledByDefault ? defaultLocationIds : [],
      }
    );
  });
}

function getInitialFormState(
  moduleOptions: Array<{ id: number; name: string }>,
  user?: ManagedUserRecord | null,
  defaultLocationIds: number[] = [],
): UserFormState {
  return {
    empId: user?.empId ?? "",
    employeeName: user?.employeeName ?? "",
    emailId: user?.emailId ?? "",
    mobileNumber: user?.mobileNumber ?? "",
    password: "",
    confirmPassword: "",
    roleId: user?.role?.id ? String(user.role.id) : "",
    accessAssignments: buildAssignments(
      moduleOptions,
      user,
      defaultLocationIds,
      !user,
    ),
  };
}

export default function UserFormPage({ mode }: UserFormPageProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const toast = useToast();
  const { userId } = useParams();
  const {
    currentUser,
    loading,
    availableModules,
    availableRoles,
    rolesLoading,
  } = useAppSelector((state) => state.users);
  const { items: locationList, listLoaded: locationListLoaded } =
    useAppSelector((state) => state.locations);
  const hasInitializedCreateAssignments = useRef(false);
  const defaultLocationIds = useMemo(
    () => locationList.map((location) => Number(location.locationId)),
    [locationList],
  );
  const [formState, setFormState] = useState<UserFormState>(() =>
    getInitialFormState(availableModules, undefined, defaultLocationIds),
  );
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<
    Partial<Record<keyof UserFormState, string>>
  >({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [hasRequestedUser, setHasRequestedUser] = useState(false);

  useEffect(() => {
    if (availableModules.length === 0) {
      void dispatch(fetchUserModules());
    }

    if (availableRoles.length === 0) {
      void dispatch(fetchUserRoles());
    }

    if (!locationListLoaded) {
      void dispatch(fetchLocations());
    }
  }, [
    availableModules.length,
    availableRoles.length,
    dispatch,
    locationListLoaded,
  ]);

  useEffect(() => {
    if (mode === "create") {
      hasInitializedCreateAssignments.current = false;
    }
  }, [
    mode,
  ]);

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
    if (
      mode !== "create" ||
      hasInitializedCreateAssignments.current ||
      availableModules.length === 0 ||
      defaultLocationIds.length === 0
    ) {
      return;
    }

    setFormState((current) => ({
      ...current,
      accessAssignments: mergeAssignments(
        current.accessAssignments,
        availableModules,
        defaultLocationIds,
        true,
      ),
    }));
    hasInitializedCreateAssignments.current = true;
  }, [availableModules, defaultLocationIds, mode]);

  useEffect(() => {
    if (mode === "edit" && currentUser) {
      setFormState(getInitialFormState(availableModules, currentUser));
    }
  }, [availableModules, currentUser, mode]);

  const pageTitle = mode === "create" ? "Add New User" : "Edit User Details";
  const submitLabel = mode === "create" ? "Add User" : "Update User";

  const locationOptions = useMemo<UserLocationOption[]>(
    () =>
      locationList.map((location) => ({
        id: Number(location.locationId),
        name: location.locationName,
      })),
    [locationList],
  );

  const activeAssignments = useMemo(
    () =>
      formState.accessAssignments.filter(
        (assignment) => assignment.enabled && assignment.locationIds.length > 0,
      ),
    [formState.accessAssignments],
  );

  const handleAssignmentChange = (nextAssignment: UserAccessAssignment) => {
    setFormState((current) => ({
      ...current,
      accessAssignments: current.accessAssignments.map((assignment) =>
        assignment.moduleId === nextAssignment.moduleId
          ? nextAssignment
          : assignment,
      ),
    }));
  };

  const validate = () => {
    const nextErrors: Partial<Record<keyof UserFormState, string>> = {};

    if (!formState.empId.trim()) {
      nextErrors.empId = "Employee ID is required.";
    }

    if (!formState.employeeName.trim()) {
      nextErrors.employeeName = "Name is required.";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.emailId.trim())) {
      nextErrors.emailId = "Enter a valid email address.";
    }

    if (!/^\d{10,15}$/.test(formState.mobileNumber.trim())) {
      nextErrors.mobileNumber = "Enter a valid mobile number.";
    }

    if (!formState.roleId.trim()) {
      nextErrors.roleId = "Select a role.";
    }

    if (mode === "create" && !formState.password.trim()) {
      nextErrors.password = "Password is required.";
    }

    if (mode === "create" && formState.password !== formState.confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match.";
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
      empId: formState.empId,
      employeeName: formState.employeeName,
      emailId: formState.emailId,
      mobileNumber: formState.mobileNumber,
      password: formState.password,
      roleId: Number(formState.roleId),
      roleName: availableRoles?.find((role) => String(role.roleId) === formState.roleId)?.roleName,
      accessAssignments: activeAssignments,
    };

    if (mode === "create") {
      const result = await dispatch(createUser(payload));

      if (createUser.fulfilled.match(result)) {
        toast.success("User created successfully.", "User");
        dispatch(clearUserMessages());
        setShowSuccessModal(true);
      } else if (createUser.rejected.match(result)) {
        toast.error(result.payload ?? "Unable to create user.", "User");
        dispatch(clearUserMessages());
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
      toast.success("User updated successfully.", "User");
      dispatch(clearUserMessages());
      navigate("/user-management");
    } else if (updateUser.rejected.match(result)) {
      toast.error(result.payload ?? "Unable to update user.", "User");
      dispatch(clearUserMessages());
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-[24px] text-[#333333]">
          <span className="font-[400] text-[#333333]">User Management</span>
          <ChevronRight size={24} />
          <span className="font-semibold text-[#333333]">{pageTitle}</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
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
            disabled={loading}
            className="rounded-[8px] bg-custom-gradient px-4 py-2 text-[14px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Saving..." : submitLabel}
          </button>
        </div>
      </div>

      <section className="rounded-[24px] border border-[#D1D5DC] bg-white p-5 shadow-[0px 0px 1px 0px rgba(0, 0, 0, 0.1)]">
        <h2 className="text-[20px] font-semibold text-[#333333]">
          User Details
        </h2>
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
            label="Name*"
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
          <SelectField
            label="Role*"
            value={formState.roleId}
            error={errors.roleId}
            disabled={rolesLoading}
            options={availableRoles.map((role) => ({
              value: String(role.roleId),
              label: role.roleName,
            }))}
            onChange={(value) =>
              setFormState((current) => ({ ...current, roleId: value }))
            }
          />
          {mode === "create" ? (
            <>
              <PasswordField
                label="Password*"
                value={formState.password}
                showPassword={showPassword}
                error={errors.password}
                onChange={(value) =>
                  setFormState((current) => ({
                    ...current,
                    password: value,
                  }))
                }
                onToggleVisibility={() =>
                  setShowPassword((current) => !current)
                }
              />
              <PasswordField
                label="Confirm Password*"
                value={formState.confirmPassword}
                showPassword={showConfirmPassword}
                error={errors.confirmPassword}
                onChange={(value) =>
                  setFormState((current) => ({
                    ...current,
                    confirmPassword: value,
                  }))
                }
                onToggleVisibility={() =>
                  setShowConfirmPassword((current) => !current)
                }
              />
            </>
          ) : null}
        </div>
      </section>

      <section className="rounded-[24px] border border-[#D1D5DC] bg-white p-5 shadow-[0px 0px 1px 0px rgba(0, 0, 0, 0.1)]">
        <h2 className="text-[20px] font-semibold text-[#333333]">
          Access & Permissions
        </h2>
        <p className="mt-1 text-[12px] text-[#333333] font-[400]">
          Assign modules for each location. Access is restricted to selected
          combinations.
        </p>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {formState.accessAssignments.map((assignment) => (
            <UserAccessCard
              key={assignment.moduleId}
              assignment={assignment}
              locations={locationOptions}
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
          description="The user has been granted access to the selected locations and modules. Login details will be shared through the registered email."
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
      <span className="mb-1.5 block text-[14px] font-[400] text-[#333333]">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-[10px] border border-[#D0D5DD] px-3 py-2.5 text-[14px] outline-none"
      />
      {error ? (
        <p className="mt-1 text-[12px] text-[#D92D20]">{error}</p>
      ) : null}
    </label>
  );
}

function PasswordField({
  label,
  value,
  showPassword,
  error,
  onChange,
  onToggleVisibility,
}: {
  label: string;
  value: string;
  showPassword: boolean;
  error?: string;
  onChange: (value: string) => void;
  onToggleVisibility: () => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[14px] font-[400] text-[#333333]">
        {label}
      </span>
      <div className="flex items-center rounded-[10px] border border-[#D0D5DD] px-3">
        <input
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full py-2.5 text-[14px] outline-none"
        />
        <button
          type="button"
          onClick={onToggleVisibility}
          className="text-[#667085]"
        >
          {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>
      </div>
      {error ? (
        <p className="mt-1 text-[12px] text-[#D92D20]">{error}</p>
      ) : null}
    </label>
  );
}

function SelectField({
  label,
  value,
  error,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[14px] font-[400] text-[#333333]">
        {label}
      </span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-[10px] border border-[#D0D5DD] bg-white px-3 py-2.5 text-[14px] outline-none disabled:cursor-not-allowed disabled:bg-[#F9FAFB]"
      >
        <option value="">Select Role</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? (
        <p className="mt-1 text-[12px] text-[#D92D20]">{error}</p>
      ) : null}
    </label>
  );
}
