import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  agentAPI,
} from "@/api/agents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/i18n/LanguageContext";
import { Pagination } from "@/components/ui/Pagination";
import { createDefaultPagination } from "@/lib/pagination";
import { AlertCircle, Trash2, PencilLine, Plus, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const initialForm = {
  agent_name: "",
  agent_situation: "",
  agent_phone_number: "",
  agent_address: "",
  agent_start_date: "",
  agent_end_date: "",
  agent_position: "",
  agent_email: "",
  agent_salary: "",
  agent_status: "Actif",
  agent_cin: "",
};

function formatDateInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export default function AdminAgents() {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [agents, setAgents] = useState([]);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [editingAgentId, setEditingAgentId] = useState(null);
  const [editForm, setEditForm] = useState(initialForm);
  const [agentToDelete, setAgentToDelete] = useState(null);
  const [pagination, setPagination] = useState(createDefaultPagination());
  const [searchQuery, setSearchQuery] = useState("");

  const canSubmit = useMemo(() => {
    if (!form.agent_name.trim()) return false;
    if (!form.agent_phone_number.trim()) return false;
    if (!form.agent_address.trim()) return false;
    if (!form.agent_cin.trim()) return false;
    if (!form.agent_status) return false;
    if (form.agent_status === "Retraite" && !form.agent_end_date.trim()) return false;
    return true;
  }, [form]);

  const loadAgents = async (page = 1, search = "") => {
    try {
      setLoadingAgents(true);
      const res = await agentAPI.listAgents({
        page,
        pageSize: 20,
        search,
      });
      setAgents(res.items);
      setPagination(res.pagination || createDefaultPagination());
      setError(null);
    } catch (err) {
      console.error("Error loading agents:", err);
      setError("Failed to load agents");
    } finally {
      setLoadingAgents(false);
    }
  };

  const loadAgentIntoForm = async (agentId) => {
    try {
      const agent = await agentAPI.getAgent(agentId);
      setEditingAgentId(agentId);
      setEditForm({
        agent_name: agent.agent_name || "",
        agent_situation: agent.agent_situation || "",
        agent_phone_number: agent.agent_phone_number || "",
        agent_address: agent.agent_address || "",
        agent_start_date: formatDateInput(agent.agent_start_date),
        agent_end_date: formatDateInput(agent.agent_end_date),
        agent_position: agent.agent_position || "",
        agent_email: agent.agent_email || "",
        agent_salary: agent.agent_salary ?? "",
        agent_status: agent.agent_status || "Actif",
        agent_cin: agent.agent_cin || "",
      });
    } catch (err) {
      console.error("Error loading agent:", err);
      setError("Failed to load agent");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit || submitting) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        agent_name: form.agent_name,
        agent_situation: form.agent_situation,
        agent_phone_number: form.agent_phone_number,
        agent_address: form.agent_address,
        agent_start_date: form.agent_start_date,
        agent_position: form.agent_position,
        agent_email: form.agent_email,
        agent_salary: form.agent_salary === "" ? null : Number(form.agent_salary),
        agent_status: form.agent_status,
        agent_cin: form.agent_cin,
      };

      if (form.agent_status === "Retraite" && form.agent_end_date) {
        payload.agent_end_date = form.agent_end_date;
      }

      await agentAPI.createAgent(payload);
      setSuccess("Agent created successfully");

      setForm(initialForm);
      await loadAgents(1, searchQuery);
    } catch (err) {
      console.error("Error saving agent:", err);
      let errorMsg = "Failed to save agent";
      if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      }
      if (err.response?.data?.errors) {
        const validationErrors = err.response.data.errors;
        const fieldErrors = validationErrors.fieldErrors || {};
        const errorDetails = Object.entries(fieldErrors)
          .map(([field, msgs]) => `${field}: ${msgs.join(", ")}`)
          .join(" | ");
        if (errorDetails) {
          errorMsg = errorDetails;
        }
      }
      setError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (agentId) => {
    try {
      setSubmitting(true);
      await agentAPI.deleteAgent(agentId);
      setSuccess("Agent deleted successfully");
      setForm(initialForm);
      setEditingAgentId(null);
      setAgentToDelete(null);
      await loadAgents(1, searchQuery);
    } catch (err) {
      console.error("Error deleting agent:", err);
      setError(err.response?.data?.message || "Failed to delete agent");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingAgentId || submitting) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        agent_name: editForm.agent_name,
        agent_situation: editForm.agent_situation,
        agent_phone_number: editForm.agent_phone_number,
        agent_address: editForm.agent_address,
        agent_start_date: editForm.agent_start_date,
        agent_position: editForm.agent_position,
        agent_email: editForm.agent_email,
        agent_salary: editForm.agent_salary === "" ? null : Number(editForm.agent_salary),
        agent_status: editForm.agent_status,
        agent_cin: editForm.agent_cin,
      };
      if (editForm.agent_status === "Retraite" && editForm.agent_end_date) {
        payload.agent_end_date = editForm.agent_end_date;
      }
      await agentAPI.updateAgent(editingAgentId, payload);
      setSuccess("Agent updated successfully");
      setEditingAgentId(null);
      setEditForm(initialForm);
      await loadAgents(pagination.page || 1, searchQuery);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update agent");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSearch = async (value) => {
    setSearchQuery(value);
    await loadAgents(1, value);
  };

  const handleClear = () => {
    setForm(initialForm);
    setEditingAgentId(null);
    setError(null);
    setSuccess(null);
  };

  useEffect(() => {
    loadAgents(1, searchQuery);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t("page.adminAgents.title")}
        </h1>
        <p className="mt-2 text-gray-600">
          {t("page.adminAgents.subtitle")}
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-green-50 p-4">
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-gray-200 bg-white p-6 space-y-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Add New Agent</h2>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-700">
              <span className="font-semibold">Required fields:</span> Name, Phone, Address, CIN, Status. If status is "Retraite", End Date is also required.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Agent Name <span className="text-red-600">*</span>
            </label>
            <Input
              type="text"
              value={form.agent_name}
              onChange={(e) =>
                setForm({ ...form, agent_name: e.target.value })
              }
              placeholder="e.g., Dr. Jean Dupont"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Agent Situation
            </label>
            <Input
              type="text"
              value={form.agent_situation}
              onChange={(e) =>
                setForm({ ...form, agent_situation: e.target.value })
              }
              placeholder="e.g., Hospital Ward A, Service 1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status <span className="text-red-600">*</span>
            </label>
            <select
              value={form.agent_status}
              onChange={(e) =>
                setForm({
                  ...form,
                  agent_status: e.target.value,
                  agent_end_date: e.target.value === "Actif" ? "" : form.agent_end_date,
                })
              }
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              required
            >
              <option value="Actif">Actif</option>
              <option value="Retraite">Retraite</option>
            </select>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number <span className="text-red-600">*</span>
              </label>
              <Input
                type="text"
                value={form.agent_phone_number}
                onChange={(e) =>
                  setForm({ ...form, agent_phone_number: e.target.value })
                }
                placeholder="e.g., +212600000000"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <Input
                type="email"
                value={form.agent_email}
                onChange={(e) =>
                  setForm({ ...form, agent_email: e.target.value })
                }
                placeholder="e.g., agent@example.com"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address <span className="text-red-600">*</span>
              </label>
              <Input
                type="text"
                value={form.agent_address}
                onChange={(e) =>
                  setForm({ ...form, agent_address: e.target.value })
                }
                placeholder="e.g., Casablanca"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <Input
                type="date"
                value={form.agent_start_date}
                onChange={(e) =>
                  setForm({ ...form, agent_start_date: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <Input
                type="date"
                value={form.agent_end_date}
                onChange={(e) =>
                  setForm({ ...form, agent_end_date: e.target.value })
                }
                disabled={form.agent_status === "Actif"}
                placeholder={form.agent_status === "Actif" ? "En travail encore" : ""}
              />
              {form.agent_status === "Actif" && (
                <p className="mt-2 text-xs text-gray-500">En travail encore</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Position
              </label>
              <Input
                type="text"
                value={form.agent_position}
                onChange={(e) =>
                  setForm({ ...form, agent_position: e.target.value })
                }
                placeholder="e.g., Pharmacist"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Salary
              </label>
              <Input
                type="number"
                step="0.01"
                value={form.agent_salary}
                onChange={(e) =>
                  setForm({ ...form, agent_salary: e.target.value })
                }
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CIN <span className="text-red-600">*</span>
              </label>
              <Input
                type="text"
                value={form.agent_cin}
                onChange={(e) =>
                  setForm({ ...form, agent_cin: e.target.value })
                }
                placeholder="e.g., AA123456"
                required
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Button
            type="submit"
            disabled={!canSubmit || submitting}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {submitting ? "Saving..." : "Create Agent"}
          </Button>
        </div>
      </form>

      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold mb-4">Agents List</h2>
          <Input
            type="search"
            placeholder="Search by name or situation..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full max-w-md"
          />
        </div>

        {loadingAgents ? (
          <div className="p-8 text-center text-gray-500">Loading agents...</div>
        ) : agents.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No agents found. Create one to get started!
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">
                      Situation
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">
                      Dates
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right font-semibold text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map((agent) => (
                    <tr
                      key={agent.agent_id}
                      className="border-b border-gray-200 hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 text-gray-900">
                        {agent.agent_id}
                      </td>
                      <td className="px-6 py-4 text-gray-900">
                        {agent.agent_name}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {agent.agent_situation || "-"}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        <div className="space-y-1">
                          <div>{agent.agent_phone_number || "-"}</div>
                          <div>{agent.agent_email || "-"}</div>
                          <div>{agent.agent_address || "-"}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        <div className="space-y-1">
                          <div>{agent.agent_start_date ? new Date(agent.agent_start_date).toLocaleDateString() : "-"}</div>
                          <div>
                            {agent.agent_status === "Actif"
                              ? "En travail encore"
                              : agent.agent_end_date
                                ? new Date(agent.agent_end_date).toLocaleDateString()
                                : "-"}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        <div className="space-y-1">
                          <div>{agent.agent_position || "-"}</div>
                          <div>CIN: {agent.agent_cin || "-"}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        <div className="space-y-1">
                          <div>{agent.agent_status || "-"}</div>
                          <div>{agent.agent_salary !== null && agent.agent_salary !== undefined ? agent.agent_salary : "-"}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="outline" className="rounded-xl border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800" onClick={() => loadAgentIntoForm(agent.agent_id)}>
                            <PencilLine className="mr-1 h-4 w-4" />
                            Edit
                          </Button>
                          <Button size="sm" variant="destructive" className="rounded-xl bg-rose-600 text-white hover:bg-rose-700" onClick={() => setAgentToDelete(agent)}>
                            <Trash2 className="mr-1 h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination && pagination.total_pages > 1 && (
              <div className="p-4 border-t border-gray-200">
                <Pagination pagination={pagination} onPageChange={loadAgents} />
              </div>
            )}
          </>
        )}
      </div>

      {editingAgentId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm">
          <Card className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden border-white/70 bg-white shadow-2xl">
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 border-b">
              <div>
                <CardTitle>Edit agent</CardTitle>
                <CardDescription>Update agent details and save your changes.</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setEditingAgentId(null)} disabled={submitting}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 overflow-y-auto p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <Input value={editForm.agent_name} onChange={(e) => setEditForm((v) => ({ ...v, agent_name: e.target.value }))} placeholder="Agent name" />
                <Input value={editForm.agent_situation} onChange={(e) => setEditForm((v) => ({ ...v, agent_situation: e.target.value }))} placeholder="Situation" />
                <Input value={editForm.agent_phone_number} onChange={(e) => setEditForm((v) => ({ ...v, agent_phone_number: e.target.value }))} placeholder="Phone" />
                <Input type="email" value={editForm.agent_email} onChange={(e) => setEditForm((v) => ({ ...v, agent_email: e.target.value }))} placeholder="Email" />
                <Input className="md:col-span-2" value={editForm.agent_address} onChange={(e) => setEditForm((v) => ({ ...v, agent_address: e.target.value }))} placeholder="Address" />
                <Input type="date" value={editForm.agent_start_date} onChange={(e) => setEditForm((v) => ({ ...v, agent_start_date: e.target.value }))} />
                <Input type="date" value={editForm.agent_end_date} onChange={(e) => setEditForm((v) => ({ ...v, agent_end_date: e.target.value }))} />
                <Input value={editForm.agent_position} onChange={(e) => setEditForm((v) => ({ ...v, agent_position: e.target.value }))} placeholder="Position" />
                <Input value={editForm.agent_cin} onChange={(e) => setEditForm((v) => ({ ...v, agent_cin: e.target.value }))} placeholder="CIN" />
              </div>
              <div className="flex justify-end gap-2 border-t pt-4">
                <Button variant="outline" onClick={() => setEditingAgentId(null)} disabled={submitting}>Cancel</Button>
                <Button onClick={handleSaveEdit} disabled={submitting}>
                  {submitting ? "Saving..." : "Save"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {agentToDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-rose-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-rose-100 px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-900">Delete</h3>
              <button type="button" className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700" onClick={() => setAgentToDelete(null)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-slate-700">Are you sure you want to delete this agent?</p>
              <p className="mt-2 text-xs text-slate-500">{agentToDelete.agent_name}</p>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
              <Button type="button" variant="outline" onClick={() => setAgentToDelete(null)} disabled={submitting}>Cancel</Button>
              <Button type="button" className="bg-rose-600 text-white hover:bg-rose-700" onClick={() => handleDelete(agentToDelete.agent_id)} disabled={submitting}>
                <Trash2 className="mr-1 h-4 w-4" />
                {submitting ? "Saving..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
