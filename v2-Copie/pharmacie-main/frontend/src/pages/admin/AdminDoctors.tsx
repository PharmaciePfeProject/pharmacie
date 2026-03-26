import { useEffect, useMemo, useState } from "react";
import {
  createDoctorRecord,
  fetchDoctors,
  toggleDoctorActive,
  updateDoctorRecord,
} from "@/api/doctors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/Pagination";
import { createDefaultPagination } from "@/lib/pagination";
import type { Doctor } from "@/types/doctors";
import type { PaginationMeta } from "@/types/pagination";

type DoctorForm = {
  name: string;
  specialty: string;
  address: string;
  tel: string;
};

const emptyForm: DoctorForm = {
  name: "",
  specialty: "",
  address: "",
  tel: "",
};

export default function AdminDoctors() {
  const [items, setItems] = useState<Doctor[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>(createDefaultPagination());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "1" | "0">("ALL");

  const [createForm, setCreateForm] = useState<DoctorForm>(emptyForm);
  const [editingDoctorId, setEditingDoctorId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<DoctorForm>(emptyForm);

  const activeCount = useMemo(() => items.filter((item) => item.actived === 1).length, [items]);

  const loadDoctors = async (page = 1, pageSize = pagination.pageSize) => {
    const response = await fetchDoctors({
      search: search.trim() || undefined,
      specialty: specialtyFilter.trim() || undefined,
      actived: statusFilter === "ALL" ? undefined : Number(statusFilter),
      page,
      pageSize,
    });

    setItems(response.items);
    setPagination(response.pagination);
  };

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        setLoading(true);
        await loadDoctors(1, pagination.pageSize);
      } catch (err: any) {
        if (active) {
          setError(err?.response?.data?.message || "Failed to load doctors.");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const applyFilters = async () => {
    try {
      setLoading(true);
      setError(null);
      await loadDoctors(1, pagination.pageSize);
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
      const response = await fetchDoctors({ page: 1, pageSize: pagination.pageSize });
      setItems(response.items);
      setPagination(response.pagination);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to reset filters.");
    } finally {
      setLoading(false);
    }
  };

  const submitCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!createForm.name.trim()) {
      setError("Doctor name is required.");
      return;
    }

    try {
      setSaving(true);
      await createDoctorRecord({
        name: createForm.name.trim(),
        specialty: createForm.specialty.trim() || undefined,
        address: createForm.address.trim() || undefined,
        tel: createForm.tel.trim() ? Number(createForm.tel) : undefined,
      });

      setCreateForm(emptyForm);
      setSuccess("Doctor added successfully in DOCTOR table.");
      await loadDoctors(1, pagination.pageSize);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to create doctor.");
    } finally {
      setSaving(false);
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
    setEditForm(emptyForm);
  };

  const saveEdit = async (doctor: Doctor) => {
    setError(null);
    setSuccess(null);

    if (!editForm.name.trim()) {
      setError("Doctor name is required.");
      return;
    }

    try {
      setSaving(true);
      await updateDoctorRecord(doctor.doctor_id, {
        name: editForm.name.trim(),
        specialty: editForm.specialty.trim() || undefined,
        address: editForm.address.trim() || undefined,
        tel: editForm.tel.trim() ? Number(editForm.tel) : undefined,
        actived: doctor.actived,
      });

      setSuccess("Doctor updated successfully.");
      cancelEdit();
      await loadDoctors(pagination.page, pagination.pageSize);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to update doctor.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (doctor: Doctor) => {
    setError(null);
    setSuccess(null);

    try {
      setSaving(true);
      const updated = await toggleDoctorActive(doctor.doctor_id);
      setItems((current) =>
        current.map((item) => (item.doctor_id === updated.doctor_id ? updated : item))
      );
      setSuccess(
        updated.actived === 1
          ? "Doctor activated successfully."
          : "Doctor deactivated successfully."
      );
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to change doctor status.");
    } finally {
      setSaving(false);
    }
  };

  const onPageChange = async (page: number, pageSize = pagination.pageSize) => {
    try {
      setLoading(true);
      setError(null);
      await loadDoctors(page, pageSize);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load doctors.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Doctor Registration</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Add doctors directly into DOCTOR table and manage their status.
        </p>

        <form onSubmit={submitCreate} className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-2">
            <p className="text-sm font-medium">Doctor name</p>
            <Input
              value={createForm.name}
              onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Dr. John Doe"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Specialty</p>
            <Input
              value={createForm.specialty}
              onChange={(e) => setCreateForm((p) => ({ ...p, specialty: e.target.value }))}
              placeholder="General Medicine"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Address</p>
            <Input
              value={createForm.address}
              onChange={(e) => setCreateForm((p) => ({ ...p, address: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Phone</p>
            <Input
              type="number"
              value={createForm.tel}
              onChange={(e) => setCreateForm((p) => ({ ...p, tel: e.target.value }))}
            />
          </div>

          <div className="col-span-1 flex items-end">
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "Saving..." : "Add doctor"}
            </Button>
          </div>
        </form>

        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        {success && <p className="mt-4 text-sm text-emerald-700">{success}</p>}
      </div>

      <div className="rounded-xl border bg-white p-5 shadow-sm">
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
            <p className="text-sm font-medium">Specialty filter</p>
            <Input
              value={specialtyFilter}
              onChange={(e) => setSpecialtyFilter(e.target.value)}
              placeholder="Ex: Cardiology"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Status</p>
            <select
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm outline-none focus:border-primary"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "ALL" | "1" | "0")}
            >
              <option value="ALL">All</option>
              <option value="1">Active</option>
              <option value="0">Inactive</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <Button variant="outline" className="w-full" onClick={resetFilters}>
              Reset
            </Button>
            <Button className="w-full" onClick={applyFilters}>
              Apply
            </Button>
          </div>
        </div>

        <p className="mt-3 text-sm text-muted-foreground">
          Active doctors in current page: {activeCount} / {items.length}
        </p>
      </div>

      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold">Doctors list</h3>
        {loading ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
        ) : items.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No doctor found with current filters.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full table-auto border-collapse text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="px-3 py-2">ID</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Specialty</th>
                  <th className="px-3 py-2">Address</th>
                  <th className="px-3 py-2">Phone</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((doctor) => {
                  const isEditing = editingDoctorId === doctor.doctor_id;

                  return (
                    <tr key={doctor.doctor_id} className="border-t">
                      <td className="px-3 py-2">{doctor.doctor_id}</td>
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <Input
                            value={editForm.name}
                            onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                          />
                        ) : (
                          doctor.name || "-"
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <Input
                            value={editForm.specialty}
                            onChange={(e) => setEditForm((p) => ({ ...p, specialty: e.target.value }))}
                          />
                        ) : (
                          doctor.specialty || "-"
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <Input
                            value={editForm.address}
                            onChange={(e) => setEditForm((p) => ({ ...p, address: e.target.value }))}
                          />
                        ) : (
                          doctor.address || "-"
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <Input
                            type="number"
                            value={editForm.tel}
                            onChange={(e) => setEditForm((p) => ({ ...p, tel: e.target.value }))}
                          />
                        ) : (
                          doctor.tel || "-"
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={
                            doctor.actived === 1
                              ? "rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-700"
                              : "rounded-full bg-gray-200 px-2 py-1 text-xs text-gray-700"
                          }
                        >
                          {doctor.actived === 1 ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          {isEditing ? (
                            <>
                              <Button size="sm" onClick={() => saveEdit(doctor)} disabled={saving}>
                                Save
                              </Button>
                              <Button size="sm" variant="outline" onClick={cancelEdit} disabled={saving}>
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button size="sm" variant="outline" onClick={() => startEdit(doctor)} disabled={saving}>
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => toggleActive(doctor)}
                                disabled={saving}
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
      </div>

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
