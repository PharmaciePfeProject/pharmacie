import { useEffect, useMemo, useState } from "react";
import { CalendarDays, PencilLine, Plus, Search, Trash2 } from "lucide-react";
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import { appointmentsAPI } from "@/api/appointments";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/i18n/LanguageContext";
import { PERMISSIONS, ROLES, hasPermission, hasRole } from "@/lib/roles";

const emptyForm = {
  agent_id: "",
  doctor_id: "",
  date: "",
  time: "",
  notes: "",
  status: "SCHEDULED",
};

const statusTone = {
  SCHEDULED: "bg-blue-100 text-blue-700",
  RESCHEDULED: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELED: "bg-rose-100 text-rose-700",
};

const csvEscape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

function formatDateTime(value, locale) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
}

function buildAppointmentDate(date, time) {
  if (!date) return "";
  return `${date}T${time || "00:00"}:00`;
}

function toDayKey(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toISOString().slice(0, 10);
}

export default function DoctorAppointments() {
  const { user } = useAuth();
  const { language } = useLanguage();

  const isFr = language === "fr";
  const locale = isFr ? "fr-FR" : "en-US";
  const t = useMemo(
    () => ({
      pageTitle: isFr ? "Rendez-vous" : "Appointments",
      pageSubtitle: isFr
        ? "Planifiez les rencontres entre agents et medecins depuis un espace secretaire dedie."
        : "Schedule meetings between agents and doctors from a dedicated secretary workspace.",
      newAppointment: isFr ? "Nouveau rendez-vous" : "New appointment",
      calendar: isFr ? "Calendrier des rendez-vous" : "Appointments calendar",
      search: isFr ? "Rechercher" : "Search",
      searchPlaceholder: isFr
        ? "Rechercher par agent, medecin, statut ou date"
        : "Search by agent, doctor, status, or date",
      allStatuses: isFr ? "Tous les statuts" : "All statuses",
      allDoctors: isFr ? "Tous les medecins" : "All doctors",
      allAgents: isFr ? "Tous les agents" : "All agents",
      agent: isFr ? "Agent" : "Agent",
      doctor: isFr ? "Medecin" : "Doctor",
      date: isFr ? "Date" : "Date",
      time: isFr ? "Heure" : "Time",
      status: isFr ? "Statut" : "Status",
      notes: isFr ? "Notes" : "Notes",
      create: isFr ? "Creer" : "Create",
      reset: isFr ? "Reinitialiser" : "Reset",
      loading: isFr ? "Chargement..." : "Loading...",
      noData: isFr ? "Aucun rendez-vous pour le moment." : "No appointments yet.",
      noDate: isFr ? "Sans date" : "No date",
      edit: isFr ? "Modifier" : "Edit",
      remove: isFr ? "Supprimer" : "Delete",
      cancel: isFr ? "Annuler" : "Cancel",
      export: isFr ? "Exporter" : "Export",
      exportTitle: isFr ? "Exporter le rendez-vous" : "Export appointment",
      exportBody: isFr ? "Choisissez le format d export." : "Choose export format.",
      deleteTitle: isFr ? "Supprimer le rendez-vous" : "Delete appointment",
      deleteBody: isFr
        ? "Voulez-vous vraiment supprimer ce rendez-vous ? Cette action est irreversible."
        : "Are you sure you want to delete this appointment? This action cannot be undone.",
      editTitle: isFr ? "Modifier le rendez-vous" : "Edit appointment",
      requiredError: isFr
        ? "Agent, medecin et date sont obligatoires."
        : "Agent, doctor, and date are required.",
      saveError: isFr ? "Echec de l enregistrement du rendez-vous." : "Failed to save appointment.",
      deleteError: isFr ? "Echec de la suppression." : "Failed to delete appointment.",
      save: isFr ? "Enregistrer" : "Save",
      field: isFr ? "Champ" : "Field",
      value: isFr ? "Valeur" : "Value",
      dayCount: isFr ? "rdv" : "appt",
    }),
    [isFr],
  );

  const statusLabels = useMemo(
    () => ({
      SCHEDULED: isFr ? "Planifie" : "Scheduled",
      RESCHEDULED: isFr ? "Replanifie" : "Rescheduled",
      COMPLETED: isFr ? "Termine" : "Completed",
      CANCELED: isFr ? "Annule" : "Canceled",
    }),
    [isFr],
  );

  const canManageAppointments = useMemo(
    () =>
      hasPermission(user, PERMISSIONS.APPOINTMENTS_MANAGE) ||
      hasRole(user, ROLES.SECRETAIRE_GENERAL) ||
      hasRole(user, ROLES.ADMIN),
    [user],
  );

  const [resources, setResources] = useState({ agents: [], doctors: [] });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [doctorFilter, setDoctorFilter] = useState("ALL");
  const [agentFilter, setAgentFilter] = useState("ALL");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [exportTarget, setExportTarget] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      setError(null);
      const [resourcesRes, appointmentsRes] = await Promise.all([
        appointmentsAPI.getResources(),
        appointmentsAPI.list(),
      ]);
      setResources({
        agents: resourcesRes.agents || [],
        doctors: resourcesRes.doctors || [],
      });
      setItems(appointmentsRes.items || []);
    } catch (err) {
      setError(err?.response?.data?.message || (isFr ? "Impossible de charger les rendez-vous." : "Failed to load appointments."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canManageAppointments) load();
  }, [canManageAppointments]);

  const visibleItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesText =
        !normalized ||
        [item.id, item.agent_name, item.doctor_name, item.status, item.notes, item.appointment_at]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalized);
      const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;
      const matchesDoctor = doctorFilter === "ALL" || String(item.doctor_id) === doctorFilter;
      const matchesAgent = agentFilter === "ALL" || String(item.agent_id) === agentFilter;
      return matchesText && matchesStatus && matchesDoctor && matchesAgent;
    });
  }, [agentFilter, doctorFilter, items, query, statusFilter]);

  const groupedItems = useMemo(() => {
    return visibleItems.reduce((acc, item) => {
      const key = toDayKey(item.appointment_at);
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  }, [visibleItems]);

  const sortedDayKeys = useMemo(
    () => Object.keys(groupedItems).sort((a, b) => b.localeCompare(a)),
    [groupedItems],
  );

  const resetForm = () => setForm(emptyForm);

  const buildPayload = (sourceForm) => {
    const selectedAgent = resources.agents.find((a) => String(a.agent_id) === String(sourceForm.agent_id));
    const selectedDoctor = resources.doctors.find((d) => String(d.doctor_id) === String(sourceForm.doctor_id));
    return {
      agent_id: Number(sourceForm.agent_id),
      doctor_id: Number(sourceForm.doctor_id),
      agent_name: selectedAgent?.agent_name || null,
      doctor_name: selectedDoctor?.doctor_name || selectedDoctor?.name || null,
      appointment_at: buildAppointmentDate(sourceForm.date, sourceForm.time),
      status: sourceForm.status,
      notes: sourceForm.notes,
      date: sourceForm.date,
      time: sourceForm.time,
    };
  };

  const createAppointment = async () => {
    if (!form.agent_id || !form.doctor_id || !form.date) {
      setError(t.requiredError);
      return;
    }
    setSaving(true);
    try {
      await appointmentsAPI.create(buildPayload(form));
      resetForm();
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || t.saveError);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (item) => {
    const appointmentDate = item.appointment_at ? new Date(item.appointment_at) : null;
    const date = appointmentDate && !Number.isNaN(appointmentDate.getTime()) ? appointmentDate.toISOString().slice(0, 10) : "";
    const time = appointmentDate && !Number.isNaN(appointmentDate.getTime()) ? appointmentDate.toISOString().slice(11, 16) : "";
    setEditingId(item.id);
    setForm({
      agent_id: String(item.agent_id ?? ""),
      doctor_id: String(item.doctor_id ?? ""),
      date,
      time,
      notes: item.notes || "",
      status: item.status || "SCHEDULED",
    });
    setEditModalOpen(true);
  };

  const updateAppointment = async () => {
    if (!editingId) return;
    if (!form.agent_id || !form.doctor_id || !form.date) {
      setError(t.requiredError);
      return;
    }
    setSaving(true);
    try {
      await appointmentsAPI.update(editingId, buildPayload(form));
      setEditModalOpen(false);
      setEditingId(null);
      resetForm();
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || t.saveError);
    } finally {
      setSaving(false);
    }
  };

  const deleteAppointment = async () => {
    if (!deleteTarget?.id) return;
    try {
      await appointmentsAPI.remove(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || t.deleteError);
    }
  };

  const exportAppointmentByFormat = async (format, item) => {
    if (!item) return;
    const rows = [
      [t.field, t.value],
      ["ID", String(item.id ?? "")],
      [t.agent, String(item.agent_name || item.agent_id || "")],
      [t.doctor, String(item.doctor_name || item.doctor_id || "")],
      [t.status, String(statusLabels[item.status] || item.status || "")],
      [t.date, formatDateTime(item.appointment_at, locale)],
      [t.notes, String(item.notes || "")],
    ];

    if (format === "excel") {
      const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `appointment-${item.id}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      return;
    }

    if (format === "word") {
      const tableRows = rows.map((row) =>
        new TableRow({
          children: row.map((cell) =>
            new TableCell({ children: [new Paragraph(String(cell ?? ""))] }),
          ),
        }),
      );
      const doc = new Document({
        sections: [
          {
            children: [
              new Paragraph({
                children: [new TextRun({ text: t.exportTitle, bold: true })],
              }),
              new Paragraph({ text: "" }),
              new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } }),
            ],
          },
        ],
      });
      const blob = await Packer.toBlob(doc);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `appointment-${item.id}-${new Date().toISOString().slice(0, 10)}.docx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      return;
    }

    const tableHtml = rows
      .map(
        (row, idx) =>
          `<tr>${row
            .map((cell) => `<${idx === 0 ? "th" : "td"} style="border:1px solid #cbd5e1;padding:8px;text-align:left;">${String(cell).replace(/</g, "&lt;")}</${idx === 0 ? "th" : "td"}>`)
            .join("")}</tr>`,
      )
      .join("");
    const html = `<html><head><meta charset="utf-8"/><title>${t.exportTitle}</title></head><body><h2>${t.exportTitle}</h2><table style="border-collapse:collapse;width:100%;">${tableHtml}</table><script>window.onload=()=>window.print();</script></body></html>`;
    const url = window.URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
    window.open(url, "_blank", "width=1000,height=800");
  };

  if (!canManageAppointments) {
    return null;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border bg-white p-6 shadow-sm">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
          <CalendarDays className="h-4 w-4" />
          {t.pageTitle}
        </div>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight">{t.pageTitle}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t.pageSubtitle}</p>
      </section>

      <section className="rounded-3xl border border-border bg-white p-6 shadow-sm">
        <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr_0.7fr_0.7fr]">
          <div className="flex items-center gap-2 rounded-2xl border bg-muted/20 px-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.searchPlaceholder} className="border-0 bg-transparent shadow-none focus-visible:ring-0" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-11 rounded-2xl border border-border bg-white px-3 text-sm">
            <option value="ALL">{t.allStatuses}</option>
            {Object.entries(statusLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <select value={doctorFilter} onChange={(e) => setDoctorFilter(e.target.value)} className="h-11 rounded-2xl border border-border bg-white px-3 text-sm">
            <option value="ALL">{t.allDoctors}</option>
            {resources.doctors.map((doctor) => (
              <option key={doctor.doctor_id} value={doctor.doctor_id}>{doctor.doctor_name || doctor.name || `${t.doctor} ${doctor.doctor_id}`}</option>
            ))}
          </select>
          <select value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)} className="h-11 rounded-2xl border border-border bg-white px-3 text-sm">
            <option value="ALL">{t.allAgents}</option>
            {resources.agents.map((agent) => (
              <option key={agent.agent_id} value={agent.agent_id}>{agent.agent_name || `${t.agent} ${agent.agent_id}`}</option>
            ))}
          </select>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <div className="rounded-3xl border border-border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">{t.newAppointment}</h2>
            </div>
            <Button variant="ghost" onClick={resetForm}>{t.reset}</Button>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">{t.agent}</label>
              <select value={form.agent_id} onChange={(e) => setForm((current) => ({ ...current, agent_id: e.target.value }))} className="h-11 w-full rounded-2xl border border-border bg-white px-3 text-sm">
                <option value="">{t.agent}</option>
                {resources.agents.map((agent) => (
                  <option key={agent.agent_id} value={agent.agent_id}>{agent.agent_name || `${t.agent} ${agent.agent_id}`}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">{t.doctor}</label>
              <select value={form.doctor_id} onChange={(e) => setForm((current) => ({ ...current, doctor_id: e.target.value }))} className="h-11 w-full rounded-2xl border border-border bg-white px-3 text-sm">
                <option value="">{t.doctor}</option>
                {resources.doctors.map((doctor) => (
                  <option key={doctor.doctor_id} value={doctor.doctor_id}>{doctor.doctor_name || doctor.name || `${t.doctor} ${doctor.doctor_id}`}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">{t.date}</label>
              <Input type="date" value={form.date} onChange={(e) => setForm((current) => ({ ...current, date: e.target.value }))} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">{t.time}</label>
              <Input type="time" value={form.time} onChange={(e) => setForm((current) => ({ ...current, time: e.target.value }))} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">{t.status}</label>
              <select value={form.status} onChange={(e) => setForm((current) => ({ ...current, status: e.target.value }))} className="h-11 w-full rounded-2xl border border-border bg-white px-3 text-sm">
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium">{t.notes}</label>
              <textarea value={form.notes} onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))} rows={4} className="w-full rounded-2xl border border-border bg-white px-3 py-2 text-sm" />
            </div>
          </div>

          {error ? <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={createAppointment} disabled={saving} className="gap-2">
              <Plus className="h-4 w-4" />
              {saving ? t.save : t.create}
            </Button>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">{t.calendar}</h2>
          </div>

          <div className="mt-5 space-y-4">
            {loading ? (
              <div className="rounded-2xl border bg-muted/20 p-6 text-sm text-muted-foreground">{t.loading}</div>
            ) : sortedDayKeys.length === 0 ? (
              <div className="rounded-2xl border bg-muted/20 p-6 text-sm text-muted-foreground">{t.noData}</div>
            ) : (
              sortedDayKeys.map((dayKey) => (
                <div key={dayKey} className="rounded-3xl border border-border bg-muted/10 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold">{dayKey || t.noDate}</h3>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{groupedItems[dayKey].length} {t.dayCount}</span>
                  </div>

                  <div className="mt-4 space-y-3">
                    {groupedItems[dayKey].map((item) => (
                      <article key={item.id} className="rounded-3xl border border-border bg-white p-4 shadow-sm">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone[item.status] || "bg-slate-100 text-slate-700"}`}>{statusLabels[item.status] || item.status}</span>
                              <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">#{item.id}</span>
                            </div>
                            <p className="font-medium">{t.agent}: {item.agent_name || item.agent_id}</p>
                            <p className="text-sm text-muted-foreground">{t.doctor}: {item.doctor_name || item.doctor_id}</p>
                            <p className="text-sm text-muted-foreground">{formatDateTime(item.appointment_at, locale)}</p>
                            {item.notes ? <p className="text-sm text-muted-foreground">{item.notes}</p> : null}
                          </div>

                          <div className="flex gap-2 lg:flex-col">
                            <Button variant="outline" onClick={() => openEdit(item)} className="gap-2">
                              <PencilLine className="h-4 w-4" />{t.edit}
                            </Button>
                            <Button
                              variant="outline"
                              className="border border-emerald-200 bg-emerald-600 text-white hover:bg-emerald-700"
                              onClick={() => setExportTarget(item)}
                            >
                              {t.export}
                            </Button>
                            <Button variant="destructive" onClick={() => setDeleteTarget(item)} className="gap-2">
                              <Trash2 className="h-4 w-4" />{t.remove}
                            </Button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {editModalOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-2xl border bg-white p-6 shadow-xl">
            <h3 className="text-xl font-semibold">{t.editTitle}</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">{t.agent}</label>
                <select value={form.agent_id} onChange={(e) => setForm((current) => ({ ...current, agent_id: e.target.value }))} className="h-11 w-full rounded-2xl border border-border bg-white px-3 text-sm">
                  <option value="">{t.agent}</option>
                  {resources.agents.map((agent) => (<option key={agent.agent_id} value={agent.agent_id}>{agent.agent_name || `${t.agent} ${agent.agent_id}`}</option>))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">{t.doctor}</label>
                <select value={form.doctor_id} onChange={(e) => setForm((current) => ({ ...current, doctor_id: e.target.value }))} className="h-11 w-full rounded-2xl border border-border bg-white px-3 text-sm">
                  <option value="">{t.doctor}</option>
                  {resources.doctors.map((doctor) => (<option key={doctor.doctor_id} value={doctor.doctor_id}>{doctor.doctor_name || doctor.name || `${t.doctor} ${doctor.doctor_id}`}</option>))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">{t.date}</label>
                <Input type="date" value={form.date} onChange={(e) => setForm((current) => ({ ...current, date: e.target.value }))} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">{t.time}</label>
                <Input type="time" value={form.time} onChange={(e) => setForm((current) => ({ ...current, time: e.target.value }))} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">{t.status}</label>
                <select value={form.status} onChange={(e) => setForm((current) => ({ ...current, status: e.target.value }))} className="h-11 w-full rounded-2xl border border-border bg-white px-3 text-sm">
                  {Object.entries(statusLabels).map(([value, label]) => (<option key={value} value={value}>{label}</option>))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium">{t.notes}</label>
                <textarea value={form.notes} onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))} rows={4} className="w-full rounded-2xl border border-border bg-white px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setEditModalOpen(false); setEditingId(null); resetForm(); }}>{t.cancel}</Button>
              <Button onClick={updateAppointment} disabled={saving}>{saving ? t.save : t.update}</Button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold">{t.deleteTitle}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{t.deleteBody}</p>
            <p className="mt-2 text-sm"><span className="font-medium">ID:</span> {deleteTarget.id}</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>{t.cancel}</Button>
              <Button variant="destructive" onClick={deleteAppointment}>{t.remove}</Button>
            </div>
          </div>
        </div>
      ) : null}

      {exportTarget ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border bg-white p-6 shadow-xl">
            <h3 className="text-xl font-semibold">{t.exportTitle}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{t.exportBody}</p>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Button type="button" className="border border-red-200 bg-red-600 text-white hover:bg-red-700" onClick={async () => { await exportAppointmentByFormat("pdf", exportTarget); setExportTarget(null); }}>PDF</Button>
              <Button type="button" className="border border-blue-200 bg-blue-600 text-white hover:bg-blue-700" onClick={async () => { await exportAppointmentByFormat("word", exportTarget); setExportTarget(null); }}>Word</Button>
              <Button type="button" className="border border-emerald-200 bg-emerald-600 text-white hover:bg-emerald-700" onClick={async () => { await exportAppointmentByFormat("excel", exportTarget); setExportTarget(null); }}>Excel</Button>
            </div>
            <div className="mt-5 flex justify-end">
              <Button type="button" variant="ghost" onClick={() => setExportTarget(null)}>{t.cancel}</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
