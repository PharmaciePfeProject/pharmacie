import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CalendarDays, CheckCircle2, Clock3, Download, FileSpreadsheet, FileText, FileType2, PencilLine, Plus, Search, ShieldAlert, Trash2, X } from "lucide-react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import { appointmentsAPI } from "@/api/appointments";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/i18n/LanguageContext";
import { PERMISSIONS, hasPermission, hasRole, ROLES } from "@/lib/roles";

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

function formatDateTime(value, locale = "fr-FR") {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
}

function toDayKey(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildAppointmentDate(date, time) {
  if (!date) return "";
  return `${date}T${time || "00:00"}:00`;
}

function groupByDay(items) {
  return items.reduce((acc, item) => {
    const key = toDayKey(item.appointment_at);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function buildCalendarGrid(monthDate) {
  const firstDay = startOfMonth(monthDate);
  const firstWeekday = firstDay.getDay();
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - firstWeekday);

  const days = [];
  for (let i = 0; i < 42; i += 1) {
    const current = new Date(gridStart);
    current.setDate(gridStart.getDate() + i);
    days.push(current);
  }
  return days;
}

export default function DoctorAppointments() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isEnglish = language === "en";
  const locale = isEnglish ? "en-US" : "fr-FR";
  const statusLabels = {
    SCHEDULED: isEnglish ? "Scheduled" : "Planifie",
    RESCHEDULED: isEnglish ? "Rescheduled" : "Replanifie",
    COMPLETED: isEnglish ? "Completed" : "Termine",
    CANCELED: isEnglish ? "Canceled" : "Annule",
  };
  const isDoctor = useMemo(() => hasRole(user, ROLES.MEDECIN), [user]);
  const isSecretaryGeneral = useMemo(() => hasRole(user, ROLES.SECRETAIRE_GENERAL), [user]);
  const canManageAppointments = useMemo(
    () => hasPermission(user, PERMISSIONS.APPOINTMENTS_MANAGE) || hasRole(user, ROLES.SECRETAIRE_GENERAL) || hasRole(user, ROLES.ADMIN),
    [user]
  );
  const canViewBlocks = useMemo(() => hasRole(user, ROLES.MEDECIN) || hasRole(user, ROLES.SECRETAIRE_GENERAL) || hasRole(user, ROLES.ADMIN), [user]);
  const canEditBlocks = useMemo(() => hasRole(user, ROLES.MEDECIN) || hasRole(user, ROLES.ADMIN), [user]);
  const canRead = useMemo(
    () => canViewBlocks || canManageAppointments || hasPermission(user, PERMISSIONS.APPOINTMENTS_READ) || hasRole(user, ROLES.MEDECIN),
    [canManageAppointments, canViewBlocks, user]
  );

  const [resources, setResources] = useState({ agents: [], doctors: [], current_doctor_id: null });
  const [items, setItems] = useState([]);
  const [availabilityBlocks, setAvailabilityBlocks] = useState([]);
  const [rescheduleRequests, setRescheduleRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [agentFilter, setAgentFilter] = useState("ALL");
  const [doctorFilter, setDoctorFilter] = useState("ALL");
  const [form, setForm] = useState(emptyForm);
  const [editAppointmentId, setEditAppointmentId] = useState(null);
  const [editAppointmentForm, setEditAppointmentForm] = useState(emptyForm);
  const [blockForm, setBlockForm] = useState({
    doctor_id: "",
    start_date: "",
    start_time: "15:00",
    end_date: "",
    end_time: "18:00",
    reason: "",
  });
  const [requestForm, setRequestForm] = useState({
    appointment_id: "",
    suggested_date: "",
    suggested_time: "09:00",
    reason: "",
  });
  const [requestingAppointmentId, setRequestingAppointmentId] = useState(null);
  const [blockToDelete, setBlockToDelete] = useState(null);
  const [deletingBlockId, setDeletingBlockId] = useState(null);
  const [blockToEdit, setBlockToEdit] = useState(null);
  const [editingBlockId, setEditingBlockId] = useState(null);
  const [editBlockForm, setEditBlockForm] = useState({
    doctor_id: "",
    start_date: "",
    start_time: "15:00",
    end_date: "",
    end_time: "18:00",
    reason: "",
  });
  const [exportDay, setExportDay] = useState("");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportingFormat, setExportingFormat] = useState(null);
  const calendarWrapperRef = useRef(null);
  const [appointmentToDelete, setAppointmentToDelete] = useState(null);
  const [deletingAppointmentId, setDeletingAppointmentId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      setError(null);
      const requestsPromise = appointmentsAPI.listRescheduleRequests();
      const blocksPromise = canViewBlocks ? appointmentsAPI.listBlocks() : Promise.resolve({ items: [] });
      const [resourcesRes, appointmentsRes, blocksRes, requestsRes] = await Promise.all([
        appointmentsAPI.getResources(),
        appointmentsAPI.list(),
        blocksPromise,
        requestsPromise,
      ]);

      setResources({
        current_doctor_id: resourcesRes.current_doctor_id ?? null,
        agents: resourcesRes.agents || [],
        doctors: resourcesRes.doctors || [],
      });
      setItems(appointmentsRes.items || []);
      setAvailabilityBlocks(blocksRes.items || []);
      setRescheduleRequests(requestsRes.items || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Impossible de charger les rendez-vous.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canRead) {
      load();
    }
  }, [canRead, canViewBlocks]);

  useEffect(() => {
    if (isDoctor && resources.current_doctor_id) {
      setBlockForm((current) => ({
        ...current,
        doctor_id: String(resources.current_doctor_id),
      }));
    }
  }, [isDoctor, resources.current_doctor_id]);

  const visibleItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesText = !normalized || [
        item.id,
        item.agent_name,
        item.doctor_name,
        item.status,
        item.notes,
        item.appointment_at,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalized);

      const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;
      const matchesDoctor = isDoctor || doctorFilter === "ALL" || String(item.doctor_id) === doctorFilter;
      const matchesAgent = agentFilter === "ALL" || String(item.agent_id) === agentFilter;

      return matchesText && matchesStatus && matchesDoctor && matchesAgent;
    });
  }, [agentFilter, doctorFilter, isDoctor, items, query, statusFilter]);

  const groupedItems = useMemo(() => groupByDay(visibleItems), [visibleItems]);
  const sortedDayKeys = useMemo(() => Object.keys(groupedItems).sort((a, b) => b.localeCompare(a)), [groupedItems]);
  const appointmentDaysSet = useMemo(() => new Set(visibleItems.map((item) => toDayKey(item.appointment_at))), [visibleItems]);
  const calendarDays = useMemo(() => buildCalendarGrid(calendarMonth), [calendarMonth]);

  useEffect(() => {
    if (!exportDay) return;
    const [year, month] = exportDay.split("-").map(Number);
    if (!year || !month) return;
    setCalendarMonth(new Date(year, month - 1, 1));
  }, [exportDay]);

  useEffect(() => {
    if (!isCalendarOpen) return;
    const onMouseDown = (event) => {
      if (!calendarWrapperRef.current) return;
      if (!calendarWrapperRef.current.contains(event.target)) {
        setIsCalendarOpen(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [isCalendarOpen]);

  const upcomingSoon = useMemo(() => {
    const now = Date.now();
    const limit = now + 24 * 60 * 60 * 1000;
    return visibleItems.filter((item) => {
      const value = new Date(item.appointment_at).getTime();
      return Number.isFinite(value) && value >= now && value <= limit && item.status !== "CANCELED";
    });
  }, [visibleItems]);

  const overdueItems = useMemo(() => {
    const now = Date.now();
    return visibleItems.filter((item) => {
      const value = new Date(item.appointment_at).getTime();
      return Number.isFinite(value) && value < now && item.status === "SCHEDULED";
    });
  }, [visibleItems]);

  const resetForm = () => {
    setForm(emptyForm);
  };

  const handleSubmit = async () => {
    if (!canManageAppointments) return;
    if (!form.agent_id || !form.doctor_id || !form.date) {
      setError("Agent, médecin et date sont obligatoires.");
      return;
    }

    setSaving(true);
    try {
      const selectedAgent = resources.agents.find((item) => String(item.agent_id) === String(form.agent_id));
      const selectedDoctor = resources.doctors.find((item) => String(item.doctor_id) === String(form.doctor_id));
      const payload = {
        agent_id: Number(form.agent_id),
        doctor_id: Number(form.doctor_id),
        agent_name: selectedAgent?.agent_name || null,
        doctor_name: selectedDoctor?.doctor_name || selectedDoctor?.name || null,
        appointment_at: buildAppointmentDate(form.date, form.time),
        status: form.status,
        notes: form.notes,
        date: form.date,
        time: form.time,
      };

      await appointmentsAPI.create(payload);

      resetForm();
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Echec de l'enregistrement du rendez-vous.");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item) => {
    if (!canManageAppointments) return;
    const appointmentDate = item.appointment_at ? new Date(item.appointment_at) : null;
    const date = appointmentDate && !Number.isNaN(appointmentDate.getTime()) ? appointmentDate.toISOString().slice(0, 10) : "";
    const time = appointmentDate && !Number.isNaN(appointmentDate.getTime()) ? appointmentDate.toISOString().slice(11, 16) : "";
    setEditAppointmentId(item.id);
    setEditAppointmentForm({
      agent_id: String(item.agent_id ?? ""),
      doctor_id: String(item.doctor_id ?? ""),
      date,
      time,
      notes: item.notes || "",
      status: item.status || "SCHEDULED",
    });
  };

  const handleUpdateAppointment = async () => {
    if (!canManageAppointments || !editAppointmentId) return;
    if (!editAppointmentForm.agent_id || !editAppointmentForm.doctor_id || !editAppointmentForm.date) {
      setError(isEnglish ? "Agent, doctor and date are required." : "Agent, medecin et date sont obligatoires.");
      return;
    }

    setSaving(true);
    try {
      const selectedAgent = resources.agents.find((item) => String(item.agent_id) === String(editAppointmentForm.agent_id));
      const selectedDoctor = resources.doctors.find((item) => String(item.doctor_id) === String(editAppointmentForm.doctor_id));
      const payload = {
        agent_id: Number(editAppointmentForm.agent_id),
        doctor_id: Number(editAppointmentForm.doctor_id),
        agent_name: selectedAgent?.agent_name || null,
        doctor_name: selectedDoctor?.doctor_name || selectedDoctor?.name || null,
        appointment_at: buildAppointmentDate(editAppointmentForm.date, editAppointmentForm.time),
        status: editAppointmentForm.status,
        notes: editAppointmentForm.notes,
        date: editAppointmentForm.date,
        time: editAppointmentForm.time,
      };
      await appointmentsAPI.update(editAppointmentId, payload);
      setEditAppointmentId(null);
      setEditAppointmentForm(emptyForm);
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || (isEnglish ? "Failed to update appointment." : "Echec de la modification du rendez-vous."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!canManageAppointments) return;
    try {
      setDeletingAppointmentId(id);
      await appointmentsAPI.remove(id);
      await load();
      setAppointmentToDelete(null);
    } catch (err) {
      setError(err?.response?.data?.message || (isEnglish ? "Delete failed." : "Echec de la suppression."));
    } finally {
      setDeletingAppointmentId(null);
    }
  };

  const handleSaveBlock = async () => {
    const targetDoctorId = isDoctor ? resources.current_doctor_id : Number(blockForm.doctor_id);
    if (!targetDoctorId || !blockForm.start_date || !blockForm.end_date) {
      setError("Médecin, date de début et date de fin sont obligatoires.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await appointmentsAPI.createBlock({
        doctor_id: targetDoctorId,
        start_at: `${blockForm.start_date} ${blockForm.start_time || "00:00"}`,
        end_at: `${blockForm.end_date} ${blockForm.end_time || "23:59"}`,
        reason: blockForm.reason,
      });
      setBlockForm((current) => ({
        ...current,
        start_date: "",
        end_date: "",
        reason: "",
      }));
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Impossible d'enregistrer l'indisponibilité.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBlock = async (id) => {
    try {
      setDeletingBlockId(id);
      await appointmentsAPI.removeBlock(id);
      await load();
      setBlockToDelete(null);
    } catch (err) {
      setError(err?.response?.data?.message || "Impossible de supprimer l'indisponibilité.");
    } finally {
      setDeletingBlockId(null);
    }
  };

  const openEditBlockModal = (block) => {
    const start = block.start_at ? new Date(block.start_at) : null;
    const end = block.end_at ? new Date(block.end_at) : null;
    const startValid = start && !Number.isNaN(start.getTime());
    const endValid = end && !Number.isNaN(end.getTime());
    setEditBlockForm({
      doctor_id: String(block.doctor_id || ""),
      start_date: startValid ? start.toISOString().slice(0, 10) : "",
      start_time: startValid ? start.toISOString().slice(11, 16) : "15:00",
      end_date: endValid ? end.toISOString().slice(0, 10) : "",
      end_time: endValid ? end.toISOString().slice(11, 16) : "18:00",
      reason: block.reason || "",
    });
    setBlockToEdit(block);
  };

  const handleUpdateBlock = async () => {
    if (!blockToEdit) return;
    if (!editBlockForm.start_date || !editBlockForm.end_date) {
      setError(isEnglish ? "Start and end dates are required." : "Les dates de debut et de fin sont obligatoires.");
      return;
    }
    try {
      setEditingBlockId(blockToEdit.id);
      setError(null);
      await appointmentsAPI.updateBlock(blockToEdit.id, {
        doctor_id: Number(editBlockForm.doctor_id || blockToEdit.doctor_id),
        start_at: `${editBlockForm.start_date} ${editBlockForm.start_time || "00:00"}`,
        end_at: `${editBlockForm.end_date} ${editBlockForm.end_time || "23:59"}`,
        reason: editBlockForm.reason || "",
      });
      await load();
      setBlockToEdit(null);
    } catch (err) {
      setError(err?.response?.data?.message || (isEnglish ? "Unable to update unavailability block." : "Impossible de modifier l'indisponibilite."));
    } finally {
      setEditingBlockId(null);
    }
  };

  const handleRequestReschedule = async (appointment) => {
    if (!appointment?.id) return;
    if (!requestForm.suggested_date) {
      setError("La date suggérée est obligatoire.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await appointmentsAPI.createRescheduleRequest(appointment.id, {
        suggested_date: requestForm.suggested_date,
        suggested_time: requestForm.suggested_time,
        reason: requestForm.reason || `Demande de report du rendez-vous #${appointment.id}`,
      });
      setRequestForm({
        appointment_id: "",
        suggested_date: "",
        suggested_time: "09:00",
        reason: "",
      });
      setRequestingAppointmentId(null);
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Impossible d'envoyer la demande de report.");
    } finally {
      setSaving(false);
    }
  };

  const alertCards = [
    { label: isEnglish ? "Appointments in 24h" : "Rendez-vous a 24h", value: upcomingSoon.length, tone: "bg-blue-50 text-blue-700", icon: Clock3 },
    { label: isEnglish ? "Overdue appointments" : "Rendez-vous en retard", value: overdueItems.length, tone: "bg-amber-50 text-amber-700", icon: AlertTriangle },
    { label: isEnglish ? "Visible appointments" : "Rendez-vous visibles", value: visibleItems.length, tone: "bg-emerald-50 text-emerald-700", icon: CalendarDays },
  ];

  const getSelectedDayAppointments = () => {
    if (!exportDay) {
      setError(isEnglish ? "Please select a day to export." : "Veuillez selectionner une date a exporter.");
      return null;
    }

    const selectedDayItems = visibleItems.filter((item) => toDayKey(item.appointment_at) === exportDay);
    if (selectedDayItems.length === 0) {
      setError(isEnglish ? "No appointments found for the selected day." : "Aucun rendez-vous trouve pour la date selectionnee.");
      return null;
    }
    return selectedDayItems;
  };

  const buildExportRows = (selectedDayItems) => selectedDayItems.map((item) => ({
    [isEnglish ? "Appointment ID" : "ID rendez-vous"]: item.id,
    [isEnglish ? "Agent" : "Agent"]: item.agent_name || item.agent_id || "",
    [isEnglish ? "Doctor" : "Medecin"]: item.doctor_name || item.doctor_id || "",
    [isEnglish ? "Date & Time" : "Date & heure"]: formatDateTime(item.appointment_at, locale),
    [isEnglish ? "Status" : "Statut"]: statusLabels[item.status] || item.status || "",
    [isEnglish ? "Notes" : "Notes"]: item.notes || "",
  }));

  const exportAsExcel = (selectedDayItems) => {
    const rows = buildExportRows(selectedDayItems);
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, isEnglish ? "Appointments" : "Rendez-vous");
    XLSX.writeFile(workbook, `appointments-${exportDay}.xlsx`);
  };

  const exportAsPdf = (selectedDayItems) => {
    const rows = buildExportRows(selectedDayItems);
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const title = isEnglish ? "Appointments export" : "Export des rendez-vous";
    const printedAt = new Date().toLocaleString(locale);
    const summaryHead = [[
      isEnglish ? "Selected day" : "Date selectionnee",
      isEnglish ? "Print date" : "Date impression",
      isEnglish ? "Total appointments" : "Total rendez-vous",
      isEnglish ? "Generated by" : "Genere par",
    ]];
    const summaryBody = [[
      exportDay,
      printedAt,
      String(selectedDayItems.length),
      user?.email || "-",
    ]];

    doc.setFillColor(22, 101, 52);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 92, "F");
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text(title, 40, 44);
    doc.setFontSize(15);
    doc.text(exportDay, 40, 68);
    doc.setFontSize(11);
    doc.setTextColor(220, 252, 231);
    doc.text(isEnglish ? "Detailed print-ready document" : "Document detaille pret a imprimer", 40, 86);

    doc.setTextColor(31, 41, 55);
    autoTable(doc, {
      startY: 114,
      head: summaryHead,
      body: summaryBody,
      theme: "grid",
      headStyles: { fillColor: [22, 101, 52], textColor: 255 },
      styles: { fontSize: 10, cellPadding: 6, halign: "center" },
      margin: { left: 40, right: 40 },
    });

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 16,
      head: [[isEnglish ? "Appointments of the day" : "Rendez-vous de la journee"]],
      body: [],
      theme: "grid",
      headStyles: { fillColor: [30, 41, 59], textColor: 255 },
      styles: { fontSize: 10, cellPadding: 6 },
      margin: { left: 40, right: 40 },
    });

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 2,
      head: [[
        isEnglish ? "Appointment ID" : "ID rendez-vous",
        isEnglish ? "Agent" : "Agent",
        isEnglish ? "Doctor" : "Medecin",
        isEnglish ? "Date & Time" : "Date & heure",
        isEnglish ? "Status" : "Statut",
        isEnglish ? "Notes" : "Notes",
      ]],
      body: rows.map((row) => Object.values(row)),
      theme: "grid",
      headStyles: { fillColor: [22, 101, 52], textColor: 255 },
      styles: { fontSize: 9, cellPadding: 5 },
      columnStyles: {
        0: { cellWidth: 74 },
        1: { cellWidth: 95 },
        2: { cellWidth: 95 },
        3: { cellWidth: 118 },
        4: { cellWidth: 74 },
        5: { cellWidth: "auto" },
      },
      margin: { left: 40, right: 40 },
    });
    doc.save(`appointments-${exportDay}.pdf`);
  };

  const exportAsDocx = async (selectedDayItems) => {
    const rows = buildExportRows(selectedDayItems);
    const header = Object.keys(rows[0]);
    const dataRows = rows.map((row) => Object.values(row));
    const tableRows = [
      new TableRow({
        children: header.map((text) => new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: String(text), bold: true })] })],
        })),
      }),
      ...dataRows.map((row) => new TableRow({
        children: row.map((cell) => new TableCell({
          children: [new Paragraph(String(cell ?? ""))],
        })),
      })),
    ];
    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({
            spacing: { after: 120 },
            children: [new TextRun({ text: isEnglish ? "Appointments Daily Report" : "Rapport quotidien des rendez-vous", bold: true, size: 32 })],
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [new TextRun({ text: isEnglish ? `Selected day: ${exportDay}` : `Date selectionnee: ${exportDay}`, size: 20 })],
          }),
          new Paragraph({
            spacing: { after: 220 },
            children: [new TextRun({ text: `${isEnglish ? "Total appointments" : "Total rendez-vous"}: ${selectedDayItems.length}`, size: 20 })],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: tableRows,
          }),
        ],
      }],
    });
    const blob = await Packer.toBlob(doc);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `appointments-${exportDay}.docx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const exportDayWithFormat = async (format) => {
    const selectedDayItems = getSelectedDayAppointments();
    if (!selectedDayItems) return;
    setExportingFormat(format);
    try {
      if (format === "excel") exportAsExcel(selectedDayItems);
      if (format === "pdf") exportAsPdf(selectedDayItems);
      if (format === "docx") await exportAsDocx(selectedDayItems);
      setIsExportModalOpen(false);
      setError(null);
    } finally {
      setExportingFormat(null);
    }
  };

  const openExportModal = () => {
    const selectedDayItems = getSelectedDayAppointments();
    if (!selectedDayItems) return;
    setIsExportModalOpen(true);
    setError(null);
  };

  const exportAppointmentsByDay = () => {
    openExportModal();
    setError(null);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <CalendarDays className="h-4 w-4" />
              {isSecretaryGeneral ? (isEnglish ? "Doctors unavailability" : "Indisponibilites des medecins") : canManageAppointments ? (isEnglish ? "General secretariat" : "Secretariat general") : (isEnglish ? "My appointments" : "Mes rendez-vous")}
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">
              {isSecretaryGeneral ? (isEnglish ? "Unavailability schedule" : "Temps d'indisponibilite") : canManageAppointments ? (isEnglish ? "Appointment management" : "Gestion des rendez-vous") : (isEnglish ? "Appointments overview" : "Consultation des rendez-vous")}
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              {isSecretaryGeneral
                ? (isEnglish
                  ? "Review doctors' blocked time slots from one workspace."
                  : "Consultez les plages horaires bloquees par les medecins, sans formulaire de creation de rendez-vous.")
                : canManageAppointments
                ? (isEnglish
                  ? "Organize appointments between agents and doctors, manage statuses, and monitor planning alerts."
                  : "Organisez les rendez-vous entre les agents et les medecins, pilotez les statuts et surveillez les alertes de planning.")
                : (isEnglish
                  ? "Review only your own scheduled appointments with the same calendar and useful filters."
                  : "Consultez uniquement vos propres rendez-vous planifies avec la meme vue calendrier et les filtres utiles.")}
            </p>
          </div>

            <div className="grid w-full gap-3 sm:grid-cols-2 xl:max-w-2xl xl:grid-cols-3">
              {alertCards.map(({ label, value, tone, icon: Icon }) => (
                <div key={label} className={`rounded-3xl border p-4 ${tone}`}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-medium uppercase tracking-[0.2em] opacity-80">{label}</p>
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="mt-4 text-3xl font-semibold">{value}</p>
                </div>
              ))}
            </div>
        </div>
      </section>

      {canViewBlocks ? (
        <section className="rounded-3xl border border-border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">{isEnglish ? "Unavailability" : "Indisponibilites"}</h2>
              <p className="text-sm text-muted-foreground">
                {isSecretaryGeneral
                  ? (isEnglish ? "Review doctors' unavailability time slots." : "Consultez les plages horaires d'indisponibilite des medecins.")
                  : (isEnglish ? "Block a time range during which no appointment can be scheduled." : "Bloquez une plage horaire pendant laquelle aucun rendez-vous ne peut etre programme.")}
              </p>
            </div>
          </div>

          {canEditBlocks ? (
            <>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {!isDoctor ? (
                  <div className="sm:col-span-2">
                    <label className="mb-2 block text-sm font-medium">{isEnglish ? "Doctor" : "Medecin"}</label>
                    <select value={blockForm.doctor_id} onChange={(event) => setBlockForm((current) => ({ ...current, doctor_id: event.target.value }))} className="h-11 w-full rounded-2xl border border-border bg-white px-3 text-sm">
                      <option value="">{isEnglish ? "Select a doctor" : "Selectionner un medecin"}</option>
                      {resources.doctors.map((doctor) => (
                        <option key={doctor.doctor_id} value={doctor.doctor_id}>
                          {doctor.doctor_name || doctor.name || (isEnglish ? `Doctor ${doctor.doctor_id}` : `Medecin ${doctor.doctor_id}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="sm:col-span-2 rounded-2xl border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                    {isEnglish ? "Your doctor profile will be used automatically." : "Votre profil medecin sera utilise automatiquement."}
                  </div>
                )}

                <div>
                  <label className="mb-2 block text-sm font-medium">{isEnglish ? "Start" : "Debut"}</label>
                  <Input type="date" value={blockForm.start_date} onChange={(event) => setBlockForm((current) => ({ ...current, start_date: event.target.value }))} />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">{isEnglish ? "Start time" : "Heure debut"}</label>
                  <Input type="time" value={blockForm.start_time} onChange={(event) => setBlockForm((current) => ({ ...current, start_time: event.target.value }))} />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">{isEnglish ? "End" : "Fin"}</label>
                  <Input type="date" value={blockForm.end_date} onChange={(event) => setBlockForm((current) => ({ ...current, end_date: event.target.value }))} />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">{isEnglish ? "End time" : "Heure fin"}</label>
                  <Input type="time" value={blockForm.end_time} onChange={(event) => setBlockForm((current) => ({ ...current, end_time: event.target.value }))} />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-medium">{isEnglish ? "Reason" : "Motif"}</label>
                  <textarea value={blockForm.reason} onChange={(event) => setBlockForm((current) => ({ ...current, reason: event.target.value }))} rows={3} className="w-full rounded-2xl border border-border bg-white px-3 py-2 text-sm" placeholder={isEnglish ? "Leave, meeting, field round, temporary unavailability..." : "Conge, reunion, tournee, indisponibilite ponctuelle..."} />
                </div>
              </div>

              <div className="mt-5 flex gap-3">
                <Button onClick={handleSaveBlock} disabled={saving}>{isEnglish ? "Block time range" : "Bloquer la plage"}</Button>
              </div>
            </>
          ) : null}

          <div className="mt-6 space-y-3">
            {availabilityBlocks.length === 0 ? (
              <div className="rounded-2xl border bg-muted/20 p-4 text-sm text-muted-foreground">{isEnglish ? "No unavailability blocks found." : "Aucune indisponibilite enregistree."}</div>
            ) : (
              availabilityBlocks.map((block) => (
                <div key={block.id} className="rounded-2xl border border-border bg-muted/10 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{isEnglish ? "Doctor" : "Medecin"} #{block.doctor_id}</p>
                      <p className="text-sm text-muted-foreground">{formatDateTime(block.start_at, locale)} - {formatDateTime(block.end_at, locale)}</p>
                      {block.reason ? <p className="mt-1 text-sm text-muted-foreground">{block.reason}</p> : null}
                    </div>
                    {canEditBlocks ? (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800"
                          onClick={() => openEditBlockModal(block)}
                        >
                          <PencilLine className="mr-1 h-4 w-4 opacity-80" />
                          {isEnglish ? "Edit" : "Modifier"}
                        </Button>
                        <Button
                          type="button"
                          className="bg-rose-600 text-white hover:bg-rose-700"
                          onClick={() => setBlockToDelete(block)}
                        >
                          <Trash2 className="mr-1 h-4 w-4 opacity-80" />
                          {isEnglish ? "Delete" : "Supprimer"}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>

        </section>
      ) : null}

      {canManageAppointments ? (
        <section className="rounded-3xl border border-border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">{isEnglish ? "Reschedule requests" : "Demandes de report"}</h2>
              <p className="text-sm text-muted-foreground">{isEnglish ? "Doctors can propose a new date and time for an appointment." : "Les medecins peuvent proposer une nouvelle date et une nouvelle heure pour un rendez-vous."}</p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {rescheduleRequests.length === 0 ? (
              <div className="rounded-2xl border bg-muted/20 p-4 text-sm text-muted-foreground">{isEnglish ? "No reschedule requests for now." : "Aucune demande de report pour le moment."}</div>
            ) : (
              rescheduleRequests.map((request) => (
                <div key={request.id} className="rounded-2xl border border-border bg-muted/10 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${request.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : request.status === 'REJECTED' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                          {request.status}
                        </span>
                        <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">{isEnglish ? "Appointment" : "RDV"} #{request.appointment_id}</span>
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground">{isEnglish ? "Proposal" : "Proposition"}: {formatDateTime(request.suggested_at, locale)}</p>
                      {request.reason ? <p className="mt-1 text-sm text-muted-foreground">{request.reason}</p> : null}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={async () => { try { await appointmentsAPI.decideRescheduleRequest(request.id, { status: 'REJECTED' }); await load(); } catch (err) { setError(err?.response?.data?.message || (isEnglish ? "Unable to reject request." : "Impossible de rejeter la demande.")); } }}>{isEnglish ? "Reject" : "Rejeter"}</Button>
                      <Button onClick={async () => { try { await appointmentsAPI.decideRescheduleRequest(request.id, { status: 'APPROVED' }); await load(); } catch (err) { setError(err?.response?.data?.message || (isEnglish ? "Unable to approve request." : "Impossible d'approuver la demande.")); } }}>{isEnglish ? "Approve" : "Approuver"}</Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      ) : null}

      <section className="rounded-3xl border border-border bg-white p-6 shadow-sm">
        <div className={`grid gap-4 ${isDoctor ? "xl:grid-cols-[1.6fr_0.8fr_0.8fr]" : "xl:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]"}`}>
          <div className="flex items-center gap-2 rounded-2xl border bg-muted/20 px-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={isEnglish ? "Search by agent, doctor, status or date" : "Rechercher par agent, medecin, statut ou date"} className="border-0 bg-transparent shadow-none focus-visible:ring-0" />
          </div>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-11 rounded-2xl border border-border bg-white px-3 text-sm">
            <option value="ALL">{isEnglish ? "All statuses" : "Tous les statuts"}</option>
            {Object.entries(statusLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          {!isDoctor ? (
            <select value={doctorFilter} onChange={(e) => setDoctorFilter(e.target.value)} className="h-11 rounded-2xl border border-border bg-white px-3 text-sm">
              <option value="ALL">{isEnglish ? "All doctors" : "Tous les medecins"}</option>
              {resources.doctors.map((doctor) => (
                <option key={doctor.doctor_id} value={doctor.doctor_id}>
                  {doctor.doctor_name || doctor.name || (isEnglish ? `Doctor ${doctor.doctor_id}` : `Medecin ${doctor.doctor_id}`)}
                </option>
              ))}
            </select>
          ) : null}

          <select value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)} className="h-11 rounded-2xl border border-border bg-white px-3 text-sm">
            <option value="ALL">{isEnglish ? "All agents" : "Tous les agents"}</option>
            {resources.agents.map((agent) => (
              <option key={agent.agent_id} value={agent.agent_id}>
                {agent.agent_name || `Agent ${agent.agent_id}`}
              </option>
            ))}
          </select>
        </div>
      </section>

      {isDoctor || isSecretaryGeneral ? (
        <section className="rounded-3xl border border-border bg-white p-6 shadow-sm">
          <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-900">{isEnglish ? "Export appointments by day" : "Exporter les rendez-vous par date"}</p>
                <p className="text-xs text-slate-600">
                  {isEnglish
                    ? "Choose one day, then export all visible appointments for that date."
                    : "Choisissez une date, puis exportez tous les rendez-vous visibles de cette journee."}
                </p>
              </div>
              <div ref={calendarWrapperRef} className="relative flex flex-col gap-2 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => setIsCalendarOpen((prev) => !prev)}
                  className="h-10 w-full rounded-xl border border-border bg-white px-3 text-left text-sm shadow-sm sm:w-[220px]"
                >
                  {exportDay || (isEnglish ? "Select date" : "Selectionner une date")}
                </button>
                <Button type="button" onClick={exportAppointmentsByDay} className="h-10 gap-2 bg-blue-600 text-white hover:bg-blue-700">
                  <Download className="h-4 w-4" />
                  {isEnglish ? "Export day" : "Exporter la date"}
                </Button>

                {isCalendarOpen ? (
                  <div className="absolute bottom-[calc(100%+0.5rem)] right-0 z-50 w-[260px] rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                    <div className="mb-2 flex items-center justify-between">
                      <button
                        type="button"
                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                        onClick={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                      >
                        {"<"}
                      </button>
                      <p className="text-xs font-semibold text-slate-900">
                        {calendarMonth.toLocaleDateString(locale, { month: "long", year: "numeric" })}
                      </p>
                      <button
                        type="button"
                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                        onClick={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                      >
                        {">"}
                      </button>
                    </div>

                    <div className="mb-1 grid grid-cols-7 text-center text-[10px] font-medium uppercase tracking-wide text-slate-500">
                      {(isEnglish ? ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] : ["Di", "Lu", "Ma", "Me", "Je", "Ve", "Sa"]).map((label) => (
                        <div key={label} className="py-1">{label}</div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-0.5">
                      {calendarDays.map((day) => {
                        const dayKey = toDayKey(day);
                        const inCurrentMonth = day.getMonth() === calendarMonth.getMonth();
                        const isSelected = exportDay === dayKey;
                        const hasAppointments = appointmentDaysSet.has(dayKey);

                        return (
                          <button
                            key={`${dayKey}-${day.getMonth()}`}
                            type="button"
                            onClick={() => {
                              setExportDay(dayKey);
                              setIsCalendarOpen(false);
                            }}
                            className={`relative h-7 rounded-md text-xs transition ${
                              isSelected
                                ? "bg-blue-600 text-white"
                                : inCurrentMonth
                                  ? "text-slate-900 hover:bg-slate-100"
                                  : "text-slate-400 hover:bg-slate-50"
                            }`}
                          >
                            {day.getDate()}
                            {hasAppointments ? (
                              <span className={`absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${isSelected ? "bg-white" : "bg-emerald-500"}`} />
                            ) : null}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-1.5 flex items-center justify-between border-t border-slate-100 pt-1.5">
                      <p className="text-[11px] text-slate-500">
                        {isEnglish ? "Green dot = has appointments" : "Point vert = rendez-vous disponibles"}
                      </p>
                      <button
                        type="button"
                        className="text-xs font-medium text-blue-700 hover:text-blue-800"
                        onClick={() => {
                          setExportDay("");
                          setIsCalendarOpen(false);
                        }}
                      >
                        {isEnglish ? "Clear" : "Effacer"}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {canManageAppointments ? (
        <section className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
          <div className="rounded-3xl border border-border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">{isEnglish ? "New appointment" : "Nouveau rendez-vous"}</h2>
                <p className="text-sm text-muted-foreground">{isEnglish ? "Select agent, doctor, date and time." : "Selectionnez l'agent, le medecin, la date et l'heure."}</p>
              </div>
              <Button variant="ghost" onClick={resetForm}>{isEnglish ? "Reset" : "Reinitialiser"}</Button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">Agent</label>
                <select value={form.agent_id} onChange={(e) => setForm((current) => ({ ...current, agent_id: e.target.value }))} className="h-11 w-full rounded-2xl border border-border bg-white px-3 text-sm">
                  <option value="">{isEnglish ? "Select an agent" : "Selectionner un agent"}</option>
                  {resources.agents.map((agent) => (
                    <option key={agent.agent_id} value={agent.agent_id}>
                      {agent.agent_name || `Agent ${agent.agent_id}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">{isEnglish ? "Doctor" : "Medecin"}</label>
                <select value={form.doctor_id} onChange={(e) => setForm((current) => ({ ...current, doctor_id: e.target.value }))} className="h-11 w-full rounded-2xl border border-border bg-white px-3 text-sm">
                  <option value="">{isEnglish ? "Select a doctor" : "Selectionner un medecin"}</option>
                  {resources.doctors.map((doctor) => (
                    <option key={doctor.doctor_id} value={doctor.doctor_id}>
                      {doctor.doctor_name || doctor.name || (isEnglish ? `Doctor ${doctor.doctor_id}` : `Medecin ${doctor.doctor_id}`)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Date</label>
                <Input type="date" value={form.date} onChange={(e) => setForm((current) => ({ ...current, date: e.target.value }))} />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">{isEnglish ? "Time" : "Heure"}</label>
                <Input type="time" value={form.time} onChange={(e) => setForm((current) => ({ ...current, time: e.target.value }))} />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">{isEnglish ? "Status" : "Statut"}</label>
                <select value={form.status} onChange={(e) => setForm((current) => ({ ...current, status: e.target.value }))} className="h-11 w-full rounded-2xl border border-border bg-white px-3 text-sm">
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))} rows={4} className="w-full rounded-2xl border border-border bg-white px-3 py-2 text-sm" placeholder={isEnglish ? "Appointment purpose, room, reminder, comments..." : "Objet du rendez-vous, salle, rappel, commentaires..."} />
              </div>
            </div>

            {error ? <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={handleSubmit} disabled={saving} className="gap-2">
                <Plus className="h-4 w-4" />
                {saving ? (isEnglish ? "Saving..." : "Enregistrement...") : (isEnglish ? "Create" : "Creer")}
              </Button>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">{isEnglish ? "Appointments calendar" : "Calendrier des rendez-vous"}</h2>
                <p className="text-sm text-muted-foreground">{isEnglish ? "Daily view with status badges and quick actions." : "Vue par jour avec badges de statut et actions rapides."}</p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {loading ? (
                <div className="rounded-2xl border bg-muted/20 p-6 text-sm text-muted-foreground">{isEnglish ? "Loading..." : "Chargement..."}</div>
              ) : sortedDayKeys.length === 0 ? (
                <div className="rounded-2xl border bg-muted/20 p-6 text-sm text-muted-foreground">{isEnglish ? "No appointments for now." : "Aucun rendez-vous pour le moment."}</div>
              ) : (
                sortedDayKeys.map((dayKey) => (
                  <div key={dayKey} className="rounded-3xl border border-border bg-muted/10 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold">{dayKey || (isEnglish ? "No date" : "Sans date")}</h3>
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{groupedItems[dayKey].length} {isEnglish ? "appointments" : "rdv"}</span>
                    </div>

                    <div className="mt-4 space-y-3">
                      {groupedItems[dayKey].map((item) => (
                        <article key={item.id} className="rounded-3xl border border-border bg-white p-4 shadow-sm">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone[item.status] || "bg-slate-100 text-slate-700"}`}>
                                  {statusLabels[item.status] || item.status || (isEnglish ? "Unknown" : "Inconnu")}
                                </span>
                                <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">#{item.id}</span>
                              </div>
                              <p className="text-sm text-muted-foreground">Médecin: {item.doctor_name || item.doctor_id}</p>
                              <p className="font-medium">{isEnglish ? "Agent" : "Agent"}: {item.agent_name || item.agent_id}</p>
                              <p className="text-sm text-muted-foreground">{isEnglish ? "Doctor" : "Medecin"}: {item.doctor_name || item.doctor_id}</p>
                              <p className="text-sm text-muted-foreground">{formatDateTime(item.appointment_at, locale)}</p>
                            </div>

                            <div className="flex gap-2 lg:flex-col">
                              <Button variant="outline" onClick={() => startEdit(item)} className="gap-2 border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800">
                                <PencilLine className="h-4 w-4" />
                                {isEnglish ? "Edit" : "Modifier"}
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setExportDay(toDayKey(item.appointment_at));
                                  setIsExportModalOpen(true);
                                }}
                                className="gap-2 border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800"
                              >
                                <Download className="h-4 w-4" />
                                {isEnglish ? "Export" : "Exporter"}
                              </Button>
                              <Button variant="destructive" onClick={() => setAppointmentToDelete(item)} className="gap-2 bg-rose-600 text-white hover:bg-rose-700">
                                <Trash2 className="h-4 w-4" />
                                {isEnglish ? "Delete" : "Supprimer"}
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
      ) : (
        <section className="rounded-3xl border border-border bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-700">
            <ShieldAlert className="h-4 w-4" />
            {isEnglish ? "Read-only view for doctors." : "Vue en lecture seule pour les medecins."}
          </div>

          {loading ? (
            <div className="rounded-2xl border bg-muted/20 p-6 text-sm text-muted-foreground">Chargement...</div>
          ) : sortedDayKeys.length === 0 ? (
            <div className="rounded-2xl border bg-muted/20 p-6 text-sm text-muted-foreground">{isEnglish ? "No appointments to display." : "Aucun rendez-vous a afficher."}</div>
          ) : (
            <div className="space-y-4">
              {sortedDayKeys.map((dayKey) => (
                <div key={dayKey} className="rounded-3xl border border-border bg-muted/10 p-4">
                  <h3 className="font-semibold">{dayKey || (isEnglish ? "No date" : "Sans date")}</h3>
                  <div className="mt-4 space-y-3">
                    {groupedItems[dayKey].map((item) => (
                      <article key={item.id} className="rounded-3xl border border-border bg-white p-4 shadow-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone[item.status] || "bg-slate-100 text-slate-700"}`}>
                            {statusLabels[item.status] || item.status || (isEnglish ? "Unknown" : "Inconnu")}
                          </span>
                          <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">#{item.id}</span>
                        </div>
                        <p className="mt-3 font-medium">{isEnglish ? "Agent" : "Agent"}: {item.agent_name || item.agent_id}</p>
                        <p className="text-sm text-muted-foreground">{formatDateTime(item.appointment_at, locale)}</p>
                        {item.notes ? <p className="mt-2 text-sm text-muted-foreground">{item.notes}</p> : null}
                        {isDoctor || isSecretaryGeneral ? (
                          <div className="mt-4 space-y-3 rounded-2xl border border-border bg-slate-50 p-4">
                            {requestingAppointmentId === item.id ? (
                              <div className="space-y-3">
                                <p className="text-sm font-medium text-slate-900">{isEnglish ? "Request reschedule" : "Demander un report"}</p>
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <Input type="date" value={requestForm.suggested_date} onChange={(event) => setRequestForm((current) => ({ ...current, suggested_date: event.target.value }))} />
                                  <Input type="time" value={requestForm.suggested_time} onChange={(event) => setRequestForm((current) => ({ ...current, suggested_time: event.target.value }))} />
                                </div>
                                <textarea value={requestForm.reason} onChange={(event) => setRequestForm((current) => ({ ...current, reason: event.target.value }))} rows={3} className="w-full rounded-2xl border border-border bg-white px-3 py-2 text-sm" placeholder={isEnglish ? "Explain why you need to reschedule" : "Expliquez la raison du report"} />
                                <div className="flex gap-2">
                                  <Button onClick={() => handleRequestReschedule(item)} disabled={saving}>{isEnglish ? "Send" : "Envoyer"}</Button>
                                  <Button variant="outline" onClick={() => setRequestingAppointmentId(null)}>{isEnglish ? "Cancel" : "Annuler"}</Button>
                                </div>
                              </div>
                            ) : (
                              <Button variant="outline" onClick={() => {
                                setRequestingAppointmentId(item.id);
                                const dt = item.appointment_at ? new Date(item.appointment_at) : null;
                                setRequestForm({
                                  appointment_id: String(item.id),
                                  suggested_date: dt && !Number.isNaN(dt.getTime()) ? new Date(dt.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10) : "",
                                  suggested_time: dt && !Number.isNaN(dt.getTime()) ? dt.toISOString().slice(11, 16) : "09:00",
                                  reason: "",
                                });
                              }}>
                                {isEnglish ? "Request reschedule" : "Demander un report"}
                              </Button>
                            )}
                          </div>
                        ) : null}
                      </article>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {blockToDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-rose-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-rose-100 px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-900">{isEnglish ? "Delete unavailability block" : "Supprimer l'indisponibilite"}</h3>
              <button type="button" className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700" onClick={() => setBlockToDelete(null)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-slate-700">
                {isEnglish
                  ? "Do you want to delete this blocked time range?"
                  : "Voulez-vous supprimer cette plage d'indisponibilite ?"}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                {formatDateTime(blockToDelete.start_at, locale)} - {formatDateTime(blockToDelete.end_at, locale)}
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
              <Button type="button" variant="outline" onClick={() => setBlockToDelete(null)}>
                {isEnglish ? "Cancel" : "Annuler"}
              </Button>
              <Button type="button" className="bg-rose-600 text-white hover:bg-rose-700" onClick={() => handleDeleteBlock(blockToDelete.id)} disabled={deletingBlockId !== null}>
                <Trash2 className="mr-1 h-4 w-4 opacity-80" />
                {deletingBlockId ? (isEnglish ? "Deleting..." : "Suppression...") : (isEnglish ? "Delete" : "Supprimer")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {blockToEdit ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/45 p-4 backdrop-blur-sm">
          <div className="mx-auto w-full max-w-2xl rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-900">{isEnglish ? "Edit blocked time range" : "Modifier la plage bloquee"}</h3>
              <button type="button" className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700" onClick={() => setBlockToEdit(null)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">{isEnglish ? "Start date" : "Date debut"}</label>
                <Input type="date" value={editBlockForm.start_date} onChange={(event) => setEditBlockForm((current) => ({ ...current, start_date: event.target.value }))} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">{isEnglish ? "Start time" : "Heure debut"}</label>
                <Input type="time" value={editBlockForm.start_time} onChange={(event) => setEditBlockForm((current) => ({ ...current, start_time: event.target.value }))} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">{isEnglish ? "End date" : "Date fin"}</label>
                <Input type="date" value={editBlockForm.end_date} onChange={(event) => setEditBlockForm((current) => ({ ...current, end_date: event.target.value }))} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">{isEnglish ? "End time" : "Heure fin"}</label>
                <Input type="time" value={editBlockForm.end_time} onChange={(event) => setEditBlockForm((current) => ({ ...current, end_time: event.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium">{isEnglish ? "Reason" : "Motif"}</label>
                <textarea value={editBlockForm.reason} onChange={(event) => setEditBlockForm((current) => ({ ...current, reason: event.target.value }))} rows={3} className="w-full rounded-2xl border border-border bg-white px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
              <Button type="button" variant="outline" onClick={() => setBlockToEdit(null)}>
                {isEnglish ? "Cancel" : "Annuler"}
              </Button>
              <Button type="button" className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={handleUpdateBlock} disabled={editingBlockId !== null}>
                <PencilLine className="mr-1 h-4 w-4 opacity-80" />
                {editingBlockId ? (isEnglish ? "Saving..." : "Enregistrement...") : (isEnglish ? "Save changes" : "Enregistrer")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {editAppointmentId ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/45 p-4 backdrop-blur-sm">
          <div className="mx-auto w-full max-w-2xl rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-900">{isEnglish ? "Edit appointment" : "Modifier le rendez-vous"}</h3>
              <button type="button" className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700" onClick={() => setEditAppointmentId(null)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">{isEnglish ? "Agent" : "Agent"}</label>
                <select value={editAppointmentForm.agent_id} onChange={(e) => setEditAppointmentForm((current) => ({ ...current, agent_id: e.target.value }))} className="h-11 w-full rounded-2xl border border-border bg-white px-3 text-sm">
                  <option value="">{isEnglish ? "Select an agent" : "Selectionner un agent"}</option>
                  {resources.agents.map((agent) => (
                    <option key={agent.agent_id} value={agent.agent_id}>
                      {agent.agent_name || `Agent ${agent.agent_id}`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">{isEnglish ? "Doctor" : "Medecin"}</label>
                <select value={editAppointmentForm.doctor_id} onChange={(e) => setEditAppointmentForm((current) => ({ ...current, doctor_id: e.target.value }))} className="h-11 w-full rounded-2xl border border-border bg-white px-3 text-sm">
                  <option value="">{isEnglish ? "Select a doctor" : "Selectionner un medecin"}</option>
                  {resources.doctors.map((doctor) => (
                    <option key={doctor.doctor_id} value={doctor.doctor_id}>
                      {doctor.doctor_name || doctor.name || (isEnglish ? `Doctor ${doctor.doctor_id}` : `Medecin ${doctor.doctor_id}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Date</label>
                <Input type="date" value={editAppointmentForm.date} onChange={(e) => setEditAppointmentForm((current) => ({ ...current, date: e.target.value }))} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">{isEnglish ? "Time" : "Heure"}</label>
                <Input type="time" value={editAppointmentForm.time} onChange={(e) => setEditAppointmentForm((current) => ({ ...current, time: e.target.value }))} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">{isEnglish ? "Status" : "Statut"}</label>
                <select value={editAppointmentForm.status} onChange={(e) => setEditAppointmentForm((current) => ({ ...current, status: e.target.value }))} className="h-11 w-full rounded-2xl border border-border bg-white px-3 text-sm">
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium">Notes</label>
                <textarea value={editAppointmentForm.notes} onChange={(e) => setEditAppointmentForm((current) => ({ ...current, notes: e.target.value }))} rows={4} className="w-full rounded-2xl border border-border bg-white px-3 py-2 text-sm" placeholder={isEnglish ? "Appointment purpose, room, reminder, comments..." : "Objet du rendez-vous, salle, rappel, commentaires..."} />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
              <Button type="button" variant="outline" onClick={() => setEditAppointmentId(null)}>
                {isEnglish ? "Cancel" : "Annuler"}
              </Button>
              <Button type="button" className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={handleUpdateAppointment} disabled={saving}>
                <PencilLine className="mr-1 h-4 w-4 opacity-80" />
                {saving ? (isEnglish ? "Saving..." : "Enregistrement...") : (isEnglish ? "Save changes" : "Enregistrer")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {appointmentToDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-rose-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-rose-100 px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-900">{isEnglish ? "Delete appointment" : "Supprimer le rendez-vous"}</h3>
              <button type="button" className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700" onClick={() => setAppointmentToDelete(null)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-slate-700">{isEnglish ? "Do you really want to delete this appointment?" : "Voulez-vous vraiment supprimer ce rendez-vous ?"}</p>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
              <Button type="button" variant="outline" onClick={() => setAppointmentToDelete(null)}>{isEnglish ? "Cancel" : "Annuler"}</Button>
              <Button type="button" className="bg-rose-600 text-white hover:bg-rose-700" onClick={() => handleDelete(appointmentToDelete.id)} disabled={deletingAppointmentId !== null}>
                <Trash2 className="mr-2 h-4 w-4" />
                {deletingAppointmentId ? (isEnglish ? "Deleting..." : "Suppression...") : (isEnglish ? "Delete" : "Supprimer")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {isExportModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{isEnglish ? "Export appointments by day" : "Exporter les rendez-vous par date"}</h3>
                <p className="mt-1 text-sm text-slate-500">{isEnglish ? `Selected day: ${exportDay}` : `Date selectionnee: ${exportDay}`}</p>
              </div>
              <button type="button" className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700" onClick={() => setIsExportModalOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid gap-3 px-6 py-5 sm:grid-cols-3">
              <button type="button" onClick={() => exportDayWithFormat("pdf")} disabled={exportingFormat !== null} className="group rounded-2xl border border-rose-200 bg-rose-50 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70">
                <div className="flex items-center justify-between">
                  <FileText className="h-6 w-6 text-rose-600" />
                  <span className="rounded-full bg-rose-600/10 px-2 py-0.5 text-xs font-semibold text-rose-700">PDF</span>
                </div>
                <p className="mt-3 font-semibold text-rose-700">{isEnglish ? "PDF document" : "Document PDF"}</p>
                <p className="mt-1 text-xs text-rose-700/80">{isEnglish ? "Clean report-style layout." : "Mise en page propre pour partage."}</p>
              </button>

              <button type="button" onClick={() => exportDayWithFormat("docx")} disabled={exportingFormat !== null} className="group rounded-2xl border border-blue-200 bg-blue-50 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70">
                <div className="flex items-center justify-between">
                  <FileType2 className="h-6 w-6 text-blue-700" />
                  <span className="rounded-full bg-blue-700/10 px-2 py-0.5 text-xs font-semibold text-blue-700">DOCX</span>
                </div>
                <p className="mt-3 font-semibold text-blue-700">{isEnglish ? "Word document" : "Document Word"}</p>
                <p className="mt-1 text-xs text-blue-700/80">{isEnglish ? "Editable DOCX export." : "Fichier DOCX modifiable."}</p>
              </button>

              <button type="button" onClick={() => exportDayWithFormat("excel")} disabled={exportingFormat !== null} className="group rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70">
                <div className="flex items-center justify-between">
                  <FileSpreadsheet className="h-6 w-6 text-emerald-700" />
                  <span className="rounded-full bg-emerald-700/10 px-2 py-0.5 text-xs font-semibold text-emerald-700">XLSX</span>
                </div>
                <p className="mt-3 font-semibold text-emerald-700">{isEnglish ? "Excel workbook" : "Classeur Excel"}</p>
                <p className="mt-1 text-xs text-emerald-700/80">{isEnglish ? "Structured XLSX data." : "Donnees structurees XLSX."}</p>
              </button>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
              <p className="text-xs text-slate-500">{isEnglish ? "Tip: choose PDF for sharing, DOCX for editing, Excel for analysis." : "Conseil: PDF pour partage, DOCX pour edition, Excel pour analyse."}</p>
              <Button type="button" variant="outline" onClick={() => setIsExportModalOpen(false)}>
                {isEnglish ? "Cancel" : "Annuler"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}







