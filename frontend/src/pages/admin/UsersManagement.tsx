import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Search, ShieldCheck, UserCog, X } from "lucide-react";
import { fetchUsers, updateUserRoles } from "@/api/users";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/input";
import { PERMISSIONS, ROLES, type RoleKey } from "@/lib/roles";
import type { AdminUser, AvailableRole } from "@/types/users";

function formatRoleLabel(roleKey: RoleKey) {
  return roleKey
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

export default function UsersManagement() {
  const { user: currentUser, refreshMe } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [availableRoles, setAvailableRoles] = useState<AvailableRole[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | RoleKey>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<RoleKey[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await fetchUsers();
        if (!active) {
          return;
        }

        setUsers(result.items);
        setAvailableRoles(result.availableRoles);
      } catch (err: any) {
        if (active) {
          setError(err?.response?.data?.message || "Failed to load users.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return users.filter((item) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        [item.username, item.email, item.firstname, item.lastname]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedSearch));

      const matchesRole = roleFilter === "ALL" || item.roles.includes(roleFilter);

      return matchesSearch && matchesRole;
    });
  }, [roleFilter, search, users]);

  const openEditor = (item: AdminUser) => {
    setSuccessMessage(null);
    setEditingUser(item);
    setSelectedRoles(item.roles);
  };

  const closeEditor = () => {
    if (saving) {
      return;
    }

    setEditingUser(null);
    setSelectedRoles([]);
    setError(null);
  };

  const toggleRole = (roleKey: RoleKey) => {
    setSelectedRoles((current) =>
      current.includes(roleKey) ? current.filter((item) => item !== roleKey) : [...current, roleKey]
    );
  };

  const isSelfEdit = editingUser?.id === currentUser?.id;
  const currentUserHasAdminAccess =
    currentUser?.permissions.includes(PERMISSIONS.USERS_MANAGE) ||
    currentUser?.permissions.includes(PERMISSIONS.ADMIN_ACCESS);
  const wouldRemoveOwnAdminAccess =
    isSelfEdit &&
    currentUserHasAdminAccess &&
    !selectedRoles.includes(ROLES.ADMIN);

  const handleSave = async () => {
    if (!editingUser) {
      return;
    }

    if (selectedRoles.length === 0) {
      setError("Select at least one role.");
      return;
    }

    if (wouldRemoveOwnAdminAccess) {
      setError("Keep the ADMIN role on your own account to avoid losing admin access.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const updatedUser = await updateUserRoles(editingUser.id, selectedRoles);
      setUsers((current) => current.map((item) => (item.id === updatedUser.id ? updatedUser : item)));
      setEditingUser(updatedUser);
      setSelectedRoles(updatedUser.roles);
      setSuccessMessage(`Roles updated for ${updatedUser.firstname} ${updatedUser.lastname}.`);

      if (updatedUser.id === currentUser?.id) {
        await refreshMe();
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to update user roles.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-white/70 bg-white/95 shadow-sm">
        <CardHeader className="space-y-3">
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
            <ShieldCheck className="h-4 w-4" />
            RBAC administration
          </div>
          <CardTitle className="text-3xl">Users Management</CardTitle>
          <CardDescription>
            Review platform users, inspect their current role set, and update roles using the existing RBAC API.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-[1fr_240px_220px]">
            <div className="space-y-2">
              <p className="text-sm font-medium">Search users</p>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search by username, email, first name, or last name..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Role filter</p>
              <select
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm outline-none focus:border-primary"
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value as "ALL" | RoleKey)}
              >
                <option value="ALL">All roles</option>
                {availableRoles.map((role) => (
                  <option key={role.key} value={role.key}>
                    {formatRoleLabel(role.key)}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-xl border bg-muted/20 px-4 py-3">
              <p className="text-sm font-medium">Visible users</p>
              <p className="mt-1 text-2xl font-semibold">{filteredUsers.length}</p>
              <p className="text-sm text-muted-foreground">Filtered from {users.length} account(s)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading && (
        <div className="rounded-xl border bg-white p-8 text-center text-muted-foreground shadow-sm">
          Loading users...
        </div>
      )}

      {error && !editingUser && !loading && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive shadow-sm">
          {error}
        </div>
      )}

      {!loading && !error && filteredUsers.length === 0 && (
        <EmptyState description="No users found for the current filters." />
      )}

      {!loading && filteredUsers.length > 0 && (
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="table-auto w-full border-collapse text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="px-4 py-3 text-sm font-semibold">User ID</th>
                <th className="px-4 py-3 text-sm font-semibold">Full name</th>
                <th className="px-4 py-3 text-sm font-semibold">Username</th>
                <th className="px-4 py-3 text-sm font-semibold">Email</th>
                <th className="px-4 py-3 text-sm font-semibold">Function</th>
                <th className="px-4 py-3 text-sm font-semibold">Current roles</th>
                <th className="px-4 py-3 text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((item) => (
                <tr key={item.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{item.id}</td>
                  <td className="px-4 py-3">
                    {item.firstname} {item.lastname}
                  </td>
                  <td className="px-4 py-3">{item.username}</td>
                  <td className="px-4 py-3">{item.email}</td>
                  <td className="px-4 py-3">{item.functionName || item.function || "Not available"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {item.roles.map((role) => (
                        <span
                          key={`${item.id}-${role}`}
                          className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                        >
                          {formatRoleLabel(role)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="outline" className="rounded-xl" onClick={() => openEditor(item)}>
                      Edit roles
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <Card className="max-h-[90vh] w-full max-w-2xl overflow-hidden border-white/70 bg-white shadow-xl">
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <div className="space-y-2">
                <div className="inline-flex w-fit items-center gap-2 rounded-full bg-secondary/10 px-4 py-2 text-sm font-medium text-secondary">
                  <UserCog className="h-4 w-4" />
                  Role editor
                </div>
                <CardTitle>Edit roles</CardTitle>
                <CardDescription>
                  Update access for {editingUser.firstname} {editingUser.lastname} ({editingUser.username}).
                </CardDescription>
              </div>

              <Button variant="ghost" size="icon" onClick={closeEditor} disabled={saving}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-6 overflow-y-auto">
              <div className="grid gap-4 rounded-xl border bg-muted/20 p-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="mt-1 font-medium">{editingUser.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Function</p>
                  <p className="mt-1 font-medium">{editingUser.functionName || editingUser.function || "Not available"}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">Available roles</p>
                  <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    {selectedRoles.length} selected
                  </span>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {availableRoles.map((role) => {
                    const checked = selectedRoles.includes(role.key);
                    const disableRoleToggle =
                      isSelfEdit && currentUserHasAdminAccess && role.key === ROLES.ADMIN && checked;

                    return (
                      <label
                        key={role.key}
                        className="flex cursor-pointer items-start gap-3 rounded-xl border bg-white p-4 transition hover:border-primary/40"
                      >
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                          checked={checked}
                          disabled={disableRoleToggle || saving}
                          onChange={() => toggleRole(role.key)}
                        />
                        <div className="space-y-1">
                          <p className="font-medium">{formatRoleLabel(role.key)}</p>
                          <p className="text-sm text-muted-foreground">{role.label}</p>
                          <div className="flex flex-wrap gap-1 pt-1">
                            {role.permissions.slice(0, 3).map((permission) => (
                              <span
                                key={`${role.key}-${permission}`}
                                className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                              >
                                {permission}
                              </span>
                            ))}
                            {role.permissions.length > 3 && (
                              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                                +{role.permissions.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {wouldRemoveOwnAdminAccess && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>
                      Your own account must keep an admin-capable role in this UI. The ADMIN role cannot be removed here
                      while you are editing yourself.
                    </p>
                  </div>
                </div>
              )}

              {successMessage && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                  {successMessage}
                </div>
              )}

              {error && editingUser && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button variant="outline" className="rounded-xl" onClick={closeEditor} disabled={saving}>
                  Cancel
                </Button>
                <Button className="rounded-xl" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "Save roles"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
