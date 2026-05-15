import { useEffect, useMemo, useState } from "react";
import {
  agentAPI,
} from "@/api/agents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/i18n/LanguageContext";
import { Pagination } from "@/components/ui/Pagination";
import { createDefaultPagination } from "@/lib/pagination";
import { AlertCircle } from "lucide-react";

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
  const { t, language } = useLanguage();
  const isFr = language === "fr";
  const copy = {
    loadFailed: isFr ? "Echec du chargement des agents" : "Failed to load agents",
    loadAgentFailed: isFr ? "Echec du chargement de l'agent" : "Failed to load agent",
    updated: isFr ? "Agent mis a jour avec succes" : "Agent updated successfully",
    created: isFr ? "Agent cree avec succes" : "Agent created successfully",
    saveFailed: isFr ? "Echec de l'enregistrement de l'agent" : "Failed to save agent",
    deleted: isFr ? "Agent supprime avec succes" : "Agent deleted successfully",
    deleteFailed: isFr ? "Echec de suppression de l'agent" : "Failed to delete agent",
    addTitle: isFr ? "Ajouter un agent" : "Add New Agent",
    requiredFieldsTitle: isFr ? "Champs obligatoires :" : "Required fields:",
    requiredFieldsBody: isFr
      ? "Nom, Telephone, Adresse, CIN, Statut. Si le statut est \"Retraite\", la date de fin est aussi obligatoire."
      : "Name, Phone, Address, CIN, Status. If status is \"Retraite\", End Date is also required.",
    agentName: isFr ? "Nom de l'agent" : "Agent Name",
    situation: isFr ? "Situation de l'agent" : "Agent Situation",
    status: isFr ? "Statut" : "Status",
    phone: isFr ? "Telephone" : "Phone Number",
    email: isFr ? "Email" : "Email",
    address: isFr ? "Adresse" : "Address",
    startDate: isFr ? "Date de debut" : "Start Date",
    endDate: isFr ? "Date de fin" : "End Date",
    position: isFr ? "Poste" : "Position",
    salary: isFr ? "Salaire" : "Salary",
    cin: "CIN",
    workingStill: isFr ? "Toujours en activite" : "Still working",
    saving: isFr ? "Enregistrement..." : "Saving...",
    creating: isFr ? "Creer l'agent" : "Create Agent",
    listTitle: isFr ? "Liste des agents" : "Agents List",
    searchPlaceholder: isFr
      ? "Rechercher par nom ou situation..."
      : "Search by name or situation...",
    loading: isFr ? "Chargement des agents..." : "Loading agents...",
    empty: isFr
      ? "Aucun agent trouve. Creez-en un pour commencer !"
      : "No agents found. Create one to get started!",
    nameCol: isFr ? "Nom" : "Name",
    contact: isFr ? "Contact" : "Contact",
    dates: isFr ? "Dates" : "Dates",
    role: isFr ? "Role" : "Role",
    actions: isFr ? "Actions" : "Actions",
    edit: isFr ? "Modifier" : "Edit",
    remove: isFr ? "Supprimer" : "Delete",
    editAgent: isFr ? "Modifier l'agent" : "Edit Agent",
    cancel: isFr ? "Annuler" : "Cancel",
    updateAgent: isFr ? "Mettre a jour l'agent" : "Update Agent",
    deleteAgentTitle: isFr ? "Supprimer l'agent" : "Delete agent",
    deleteAgentBody: isFr
      ? "Voulez-vous vraiment supprimer cet agent ?"
      : "Are you sure you want to delete this agent?",
    deleting: isFr ? "Suppression..." : "Deleting...",
  };
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [agents, setAgents] = useState([]);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [editingAgentId, setEditingAgentId] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
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
        pageSize: 10,
        search,
      });
      setAgents(res.items || []);
      setPagination(res.pagination || createDefaultPagination());
      setError(null);
    } catch (err) {
      console.error("Error loading agents:", err);
      setError(copy.loadFailed);
    } finally {
      setLoadingAgents(false);
    }
  };

  const loadAgentIntoForm = async (agentId) => {
    try {
      const agent = await agentAPI.getAgent(agentId);
      setEditingAgentId(agentId);
      setIsEditModalOpen(true);
      setForm({
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
      setError(copy.loadAgentFailed);
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

      if (editingAgentId) {
        await agentAPI.updateAgent(editingAgentId, payload);
        setSuccess(copy.updated);
      } else {
        await agentAPI.createAgent(payload);
        setSuccess(copy.created);
      }

      setForm(initialForm);
      setEditingAgentId(null);
      setIsEditModalOpen(false);
      await loadAgents(1, searchQuery);
    } catch (err) {
      console.error("Error saving agent:", err);
      let errorMsg = copy.saveFailed;
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
      setSuccess(copy.deleted);
      setForm(initialForm);
      setEditingAgentId(null);
      setDeleteTarget(null);
      await loadAgents(1, searchQuery);
    } catch (err) {
      console.error("Error deleting agent:", err);
      setError(err.response?.data?.message || copy.deleteFailed);
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
    setIsEditModalOpen(false);
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
          <h2 className="text-lg font-semibold">
            {copy.addTitle}
          </h2>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-700">
              <span className="font-semibold">{copy.requiredFieldsTitle}</span>{" "}
              {copy.requiredFieldsBody}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {copy.agentName} <span className="text-red-600">*</span>
            </label>
            <Input
              type="text"
              value={form.agent_name}
              onChange={(e) =>
                setForm({ ...form, agent_name: e.target.value })
              }
              placeholder={isFr ? "ex. Dr Jean Dupont" : "e.g., Dr. Jean Dupont"}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {copy.situation}
            </label>
            <Input
              type="text"
              value={form.agent_situation}
              onChange={(e) =>
                setForm({ ...form, agent_situation: e.target.value })
              }
              placeholder={isFr ? "ex. Service A, hopital" : "e.g., Hospital Ward A, Service 1"}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {copy.status} <span className="text-red-600">*</span>
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
              {copy.phone} <span className="text-red-600">*</span>
              </label>
              <Input
                type="text"
                value={form.agent_phone_number}
                onChange={(e) =>
                  setForm({ ...form, agent_phone_number: e.target.value })
                }
              placeholder={isFr ? "ex. +21600000000" : "e.g., +212600000000"}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {copy.email}
              </label>
              <Input
                type="email"
                value={form.agent_email}
                onChange={(e) =>
                  setForm({ ...form, agent_email: e.target.value })
                }
                placeholder={isFr ? "ex. agent@exemple.com" : "e.g., agent@example.com"}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {copy.address} <span className="text-red-600">*</span>
              </label>
              <Input
                type="text"
                value={form.agent_address}
                onChange={(e) =>
                  setForm({ ...form, agent_address: e.target.value })
                }
                placeholder={isFr ? "ex. Tunis" : "e.g., Casablanca"}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {copy.startDate}
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
                {copy.endDate}
              </label>
              <Input
                type="date"
                value={form.agent_end_date}
                onChange={(e) =>
                  setForm({ ...form, agent_end_date: e.target.value })
                }
                disabled={form.agent_status === "Actif"}
                placeholder={form.agent_status === "Actif" ? copy.workingStill : ""}
              />
              {form.agent_status === "Actif" && (
                <p className="mt-2 text-xs text-gray-500">{copy.workingStill}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {copy.position}
              </label>
              <Input
                type="text"
                value={form.agent_position}
                onChange={(e) =>
                  setForm({ ...form, agent_position: e.target.value })
                }
                placeholder={isFr ? "ex. Pharmacien" : "e.g., Pharmacist"}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {copy.salary}
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
                {copy.cin} <span className="text-red-600">*</span>
              </label>
              <Input
                type="text"
                value={form.agent_cin}
                onChange={(e) =>
                  setForm({ ...form, agent_cin: e.target.value })
                }
                placeholder={isFr ? "ex. AA123456" : "e.g., AA123456"}
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
            {submitting ? copy.saving : copy.creating}
          </Button>
        </div>
      </form>

      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold mb-4">{copy.listTitle}</h2>
          <Input
            type="search"
            placeholder={copy.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full max-w-md"
          />
        </div>

        {loadingAgents ? (
          <div className="p-8 text-center text-gray-500">{copy.loading}</div>
        ) : agents.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {copy.empty}
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
                      {copy.nameCol}
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">
                      Situation
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">
                      {copy.contact}
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">
                      {copy.dates}
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">
                      {copy.role}
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">
                      {copy.status}
                    </th>
                    <th className="px-6 py-3 text-right font-semibold text-gray-700">
                      {copy.actions}
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
                              ? copy.workingStill
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
                          <Button
                            onClick={() => loadAgentIntoForm(agent.agent_id)}
                            size="sm"
                            variant="outline"
                            className="rounded-xl min-w-[82px]"
                            title={copy.edit}
                            type="button"
                          >
                            {copy.edit}
                          </Button>
                          <Button
                            onClick={() => setDeleteTarget(agent)}
                            size="sm"
                            variant="destructive"
                            className="rounded-xl min-w-[82px]"
                            title={copy.remove}
                            type="button"
                          >
                            {copy.remove}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination && pagination.totalPages > 1 && (
              <div className="p-4 border-t border-gray-200">
                <Pagination
                  currentPage={pagination.page}
                  totalPages={pagination.totalPages}
                  pageSize={pagination.pageSize}
                  onPrevious={() => loadAgents(Math.max(1, pagination.page - 1), searchQuery)}
                  onNext={() =>
                    loadAgents(Math.min(pagination.totalPages, pagination.page + 1), searchQuery)
                  }
                />
              </div>
            )}
          </>
        )}
      </div>

      {isEditModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold">{copy.editAgent}</h3>
              <button
                type="button"
                onClick={handleClear}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                {copy.cancel}
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {copy.agentName} <span className="text-red-600">*</span>
                  </label>
                  <Input
                    type="text"
                    value={form.agent_name}
                    onChange={(e) => setForm({ ...form, agent_name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {copy.situation}
                  </label>
                  <Input
                    type="text"
                    value={form.agent_situation}
                    onChange={(e) => setForm({ ...form, agent_situation: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {copy.status} <span className="text-red-600">*</span>
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {copy.phone} <span className="text-red-600">*</span>
                  </label>
                  <Input
                    type="text"
                    value={form.agent_phone_number}
                    onChange={(e) => setForm({ ...form, agent_phone_number: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {copy.email}
                  </label>
                  <Input
                    type="email"
                    value={form.agent_email}
                    onChange={(e) => setForm({ ...form, agent_email: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {copy.address} <span className="text-red-600">*</span>
                  </label>
                  <Input
                    type="text"
                    value={form.agent_address}
                    onChange={(e) => setForm({ ...form, agent_address: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {copy.startDate}
                  </label>
                  <Input
                    type="date"
                    value={form.agent_start_date}
                    onChange={(e) => setForm({ ...form, agent_start_date: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {copy.endDate}
                  </label>
                  <Input
                    type="date"
                    value={form.agent_end_date}
                    onChange={(e) => setForm({ ...form, agent_end_date: e.target.value })}
                    disabled={form.agent_status === "Actif"}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {copy.position}
                  </label>
                  <Input
                    type="text"
                    value={form.agent_position}
                    onChange={(e) => setForm({ ...form, agent_position: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {copy.salary}
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.agent_salary}
                    onChange={(e) => setForm({ ...form, agent_salary: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {copy.cin} <span className="text-red-600">*</span>
                  </label>
                  <Input
                    type="text"
                    value={form.agent_cin}
                    onChange={(e) => setForm({ ...form, agent_cin: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t pt-4">
                <Button type="button" variant="outline" onClick={handleClear}>
                  {copy.cancel}
                </Button>
                <Button
                  type="submit"
                  disabled={!canSubmit || submitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {submitting ? copy.saving : copy.updateAgent}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold">{copy.deleteAgentTitle}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {copy.deleteAgentBody}
            </p>
            <p className="mt-2 text-sm">
              <span className="font-medium">Name:</span> {deleteTarget.agent_name || "-"}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteTarget(null)}
                disabled={submitting}
              >
                {copy.cancel}
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => handleDelete(deleteTarget.agent_id)}
                disabled={submitting}
              >
                {submitting ? copy.deleting : copy.remove}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
