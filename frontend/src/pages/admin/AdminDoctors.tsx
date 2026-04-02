import { useEffect, useMemo, useState } from "react";
import { createDoctorRecord, fetchDoctors, toggleDoctorActive, updateDoctorRecord } from "@/api/doctors";
import { createDoctor as createDoctorAccount, fetchUsers } from "@/api/users";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/Pagination";
import { createDefaultPagination } from "@/lib/pagination";
import { ROLES } from "@/lib/roles";
import type { Doctor } from "@/types/doctors";
import type { PaginationMeta } from "@/types/pagination";
import type { AdminUser } from "@/types/users";

type DoctorForm = {
  name: string;
  specialty: string;
  address: string;
  tel: string;
};

type DoctorAccountForm = {
  firstname: string;
  lastname: string;
  email: string;
  username: string;
  password: string;
};

const emptyDoctorForm: DoctorForm = {
  name: "",
  specialty: "",
  address: "",
  tel: "",
};

const emptyDoctorAccountForm: DoctorAccountForm = {
  firstname: "",
  lastname: "",
  email: "",
  username: "",
  password: "",
};

function normalizeName(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function DoctorStat({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string | number;
  tone?: "slate" | "emerald" | "amber" | "blue";
}) {
  const toneClass =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : tone === "amber"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : tone === "blue"
          ? "bg-blue-50 text-blue-700 border-blue-200"
          : "bg-slate-50 text-slate-700 border-slate-200";

  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <p className="text-sm font-medium">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

export default function AdminDoctors() {
  const [items, setItems] = useState<Doctor[]>([]);
  const [doctorAccounts, setDoctorAccounts] = useState<AdminUser[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>(createDefaultPagination());
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "1" | "0">("ALL");

  const [createForm, setCreateForm] = useState<DoctorForm>(emptyDoctorForm);
  const [accountForm, setAccountForm] = useState<DoctorAccountForm>(emptyDoctorAccountForm);
  const [editingDoctorId, setEditingDoctorId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<DoctorForm>(emptyDoctorForm);

  const loadWorkspace = async (page = 1, pageSize = pagination.pageSize) => {
    const [doctorsResponse, usersResponse] = await Promise.all([
      fetchDoctors({
        search: search.trim() || undefined,
        specialty: specialtyFilter.trim() || undefined,
        actived: statusFilter === "ALL" ? undefined : Number(statusFilter),
        page,
        pageSize,
      }),
      fetchUsers(),
    ]);

    setItems(doctorsResponse.items);
    setPagination(doctorsResponse.pagination);
    setDoctorAccounts(usersResponse.items.filter((item) => item.roles.includes(ROLES.MEDECIN)));
  };

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        await loadWorkspace(1, pagination.pageSize);
      } catch (err: any) {
        if (active) {
          setError(err?.response?.data?.message || "Failed to load the doctors workspace.");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const activeCount = useMemo(() => items.filter((item) => item.actived === 1).length, [items]);

  const profileNames = useMemo(() => new Set(items.map((item) => normalizeName(item.name))), [items]);

  const linkedAccountCount = useMemo(() => {
    return doctorAccounts.filter((account) =>
      profileNames.has(normalizeName(`${account.firstname} ${account.lastname}`))
    ).length;
  }, [doctorAccounts, profileNames]);

  const unlinkedAccountCount = doctorAccounts.length - linkedAccountCount;

  const applyFilters = async () => {
    try {
      setLoading(true);
      setError(null);
      await loadWorkspace(1, pagination.pageSize);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to apply filters.");
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = async () => {
    setSearch("");
    setSpecialtyFilter("");
    setStatusFilter("ALL");

    try {
      setLoading(true);
      setError(null);
      const [doctorsResponse, usersResponse] = await Promise.all([
        fetchDoctors({ page: 1, pageSize: pagination.pageSize }),
        fetchUsers(),
      ]);

      setItems(doctorsResponse.items);
      setPagination(doctorsResponse.pagination);
      setDoctorAccounts(usersResponse.items.filter((item) => item.roles.includes(ROLES.MEDECIN)));
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to reset filters.");
    } finally {
      setLoading(false);
    }
  };

  const submitCreateProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!createForm.name.trim()) {
      setError("Doctor profile name is required.");
      return;
    }

    try {
      setSavingProfile(true);
      await createDoctorRecord({
        name: createForm.name.trim(),
        specialty: createForm.specialty.trim() || undefined,
        address: createForm.address.trim() || undefined,
        tel: createForm.tel.trim() ? Number(createForm.tel) : undefined,
      });

      setCreateForm(emptyDoctorForm);
      setSuccess("Doctor profile created successfully.");
      await loadWorkspace(1, pagination.pageSize);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to create doctor profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const submitCreateAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (
      !accountForm.firstname.trim() ||
      !accountForm.lastname.trim() ||
      !accountForm.email.trim() ||
      !accountForm.username.trim() ||
      !accountForm.password.trim()
    ) {
      setError("Fill in all account fields before creating a doctor login.");
      return;
    }

    try {
      setSavingAccount(true);
      await createDoctorAccount({
        firstname: accountForm.firstname.trim(),
        lastname: accountForm.lastname.trim(),
        email: accountForm.email.trim(),
        username: accountForm.username.trim(),
        password: accountForm.password,
      });

      setAccountForm(emptyDoctorAccountForm);
      setSuccess("Doctor login account created successfully. A matching doctor profile was ensured automatically.");
      await loadWorkspace(pagination.page, pagination.pageSize);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to create doctor login account.");
    } finally {
      setSavingAccount(false);
    }
  };

  const startEdit = (doctor: Doctor) => {
    setEditingDoctorId(doctor.doctor_id);
    setEditForm({
      name: doctor.name || "",
      specialty: doctor.specialty || "",
      address: doctor.address || "",
      tel: doctor.tel ? String(doctor.tel) : "",
    });
  };

  const cancelEdit = () => {
    setEditingDoctorId(null);
    setEditForm(emptyDoctorForm);
  };

  const saveEdit = async (doctor: Doctor) => {
    setError(null);
    setSuccess(null);

    if (!editForm.name.trim()) {
      setError("Doctor profile name is required.");
      return;
    }

    try {
      setSavingProfile(true);
      await updateDoctorRecord(doctor.doctor_id, {
        name: editForm.name.trim(),
        specialty: editForm.specialty.trim() || undefined,
        address: editForm.address.trim() || undefined,
        tel: editForm.tel.trim() ? Number(editForm.tel) : undefined,
        actived: doctor.actived,
      });

      cancelEdit();
      setSuccess("Doctor profile updated successfully.");
      await loadWorkspace(pagination.page, pagination.pageSize);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to update doctor profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const toggleActive = async (doctor: Doctor) => {
    setError(null);
    setSuccess(null);

    try {
      setSavingProfile(true);
      const updated = await toggleDoctorActive(doctor.doctor_id);
      setItems((current) =>
        current.map((item) => (item.doctor_id === updated.doctor_id ? updated : item))
      );
      setSuccess(updated.actived === 1 ? "Doctor profile activated." : "Doctor profile deactivated.");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to change doctor profile status.");
    } finally {
      setSavingProfile(false);
    }
  };

  const onPageChange = async (page: number, pageSize = pagination.pageSize) => {
    try {
      setLoading(true);
      setError(null);
      await loadWorkspace(page, pageSize);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load doctors.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">Admin workspace</p>
            <h2 className="text-3xl font-semibold tracking-tight">Doctors management</h2>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              This space is designed for onboarding. First create or verify the doctor profile, then create the
              login account. The account creation flow now also ensures the matching doctor profile exists, so new
              doctors can access prescriptions more reliably.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-900">Recommended admin flow</p>
            <ol className="mt-3 space-y-3 text-sm text-slate-600">
              <li>1. Create a doctor profile if the person is new in the operational master data.</li>
              <li>2. Create the doctor login account with the same first and last name.</li>
              <li>3. Confirm the doctor appears in the account list and the profile list below.</li>
            </ol>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DoctorStat label="Profiles on this page" value={items.length} />
        <DoctorStat label="Active profiles" value={activeCount} tone="emerald" />
        <DoctorStat label="Doctor login accounts" value={doctorAccounts.length} tone="blue" />
        <DoctorStat label="Accounts without visible profile" value={unlinkedAccountCount} tone="amber" />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold">Create doctor profile</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Use this when you need to add or maintain the operational doctor master data.
          </p>

          <form onSubmit={submitCreateProfile} className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <p className="text-sm font-medium">Doctor full name</p>
              <Input
                value={createForm.name}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Dr. John Doe"
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Specialty</p>
              <Input
                value={createForm.specialty}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, specialty: e.target.value }))}
                placeholder="General medicine"
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Phone</p>
              <Input
                type="number"
                value={createForm.tel}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, tel: e.target.value }))}
                placeholder="55123456"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <p className="text-sm font-medium">Address</p>
              <Input
                value={createForm.address}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="Clinic or office address"
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" disabled={savingProfile}>
                {savingProfile ? "Saving profile..." : "Create doctor profile"}
              </Button>
            </div>
          </form>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold">Create doctor login account</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            This creates the application account with the doctor role. Keep the name aligned with the profile for
            a cleaner onboarding flow.
          </p>

          <form onSubmit={submitCreateAccount} className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-medium">First name</p>
              <Input
                value={accountForm.firstname}
                onChange={(e) => setAccountForm((prev) => ({ ...prev, firstname: e.target.value }))}
                placeholder="John"
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Last name</p>
              <Input
                value={accountForm.lastname}
                onChange={(e) => setAccountForm((prev) => ({ ...prev, lastname: e.target.value }))}
                placeholder="Doe"
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Email</p>
              <Input
                type="email"
                value={accountForm.email}
                onChange={(e) => setAccountForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="doctor@company.tn"
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Username</p>
              <Input
                value={accountForm.username}
                onChange={(e) => setAccountForm((prev) => ({ ...prev, username: e.target.value }))}
                placeholder="john.doe"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <p className="text-sm font-medium">Temporary password</p>
              <Input
                type="password"
                value={accountForm.password}
                onChange={(e) => setAccountForm((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="At least 6 characters"
              />
            </div>
            <div className="md:col-span-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              Tip: use the same first and last name as the doctor profile above. That keeps the doctor workspace
              aligned and easier to support.
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" disabled={savingAccount}>
                {savingAccount ? "Creating account..." : "Create doctor account"}
              </Button>
            </div>
          </form>
        </div>
      </section>

      {(error || success) && (
        <section className="space-y-3">
          {error ? <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div> : null}
          {success ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{success}</div> : null}
        </section>
      )}

      <section className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2">
          <h3 className="text-lg font-semibold">Doctor login accounts</h3>
          <p className="text-sm text-muted-foreground">
            These are users who already have the doctor role in the platform.
          </p>
        </div>

        {doctorAccounts.length === 0 ? (
          <EmptyState className="mt-4 border-0 bg-muted/20 shadow-none" description="No doctor login accounts found yet." />
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full table-auto border-collapse text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Username</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Function</th>
                  <th className="px-4 py-3 font-semibold">Profile link</th>
                </tr>
              </thead>
              <tbody>
                {doctorAccounts.map((account) => {
                  const linked = profileNames.has(normalizeName(`${account.firstname} ${account.lastname}`));

                  return (
                    <tr key={account.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">{`${account.firstname} ${account.lastname}`.trim() || "Not available"}</td>
                      <td className="px-4 py-3">{account.username}</td>
                      <td className="px-4 py-3">{account.email}</td>
                      <td className="px-4 py-3">{account.functionName || account.function || "Doctor"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            linked
                              ? "rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700"
                              : "rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700"
                          }
                        >
                          {linked ? "Profile visible" : "Profile not on current page"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Search</p>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, specialty, address or phone"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Specialty</p>
            <Input
              value={specialtyFilter}
              onChange={(e) => setSpecialtyFilter(e.target.value)}
              placeholder="Ex: cardiology"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Status</p>
            <select
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm outline-none focus:border-primary"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "ALL" | "1" | "0")}
            >
              <option value="ALL">All profiles</option>
              <option value="1">Active only</option>
              <option value="0">Inactive only</option>
            </select>
          </div>
          <div className="flex items-end justify-end gap-2">
            <Button variant="outline" className="w-full lg:w-auto" onClick={resetFilters}>
              Reset
            </Button>
            <Button className="w-full lg:w-auto" onClick={applyFilters}>
              Apply
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Doctor profiles</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Review operational doctor records and keep their status up to date.
            </p>
          </div>
          <div className="rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">
            Active on this page: {activeCount} / {items.length}
          </div>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading doctors...</p>
        ) : items.length === 0 ? (
          <EmptyState className="mt-4 border-0 bg-muted/20 shadow-none" description="No doctor profiles found with the current filters." />
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full table-auto border-collapse text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="px-4 py-3 font-semibold">ID</th>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Specialty</th>
                  <th className="px-4 py-3 font-semibold">Address</th>
                  <th className="px-4 py-3 font-semibold">Phone</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((doctor) => {
                  const isEditing = editingDoctorId === doctor.doctor_id;

                  return (
                    <tr key={doctor.doctor_id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">{doctor.doctor_id}</td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <Input
                            value={editForm.name}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                          />
                        ) : (
                          doctor.name || "Not available"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <Input
                            value={editForm.specialty}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, specialty: e.target.value }))}
                          />
                        ) : (
                          doctor.specialty || "Not available"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <Input
                            value={editForm.address}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, address: e.target.value }))}
                          />
                        ) : (
                          doctor.address || "Not available"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <Input
                            type="number"
                            value={editForm.tel}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, tel: e.target.value }))}
                          />
                        ) : (
                          doctor.tel || "Not available"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            doctor.actived === 1
                              ? "rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700"
                              : "rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700"
                          }
                        >
                          {doctor.actived === 1 ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {isEditing ? (
                            <>
                              <Button size="sm" onClick={() => saveEdit(doctor)} disabled={savingProfile}>
                                Save
                              </Button>
                              <Button size="sm" variant="outline" onClick={cancelEdit} disabled={savingProfile}>
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button size="sm" variant="outline" onClick={() => startEdit(doctor)} disabled={savingProfile}>
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => toggleActive(doctor)}
                                disabled={savingProfile}
                              >
                                {doctor.actived === 1 ? "Deactivate" : "Activate"}
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Pagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        pageSize={pagination.pageSize}
        onPrevious={() => onPageChange(Math.max(1, pagination.page - 1))}
        onNext={() => onPageChange(Math.min(pagination.totalPages, pagination.page + 1))}
        onPageSizeChange={(pageSize) => onPageChange(1, pageSize)}
      />
    </div>
  );
}
