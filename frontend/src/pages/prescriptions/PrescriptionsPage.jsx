import { Fragment, useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import {
  createPrescription,
  decidePrescriptionApproval,
  fetchPatientCard,
  fetchPrescriptionById,
  fetchPendingPrescriptionApprovals,
  fetchPrescriptionAgents,
  fetchPrescriptionDoctors,
  fetchPrescriptionTypes,
  fetchPrescriptions,
} from "@/api/prescriptions";
import { fetchProducts } from "@/api/products";
import { fetchStock } from "@/api/stock";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/Pagination";
import { useLanguage } from "@/i18n/LanguageContext";
import { createDefaultPagination } from "@/lib/pagination";
import { PERMISSIONS, hasPermission } from "@/lib/roles";
const createLine = () => ({
    product_id: "",
    total_qt: "1",
    days: "",
    dist_number: "",
    is_periodic: "0",
    periodicity: "",
    posologie: "",
});
function normalizeCsvValue(value) {
    const text = String(value ?? "").replace(/"/g, '""');
    return `"${text}"`;
}
function getApprovalTone(status) {
  if (status === "APPROVED")
    return "bg-emerald-100 text-emerald-700";
  if (status === "REJECTED")
    return "bg-rose-100 text-rose-700";
  return "bg-amber-100 text-amber-700";
}
function PickerField({ value, onChange, options, placeholder, disabled = false, searchPlaceholder, compact = false, }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const selected = options.find((option) => option.value === value) || null;
    const filtered = useMemo(() => {
        const normalized = query.trim().toLowerCase();
        if (!normalized)
            return options.slice(0, 10);
        return options
            .filter((option) => [option.value, option.label, option.description]
            .filter(Boolean)
            .some((entry) => entry.toLowerCase().includes(normalized)))
            .slice(0, 10);
    }, [options, query]);
    const handleSelect = (nextValue) => {
        onChange(nextValue);
        setOpen(false);
        setQuery("");
    };
    return (<div className="relative">
      <button type="button" disabled={disabled} onClick={() => {
            if (disabled)
                return;
            setOpen((current) => !current);
        }} className={`flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 text-left shadow-sm transition hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-muted/30 ${compact ? "h-10" : "min-h-[56px] py-2"}`}>
        <div className="min-w-0">
          {selected ? (<div className="min-w-0">
              {compact ? (<div className="truncate text-sm text-slate-900">
                  <span className="font-medium">{selected.displayLabel || selected.value}</span>
                  {selected.displayMeta ? <span className="ml-2 text-muted-foreground">{selected.displayMeta}</span> : selected.label && selected.label !== selected.value ? (<span className="ml-2 text-muted-foreground">{selected.label}</span>) : null}
                </div>) : (<>
                  <div className="truncate text-sm font-medium text-slate-900">{selected.value}</div>
                  <div className="truncate text-xs text-muted-foreground">{selected.label}</div>
                </>)}
            </div>) : (<span className="text-sm text-muted-foreground">{placeholder}</span>)}
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition ${open ? "rotate-180" : ""}`}/>
      </button>

      {open ? (<div className="absolute left-0 top-[calc(100%+0.5rem)] z-50 w-full min-w-[18rem] overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-xl sm:min-w-[26rem]">
          <div className="border-b border-emerald-100 bg-emerald-50/70 p-3">
            <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-white px-3">
              <Search className="h-4 w-4 text-muted-foreground"/>
              <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchPlaceholder || placeholder} className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"/>
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto p-2">
            {filtered.length === 0 ? (<div className="rounded-xl px-3 py-6 text-center text-sm text-muted-foreground">
                No matching options
              </div>) : (filtered.map((option) => {
                const active = option.value === value;
                return (<button key={option.value} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => handleSelect(option.value)} className={`flex w-full items-start justify-between gap-3 rounded-xl px-3 py-3 text-left transition ${active ? "bg-primary/10 text-primary" : "hover:bg-emerald-50/60"}`}>
                    <div className="min-w-0">
                      <div className="truncate font-medium">{option.displayLabel || option.value}</div>
                      <div className="truncate text-sm text-muted-foreground">{option.displayMeta || option.label}</div>
                      {option.description ? (<div className="truncate text-xs text-muted-foreground">{option.description}</div>) : null}
                    </div>
                    {active ? <Check className="mt-0.5 h-4 w-4 shrink-0"/> : null}
                  </button>);
            }))}
          </div>

          <div className="border-t border-emerald-100 bg-slate-50/70 px-3 py-2 text-xs text-muted-foreground">
            Type to filter, then choose the correct record.
          </div>
        </div>) : null}
    </div>);
}
export default function PrescriptionsPage() {
    const { user } = useAuth();
    const { t } = useLanguage();
    const [items, setItems] = useState([]);
    const [products, setProducts] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [agents, setAgents] = useState([]);
    const [types, setTypes] = useState([]);
    const [pagination, setPagination] = useState(createDefaultPagination());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [doctorId, setDoctorId] = useState("");
    const [prescriptionSearch, setPrescriptionSearch] = useState("");
    const [activePrescriptionSearch, setActivePrescriptionSearch] = useState("");
    const [patientNameSearch, setPatientNameSearch] = useState("");
    const [activePatientNameSearch, setActivePatientNameSearch] = useState("");
    const [agentId, setAgentId] = useState("");
    const [agentSituation, setAgentSituation] = useState("");
    const [prescriptionNumber, setPrescriptionNumber] = useState("");
    const [prescriptionType, setPrescriptionType] = useState("");
    const [systemDateLabel, setSystemDateLabel] = useState("");
    const [lines, setLines] = useState([createLine()]);
    const [radiosText, setRadiosText] = useState("");
    const [analysesText, setAnalysesText] = useState("");
    const [patientCard, setPatientCard] = useState(null);
    const [patientCardLoading, setPatientCardLoading] = useState(false);
    const [pendingApprovals, setPendingApprovals] = useState([]);
    const [approvalLoading, setApprovalLoading] = useState(false);
    const [approvalBusyId, setApprovalBusyId] = useState(null);
    const [expandedPendingId, setExpandedPendingId] = useState(null);
    const [pendingDetailsById, setPendingDetailsById] = useState({});
    const [pendingStockById, setPendingStockById] = useState({});
    const [rejectingId, setRejectingId] = useState(null);
    const [rejectionNotesById, setRejectionNotesById] = useState({});
    const [expandedExistingId, setExpandedExistingId] = useState(null);
    const [existingDetailsById, setExistingDetailsById] = useState({});
    const canCreate = useMemo(() => hasPermission(user, PERMISSIONS.PRESCRIPTIONS_MANAGE), [user]);
    const canApprove = useMemo(() => hasPermission(user, PERMISSIONS.PRESCRIPTIONS_APPROVE), [user]);
    const isDoctorUser = useMemo(() => Boolean(user?.roles?.includes("MEDECIN")), [user]);
    const isPharmacistUser = useMemo(() => Boolean(user?.roles?.includes("PHARMACIEN")), [user]);
    const selectableDoctors = useMemo(() => doctors, [doctors]);
    const helperCards = useMemo(() => [
        { label: t("prescriptions.card.doctors"), value: selectableDoctors.length, tone: "blue" },
        { label: t("prescriptions.card.products"), value: products.length, tone: "emerald" },
        { label: t("prescriptions.card.results"), value: items.length, tone: "slate" },
    ], [items.length, products.length, selectableDoctors.length, t]);
    const quickSteps = [
      t("prescriptions.quick.one"),
      t("prescriptions.quick.two"),
      t("prescriptions.quick.three"),
    ];
    const selectedAgent = useMemo(() => agents.find((agent) => String(agent.agent_id) === agentId.trim()) || null, [agentId, agents]);
    const selectedAgentName = useMemo(() => selectedAgent?.agent_name || selectedAgent?.agent_situation || patientCard?.agent_name || "-", [patientCard?.agent_name, selectedAgent]);
    const agentOptions = useMemo(() => agents.map((agent) => ({
        value: agent.agent_id,
        label: agent.agent_situation || "Agent",
        description: agent.agent_situation ? `Situation: ${agent.agent_situation}` : undefined,
    })), [agents]);
    const doctorOptions = useMemo(() => selectableDoctors.map((doctor) => ({
        value: String(doctor.doctor_id),
        label: doctor.name || `Doctor ${doctor.doctor_id}`,
    })), [selectableDoctors]);
    const typeOptions = useMemo(() => types.map((entry) => ({
        value: entry.type,
        label: entry.type,
    })), [types]);
    const agentLookupError = useMemo(() => {
        if (!agentId.trim())
            return null;
        return selectedAgent ? null : t("prescriptions.invalidAgent");
    }, [agentId, selectedAgent, t]);
    const loadData = async (
      page = 1,
      pageSize = 10,
      prescriptionNumber = activePrescriptionSearch,
      patientName = activePatientNameSearch
    ) => {
        const [prescriptionsRes, productsRes, doctorsRes, agentsRes, typesRes] = await Promise.all([
            fetchPrescriptions({
                page,
                pageSize,
                prescription_number: prescriptionNumber || undefined,
          patient_name: patientName || undefined,
            }),
            fetchProducts({ page: 1, pageSize: 500 }),
            fetchPrescriptionDoctors(),
            fetchPrescriptionAgents(),
            fetchPrescriptionTypes(),
        ]);
        setItems(prescriptionsRes.items);
        setPagination(prescriptionsRes.pagination);
        setProducts(productsRes.items);
        setDoctors(doctorsRes);
        setAgents(agentsRes);
        setTypes(typesRes);

        if (canApprove) {
          const approvalsRes = await fetchPendingPrescriptionApprovals();
          setPendingApprovals(approvalsRes);
        }
        else {
          setPendingApprovals([]);
        }
    };
    useEffect(() => {
        if (isDoctorUser) {
            if (selectableDoctors.length > 0) {
                const forcedDoctorId = String(selectableDoctors[0].doctor_id);
                if (doctorId !== forcedDoctorId)
                    setDoctorId(forcedDoctorId);
            }
            else if (doctorId) {
                setDoctorId("");
            }
            return;
        }
        if (!doctorId && selectableDoctors.length > 0) {
            setDoctorId(String(selectableDoctors[0].doctor_id));
        }
    }, [doctorId, isDoctorUser, selectableDoctors]);
    useEffect(() => {
        if (agents.length === 0) {
            if (agentId)
                setAgentId("");
            if (agentSituation)
                setAgentSituation("");
            return;
        }
        if (selectedAgent) {
            const nextSituation = selectedAgent.agent_situation || "";
            if (agentSituation !== nextSituation)
                setAgentSituation(nextSituation);
            return;
        }
        if (agentId.trim()) {
            if (agentSituation)
                setAgentSituation("");
            return;
        }
        const firstAgent = agents[0];
        if (agentId !== firstAgent.agent_id)
            setAgentId(firstAgent.agent_id);
        const firstSituation = firstAgent.agent_situation || "";
        if (agentSituation !== firstSituation)
            setAgentSituation(firstSituation);
    }, [agentId, agentSituation, agents, selectedAgent]);
    useEffect(() => {
        setSystemDateLabel(new Date().toLocaleDateString());
    }, []);
    useEffect(() => {
        if (types.length === 0) {
            if (prescriptionType)
                setPrescriptionType("");
            return;
        }
        if (!types.some((entry) => entry.type === prescriptionType)) {
            setPrescriptionType(types[0].type);
        }
    }, [prescriptionType, types]);
    useEffect(() => {
        let active = true;
        (async () => {
            try {
                setLoading(true);
                setError(null);
                await loadData();
            }
            catch (err) {
                if (active)
                    setError(err?.response?.data?.message || t("prescriptions.loadFailed"));
            }
            finally {
                if (active)
                    setLoading(false);
            }
        })();
        return () => {
            active = false;
        };
      }, [activePatientNameSearch, canApprove, t]);
      useEffect(() => {
        const currentAgentId = agentId.trim();
        if (!currentAgentId) {
          setPatientCard(null);
          return;
        }
        let active = true;
        (async () => {
          try {
            setPatientCardLoading(true);
            const card = await fetchPatientCard(currentAgentId);
            if (active)
              setPatientCard(card);
          }
          catch {
            if (active)
              setPatientCard(null);
          }
          finally {
            if (active)
              setPatientCardLoading(false);
          }
        })();
        return () => {
          active = false;
        };
      }, [agentId]);
    const updateLine = (index, field, value) => {
        setLines((prev) => prev.map((line, lineIndex) => (lineIndex === index ? { ...line, [field]: value } : line)));
    };
    const addLine = () => setLines((prev) => [...prev, createLine()]);
    const removeLine = (index) => setLines((prev) => prev.filter((_, lineIndex) => lineIndex !== index));
    const resetForm = () => {
        setAgentId("");
        setAgentSituation("");
        setPrescriptionNumber("");
        setPrescriptionType("");
      setRadiosText("");
      setAnalysesText("");
        setLines([createLine()]);
    };
    const getProductById = (value) => products.find((product) => String(product.product_id) === value.trim()) || null;
    const productOptions = useMemo(() => products.map((product) => ({
        value: String(product.product_id),
        label: product.lib || `Product ${product.product_id}`,
        description: product.bar_code || undefined,
    })), [products]);
    const productPlaceholder = t("common.product") === "common.product" ? "Product" : t("common.product");
    const productSearchPlaceholder = t("prescriptions.productSearchPlaceholder") === "prescriptions.productSearchPlaceholder"
        ? "Search product name"
        : t("prescriptions.productSearchPlaceholder");
    const exportCurrentResults = () => {
        const rows = [
            [
                "Prescription ID",
                "Prescription Number",
                "Prescription Date",
                "Doctor",
                "Type",
                "Approval Status",
                "Assigned Pharmacist",
                "Agent ID",
                "Agent Situation",
                "Line ID",
                "Product ID",
                "Product",
                "Quantity",
                "Days",
                "Distribution Count",
                "Periodic",
                "Periodicity",
                "Posologie",
            ],
        ];
        for (const item of items) {
            if (item.lines.length === 0) {
                rows.push([
                    item.prescription_id,
                    item.prescription_number || "",
                    item.prescription_date || "",
                    item.doctor_name || item.doctor_id || "",
                    item.type || "",
                    item.approval?.status || "PENDING",
                    item.approval?.assigned_pharmacist_name || item.approval?.assigned_pharmacist_id || "",
                    item.agent_id || "",
                    item.agent_situation || "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                ]);
                continue;
            }
            for (const line of item.lines) {
                rows.push([
                    item.prescription_id,
                    item.prescription_number || "",
                    item.prescription_date || "",
                    item.doctor_name || item.doctor_id || "",
                    item.type || "",
                    item.approval?.status || "PENDING",
                    item.approval?.assigned_pharmacist_name || item.approval?.assigned_pharmacist_id || "",
                    item.agent_id || "",
                    item.agent_situation || "",
                    line.line_id,
                    line.product_id,
                    line.product_lib || "",
                    line.total_qt,
                    line.days ?? "",
                    line.dist_number ?? "",
                    line.is_periodic ?? "",
                    line.periodicity || "",
                    line.posologie || "",
                ]);
            }
        }
        const csvContent = rows.map((row) => row.map(normalizeCsvValue).join(",")).join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `prescriptions-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    };
    const onSubmit = async (e) => {
        e.preventDefault();
        if (!canCreate)
            return;
        const invalidLine = lines.find((line) => line.product_id.trim() && !getProductById(line.product_id));
        if (invalidLine) {
            setError(`Product ID "${invalidLine.product_id}" ${t("prescriptions.invalidProduct")}`);
            return;
        }
        const payloadLines = lines
            .filter((line) => line.product_id.trim() && Number(line.total_qt) > 0)
            .map((line) => ({
            product_id: Number(line.product_id),
            total_qt: Number(line.total_qt),
            days: line.days ? Number(line.days) : undefined,
            dist_number: line.dist_number ? Number(line.dist_number) : undefined,
            is_periodic: Number(line.is_periodic),
            periodicity: line.periodicity || undefined,
            posologie: line.posologie || undefined,
        }));
        if (payloadLines.length === 0) {
            setError(t("prescriptions.needLine"));
            return;
        }
        if (!agentId) {
            setError(t("prescriptions.needAgent"));
            return;
        }
        if (agentLookupError) {
            setError(agentLookupError);
            return;
        }
        if (!doctorId) {
            setError(t("prescriptions.needDoctor"));
            return;
        }
        setSubmitting(true);
        setError(null);
        try {
            const parseRequests = (rawText) => rawText
              .split(/\r?\n|,/)
              .map((value) => value.trim())
              .filter(Boolean);

            await createPrescription({
                agent_id: agentId || undefined,
                agent_situation: agentSituation || undefined,
                prescription_number: prescriptionNumber || undefined,
                type: prescriptionType || undefined,
                doctor_id: Number(doctorId),
                lines: payloadLines,
                radios: parseRequests(radiosText),
                analyses: parseRequests(analysesText),
            });
            resetForm();
            await loadData(1, pagination.pageSize);
        }
        catch (err) {
            setError(err?.response?.data?.message || t("prescriptions.createFailed"));
        }
        finally {
            setSubmitting(false);
        }
    };
    const onPageChange = async (page, pageSize = pagination.pageSize) => {
        try {
            setLoading(true);
        await loadData(page, pageSize, activePrescriptionSearch, activePatientNameSearch);
        }
        catch (err) {
            setError(err?.response?.data?.message || t("prescriptions.loadFailed"));
        }
        finally {
            setLoading(false);
        }
    };
    const onSearchSubmit = async (e) => {
        e.preventDefault();
        const nextSearch = prescriptionSearch.trim();
      const nextPatientNameSearch = patientNameSearch.trim();
        try {
            setLoading(true);
            setError(null);
            setActivePrescriptionSearch(nextSearch);
        setActivePatientNameSearch(nextPatientNameSearch);
        await loadData(1, pagination.pageSize, nextSearch, nextPatientNameSearch);
        }
        catch (err) {
            setError(err?.response?.data?.message || t("prescriptions.searchFailed"));
        }
        finally {
            setLoading(false);
        }
    };
    const clearSearch = async () => {
        try {
            setLoading(true);
            setError(null);
            setPrescriptionSearch("");
            setActivePrescriptionSearch("");
            setPatientNameSearch("");
            setActivePatientNameSearch("");
            await loadData(1, pagination.pageSize, "", "");
        }
        catch (err) {
            setError(err?.response?.data?.message || t("prescriptions.reloadFailed"));
        }
        finally {
            setLoading(false);
        }
    };
      const decideApproval = async (prescriptionId, decision, notes) => {
        try {
          setApprovalBusyId(prescriptionId);
          setApprovalLoading(true);
          await decidePrescriptionApproval(prescriptionId, decision, notes);
          await loadData(pagination.page, pagination.pageSize, activePrescriptionSearch);
          setRejectingId(null);
          setRejectionNotesById((prev) => ({ ...prev, [prescriptionId]: "" }));
        }
        catch (err) {
          setError(err?.response?.data?.message || "Unable to update approval decision.");
        }
        finally {
          setApprovalBusyId(null);
          setApprovalLoading(false);
        }
      };
      const togglePendingDetails = async (prescriptionId) => {
        if (expandedPendingId === prescriptionId) {
          setExpandedPendingId(null);
          return;
        }
        setExpandedPendingId(prescriptionId);
        if (pendingDetailsById[prescriptionId])
          return;
        try {
          const item = await fetchPrescriptionById(prescriptionId);
          setPendingDetailsById((prev) => ({
            ...prev,
            [prescriptionId]: item,
          }));

          const productIds = Array.from(new Set((item?.lines || [])
            .map((line) => Number(line.product_id))
            .filter((productId) => Number.isInteger(productId) && productId > 0)));

          if (productIds.length > 0) {
            const stockEntries = await Promise.all(productIds.map(async (productId) => {
              const stockRes = await fetchStock({ product_id: productId, page: 1, pageSize: 500 });
              const totalStockQty = (stockRes?.items || []).reduce(
                (sum, stockRow) => sum + Number(stockRow.quantity || 0),
                0,
              );
              return [String(productId), totalStockQty];
            }));

            setPendingStockById((prev) => ({
              ...prev,
              [prescriptionId]: Object.fromEntries(stockEntries),
            }));
          }
        }
        catch (err) {
          setError(err?.response?.data?.message || "Unable to load prescription details.");
        }
      };
      const onRejectClick = (prescriptionId) => {
        setRejectingId(prescriptionId);
        setRejectionNotesById((prev) => ({
          ...prev,
          [prescriptionId]: prev[prescriptionId] || "",
        }));
      };
      const submitReject = async (prescriptionId) => {
        const notes = (rejectionNotesById[prescriptionId] || "").trim();
        if (!notes) {
          setError("Please provide a rejection reason before rejecting.");
          return;
        }
        await decideApproval(prescriptionId, "REJECTED", notes);
      };
      const toggleExistingDetails = async (prescriptionId) => {
        if (expandedExistingId === prescriptionId) {
          setExpandedExistingId(null);
          return;
        }

        setExpandedExistingId(prescriptionId);

        if (existingDetailsById[prescriptionId]) {
          return;
        }

        try {
          const detail = await fetchPrescriptionById(prescriptionId);
          setExistingDetailsById((prev) => ({
            ...prev,
            [prescriptionId]: detail,
          }));
        } catch (err) {
          setError(err?.response?.data?.message || "Unable to load prescription details.");
        }
      };
    return (<div className="space-y-6">
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">{t("prescriptions.workspaceTitle")}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {t("prescriptions.workspaceBody")}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-900">{t("prescriptions.workflowTitle")}</p>
            <ol className="mt-3 space-y-2 text-sm text-slate-600">
              <li>1. {t("prescriptions.workflow.one")}</li>
              <li>2. {t("prescriptions.workflow.two")}</li>
              <li>3. {t("prescriptions.workflow.three")}</li>
            </ol>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {helperCards.map((card) => (<div key={card.label} className={card.tone === "blue"
                ? "rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-700"
                : card.tone === "emerald"
                    ? "rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700"
                    : "rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-700"}>
              <p className="text-sm font-medium">{card.label}</p>
              <p className="mt-2 text-2xl font-semibold">{card.value}</p>
            </div>))}
        </div>

        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">{t("prescriptions.quickTitle")}</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{t("prescriptions.quickSubtitle")}</p>
            </div>
            <p className="text-xs text-muted-foreground">{t("prescriptions.quickHint")}</p>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {quickSteps.map((step, index) => (
              <div key={step} className="rounded-xl border bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">{t("prescriptions.quickStepLabel", { index: index + 1 })}</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{step}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-900">Patient card (agent)</h3>
            <p className="text-xs text-muted-foreground">Agent: {selectedAgentName} {agentId ? `(ID: ${agentId})` : ""}</p>
          </div>

          {!agentId.trim() ? (<p className="mt-2 text-sm text-muted-foreground">Select an agent to see previous prescriptions and medical context.</p>) : patientCardLoading ? (<p className="mt-2 text-sm text-muted-foreground">Loading patient history...</p>) : !patientCard ? (<p className="mt-2 text-sm text-muted-foreground">No patient history found for this agent.</p>) : (<div className="mt-3 space-y-3">
                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-xs text-muted-foreground">Total prescriptions</p>
                    <p className="text-lg font-semibold">{patientCard.total_prescriptions || 0}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-xs text-muted-foreground">Last prescription number</p>
                    <p className="text-sm font-medium">{patientCard.last_prescription_number || "N/A"}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-xs text-muted-foreground">Latest situation</p>
                    <p className="text-sm font-medium">{patientCard.agent_situation || "N/A"}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-xs text-muted-foreground">Last prescription date</p>
                    <p className="text-sm font-medium">{patientCard.last_prescription_date ? new Date(patientCard.last_prescription_date).toLocaleString() : "N/A"}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent history</p>
                  <div className="mt-2 max-h-52 overflow-y-auto rounded-lg border border-slate-200 bg-white">
                    {patientCard.history?.length ? (<ul className="divide-y divide-slate-100">
                        {patientCard.history.slice(0, 8).map((entry) => (<li key={entry.prescription_id} className="px-3 py-2 text-sm">
                            <span className="font-medium text-slate-900">#{entry.prescription_number || entry.prescription_id}</span>
                            <span className="ml-2 text-muted-foreground">{entry.type || "Type N/A"}</span>
                            <span className="ml-2 text-muted-foreground">{entry.prescription_date ? new Date(entry.prescription_date).toLocaleDateString() : ""}</span>
                          </li>))}
                      </ul>) : (<p className="px-3 py-3 text-sm text-muted-foreground">No previous prescription for this agent.</p>)}
                  </div>
                </div>
              </div>)}
        </div>

        {canCreate ? (<form className="mt-4 space-y-4" onSubmit={onSubmit}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-2">
                <p className="text-sm font-medium">Agent name / ID</p>
                <PickerField value={agentId} onChange={setAgentId} options={agentOptions} placeholder={t("prescriptions.agentPlaceholder")} searchPlaceholder={t("prescriptions.agentPlaceholder")} compact/>
                <p className="text-xs text-muted-foreground">{t("prescriptions.agentHint")}</p>
                {agentLookupError ? <p className="text-xs text-destructive">{agentLookupError}</p> : null}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">{t("prescriptions.agentSituation")}</p>
                <Input value={agentSituation} readOnly/>
                <p className="text-xs text-muted-foreground">{t("prescriptions.agentSituationHint")}</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">{t("prescriptions.number")}</p>
                <Input value={prescriptionNumber} onChange={(e) => setPrescriptionNumber(e.target.value)}/>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">{t("prescriptions.type")}</p>
                <PickerField value={prescriptionType} onChange={setPrescriptionType} options={typeOptions} placeholder={t("prescriptions.selectType")} searchPlaceholder={t("prescriptions.selectType")} compact/>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">{t("common.date")}</p>
                <Input value={systemDateLabel} readOnly/>
                <p className="text-xs text-muted-foreground">{t("prescriptions.dateHint")}</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">{t("prescriptions.doctor")}</p>
                <PickerField value={doctorId} onChange={setDoctorId} options={doctorOptions} disabled={isDoctorUser} placeholder={isDoctorUser ? t("prescriptions.connectedDoctor") : t("prescriptions.selectDoctor")} searchPlaceholder={t("prescriptions.selectDoctor")} compact/>
                {isDoctorUser && selectableDoctors.length === 0 ? (<p className="text-xs text-destructive">{t("prescriptions.noDoctorProfile")}</p>) : null}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-medium">{t("prescriptions.lines")}</p>
                <Button type="button" variant="outline" onClick={addLine}>
                  {t("prescriptions.addLine")}
                </Button>
              </div>

                {lines.map((line, index) => (<div key={index} className="grid grid-cols-1 gap-3 rounded-lg border p-3 md:grid-cols-2 lg:grid-cols-12">
                  <div className="space-y-2 lg:col-span-3">
                    <PickerField value={line.product_id} onChange={(value) => updateLine(index, "product_id", value)} options={productOptions.map((option) => ({
                    ...option,
                    displayLabel: option.label,
                    displayMeta: option.value,
                }))} placeholder={productPlaceholder} searchPlaceholder={productSearchPlaceholder} compact/>
                    <p className="text-xs text-muted-foreground">
                      {line.product_id.trim()
                    ? getProductById(line.product_id)?.lib || t("prescriptions.unknownProduct")
                    : t("prescriptions.productHint")}
                    </p>
                  </div>

                  <Input type="number" step="0.001" className="h-10 lg:col-span-1" value={line.total_qt} onChange={(e) => updateLine(index, "total_qt", e.target.value)} placeholder={t("common.quantity")}/>
                  <Input type="number" className="h-10 lg:col-span-1" value={line.days} onChange={(e) => updateLine(index, "days", e.target.value)} placeholder={t("prescriptions.days")}/>
                  <Input type="number" className="h-10 lg:col-span-1" value={line.dist_number} onChange={(e) => updateLine(index, "dist_number", e.target.value)} placeholder={t("prescriptions.distributionCount")}/>

                  <select className="h-10 rounded-xl border border-input bg-transparent px-3 text-sm shadow-sm outline-none focus:border-primary lg:col-span-2" value={line.is_periodic} onChange={(e) => updateLine(index, "is_periodic", e.target.value)}>
                    <option value="0">{t("prescriptions.nonPeriodic")}</option>
                    <option value="1">{t("prescriptions.periodic")}</option>
                  </select>

                  <Input className="h-10 lg:col-span-2" value={line.periodicity} onChange={(e) => updateLine(index, "periodicity", e.target.value)} placeholder={t("prescriptions.periodicity")}/>
                  <div className="flex gap-2 lg:col-span-2">
                    <Input className="h-10" value={line.posologie} onChange={(e) => updateLine(index, "posologie", e.target.value)} placeholder={t("prescriptions.posologie")}/>
                    <Button type="button" variant="outline" className="h-10" onClick={() => removeLine(index)} disabled={lines.length === 1}>
                      X
                    </Button>
                  </div>
                </div>))}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-medium">Radios to perform</p>
                <textarea rows={3} className="w-full rounded-xl border border-input bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-primary" value={radiosText} onChange={(event) => setRadiosText(event.target.value)} placeholder="One radio exam per line, or separated by commas"/>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Analyses to perform</p>
                <textarea rows={3} className="w-full rounded-xl border border-input bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-primary" value={analysesText} onChange={(event) => setAnalysesText(event.target.value)} placeholder="One analysis per line, or separated by commas"/>
              </div>
            </div>

            <Button type="submit" disabled={submitting}>
              {submitting ? t("prescriptions.creating") : t("prescriptions.create")}
            </Button>
          </form>) : (<p className="mt-4 text-sm text-muted-foreground">{t("prescriptions.authorizedOnly")}</p>)}

        {error && <p className="mt-4 whitespace-pre-line text-sm text-destructive">{error}</p>}
      </div>

      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold">{t("prescriptions.historyTitle")}</h3>
        <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={onSearchSubmit}>
          <Input value={prescriptionSearch} onChange={(e) => setPrescriptionSearch(e.target.value)} placeholder={t("prescriptions.searchPlaceholder")} className="sm:max-w-md"/>
          <Input value={patientNameSearch} onChange={(e) => setPatientNameSearch(e.target.value)} placeholder="Search by patient name" className="sm:max-w-md"/>
          <div className="flex gap-2">
            <Button type="button" variant="outline" disabled={loading || items.length === 0} onClick={exportCurrentResults}>
              {t("prescriptions.exportCsv")}
            </Button>
            <Button type="submit" variant="outline" disabled={loading}>
              {t("prescriptions.searchAction")}
            </Button>
            <Button type="button" variant="ghost" onClick={clearSearch} disabled={loading && !activePrescriptionSearch}>
              {t("common.reset")}
            </Button>
          </div>
        </form>

        {loading ? (<p className="mt-4 text-sm text-muted-foreground">{t("common.loading")}</p>) : items.length === 0 ? (<EmptyState className="mt-4 border-0 bg-muted/20 shadow-none" description={t("prescriptions.noneFound")}/>) : (<>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full table-auto border-collapse text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-semibold">ID</th>
                    <th className="px-4 py-3 font-semibold">{t("common.number")}</th>
                    <th className="px-4 py-3 font-semibold">{t("common.date")}</th>
                    <th className="px-4 py-3 font-semibold">{t("prescriptions.doctorColumn")}</th>
                    <th className="px-4 py-3 font-semibold">{t("prescriptions.type")}</th>
                    <th className="px-4 py-3 font-semibold">Approval</th>
                    <th className="px-4 py-3 font-semibold">Assigned pharmacist</th>
                    <th className="px-4 py-3 font-semibold">Rejection reason</th>
                    <th className="px-4 py-3 font-semibold">{t("common.lines")}</th>
                    <th className="px-4 py-3 font-semibold">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (<Fragment key={item.prescription_id}>
                      <tr className="border-t hover:bg-gray-50">
                        <td className="px-4 py-3">{item.prescription_id}</td>
                        <td className="px-4 py-3 font-medium">{item.prescription_number || t("common.notAvailable")}</td>
                        <td className="px-4 py-3">
                          {item.prescription_date ? new Date(item.prescription_date).toLocaleString() : t("common.notAvailable")}
                        </td>
                        <td className="px-4 py-3">{item.doctor_name || item.doctor_id || t("common.notAvailable")}</td>
                        <td className="px-4 py-3">{item.type || t("common.notAvailable")}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getApprovalTone(item.approval?.status || "PENDING")}`}>
                            {item.approval?.status || "PENDING"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {item.approval?.assigned_pharmacist_name || item.approval?.assigned_pharmacist_id || t("common.notAvailable")}
                        </td>
                        <td className="px-4 py-3">
                          {item.approval?.status === "REJECTED" ? (item.approval?.notes || "N/A") : "-"}
                        </td>
                        <td className="px-4 py-3">{item.lines.length}</td>
                        <td className="px-4 py-3">
                          <Button size="sm" variant="outline" onClick={() => toggleExistingDetails(item.prescription_id)}>
                            {expandedExistingId === item.prescription_id ? "Hide" : "View"}
                          </Button>
                        </td>
                      </tr>
                      {expandedExistingId === item.prescription_id ? (<tr className="border-t bg-slate-50/60">
                          <td className="px-4 py-3" colSpan={10}>
                            {!existingDetailsById[item.prescription_id] ? (<p className="text-sm text-muted-foreground">Loading details...</p>) : (<div className="space-y-3">
                                  <div className="grid gap-2 text-sm sm:grid-cols-2">
                                    <div>
                                      <span className="font-semibold">Prescription number:</span>{" "}
                                      {existingDetailsById[item.prescription_id].prescription_number || existingDetailsById[item.prescription_id].prescription_id}
                                    </div>
                                    <div>
                                      <span className="font-semibold">Patient name:</span>{" "}
                                      {existingDetailsById[item.prescription_id].agent_name || existingDetailsById[item.prescription_id].agent_situation || "N/A"}
                                    </div>
                                  </div>

                                  {existingDetailsById[item.prescription_id].approval?.status === "REJECTED" ? (<div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                                      <p className="font-semibold">Reason of refusal</p>
                                      <p className="mt-1">{existingDetailsById[item.prescription_id].approval?.notes || "No reason provided."}</p>
                                    </div>) : null}

                                  <div className="rounded-lg border border-slate-200 bg-white">
                                    <table className="w-full text-sm">
                                      <thead className="bg-slate-100">
                                        <tr>
                                          <th className="px-2 py-2 text-left">Product</th>
                                          <th className="px-2 py-2 text-left">Qty</th>
                                          <th className="px-2 py-2 text-left">Days</th>
                                          <th className="px-2 py-2 text-left">Periodicity</th>
                                          <th className="px-2 py-2 text-left">Posologie</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {existingDetailsById[item.prescription_id].lines.map((line) => (<tr key={line.line_id} className="border-t">
                                            <td className="px-2 py-2">
                                              <div className="font-medium text-slate-900">{line.product_lib || "-"}</div>
                                              <div className="text-xs text-slate-500">ID: {line.product_id ?? "-"}</div>
                                            </td>
                                            <td className="px-2 py-2">{line.total_qt}</td>
                                            <td className="px-2 py-2">{line.days ?? "-"}</td>
                                            <td className="px-2 py-2">{line.periodicity || "-"}</td>
                                            <td className="px-2 py-2">{line.posologie || "-"}</td>
                                          </tr>))}
                                      </tbody>
                                    </table>
                                  </div>

                                  <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Radios</p>
                                      {existingDetailsById[item.prescription_id].radios?.length ? (<ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                                          {existingDetailsById[item.prescription_id].radios.map((radio, index) => (<li key={`${item.prescription_id}-radio-${index}`}>{radio}</li>))}
                                        </ul>) : (<p className="mt-2 text-sm text-muted-foreground">No radios requested.</p>)}
                                    </div>
                                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Analyses</p>
                                      {existingDetailsById[item.prescription_id].analyses?.length ? (<ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                                          {existingDetailsById[item.prescription_id].analyses.map((analysis, index) => (<li key={`${item.prescription_id}-analysis-${index}`}>{analysis}</li>))}
                                        </ul>) : (<p className="mt-2 text-sm text-muted-foreground">No analyses requested.</p>)}
                                    </div>
                                  </div>
                                </div>)}
                          </td>
                        </tr>) : null}
                    </Fragment>))}
                </tbody>
              </table>
            </div>

            <div className="mt-4">
              <Pagination currentPage={pagination.page} totalPages={pagination.totalPages} pageSize={pagination.pageSize} onPrevious={() => onPageChange(Math.max(1, pagination.page - 1))} onNext={() => onPageChange(Math.min(pagination.totalPages, pagination.page + 1))} onPageSizeChange={(pageSize) => onPageChange(1, pageSize)}/>
            </div>
          </>)}
      </div>

      {canApprove && isPharmacistUser ? (<div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold">Pending prescription approvals</h3>
            <p className="text-sm text-muted-foreground">{pendingApprovals.length} pending</p>
          </div>

          {approvalLoading ? (<p className="mt-3 text-sm text-muted-foreground">Updating approval...</p>) : pendingApprovals.length === 0 ? (<p className="mt-3 text-sm text-muted-foreground">No pending approvals assigned to you.</p>) : (<div className="mt-3 overflow-x-auto">
                <table className="w-full table-auto border-collapse text-sm">
                  <thead className="bg-muted/50">
                    <tr className="text-left">
                      <th className="px-3 py-2 font-semibold">Prescription</th>
                      <th className="px-3 py-2 font-semibold">Doctor</th>
                      <th className="px-3 py-2 font-semibold">Agent</th>
                      <th className="px-3 py-2 font-semibold">Requested</th>
                      <th className="px-3 py-2 font-semibold">Lines</th>
                      <th className="px-3 py-2 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingApprovals.map((entry) => (<Fragment key={entry.prescription_id}>
                      <tr className="border-t">
                          <td className="px-3 py-2">{entry.prescription_number || entry.prescription_id}</td>
                          <td className="px-3 py-2">{entry.doctor_name || entry.doctor_id || "N/A"}</td>
                          <td className="px-3 py-2">{entry.agent_id || "N/A"}</td>
                          <td className="px-3 py-2">{entry.requested_at ? new Date(entry.requested_at).toLocaleString() : "N/A"}</td>
                          <td className="px-3 py-2">{entry.line_count || 0}</td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" variant="outline" disabled={approvalBusyId === entry.prescription_id} onClick={() => togglePendingDetails(entry.prescription_id)}>
                                {expandedPendingId === entry.prescription_id ? "Hide details" : "View details"}
                              </Button>
                              <Button size="sm" disabled={approvalBusyId === entry.prescription_id} onClick={() => decideApproval(entry.prescription_id, "APPROVED")}>Approve</Button>
                              <Button size="sm" variant="outline" disabled={approvalBusyId === entry.prescription_id} onClick={() => onRejectClick(entry.prescription_id)}>Reject</Button>
                            </div>
                          </td>
                        </tr>
                        {expandedPendingId === entry.prescription_id ? (<tr className="border-t bg-slate-50/70">
                            <td colSpan={6} className="px-3 py-3">
                              {pendingDetailsById[entry.prescription_id] ? (<div className="space-y-3">
                                  <div className="grid gap-2 text-sm sm:grid-cols-3">
                                    <div><span className="font-semibold">Doctor:</span> {pendingDetailsById[entry.prescription_id].doctor_name || pendingDetailsById[entry.prescription_id].doctor_id || "N/A"}</div>
                                    <div><span className="font-semibold">Agent:</span> {pendingDetailsById[entry.prescription_id].agent_id || "N/A"}</div>
                                    <div><span className="font-semibold">Type:</span> {pendingDetailsById[entry.prescription_id].type || "N/A"}</div>
                                  </div>
                                  <div className="rounded-lg border border-slate-200 bg-white">
                                    <table className="w-full text-sm">
                                      <thead className="bg-slate-100">
                                        <tr>
                                          <th className="px-2 py-2 text-left">Product</th>
                                          <th className="px-2 py-2 text-left">Requested qty</th>
                                          <th className="px-2 py-2 text-left">Stock qty</th>
                                          <th className="px-2 py-2 text-left">Comparison</th>
                                          <th className="px-2 py-2 text-left">Days</th>
                                          <th className="px-2 py-2 text-left">Posologie</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {pendingDetailsById[entry.prescription_id].lines.map((line) => {
                                          const requestedQty = Number(line.total_qt || 0);
                                          const stockQtyRaw = pendingStockById[entry.prescription_id]?.[String(line.product_id)];
                                          const stockQty = stockQtyRaw === undefined ? null : Number(stockQtyRaw || 0);
                                          const hasEnoughStock = stockQty !== null && stockQty >= requestedQty;

                                          return (
                                            <tr key={line.line_id} className="border-t">
                                              <td className="px-2 py-2">
                                                <div className="font-medium text-slate-900">{line.product_lib || "-"}</div>
                                                <div className="text-xs text-slate-500">ID: {line.product_id ?? "-"}</div>
                                              </td>
                                              <td className="px-2 py-2">{line.total_qt}</td>
                                              <td className="px-2 py-2">{stockQty === null ? "..." : stockQty}</td>
                                              <td className="px-2 py-2">
                                                {stockQty === null ? (
                                                  <span className="text-xs text-muted-foreground">Checking...</span>
                                                ) : hasEnoughStock ? (
                                                  <span className="inline-flex rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                                                    Enough
                                                  </span>
                                                ) : (
                                                  <span className="inline-flex rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">
                                                    Insufficient
                                                  </span>
                                                )}
                                              </td>
                                              <td className="px-2 py-2">{line.days ?? "-"}</td>
                                              <td className="px-2 py-2">{line.posologie || "-"}</td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>) : (<p className="text-sm text-muted-foreground">Loading details...</p>)}
                            </td>
                          </tr>) : null}
                        {rejectingId === entry.prescription_id ? (<tr className="border-t bg-rose-50/40">
                            <td colSpan={6} className="px-3 py-3">
                              <div className="space-y-2">
                                <p className="text-sm font-medium text-rose-700">Reason for rejection</p>
                                <textarea rows={3} className="w-full rounded-xl border border-input bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-primary" value={rejectionNotesById[entry.prescription_id] || ""} onChange={(event) => setRejectionNotesById((prev) => ({
                                ...prev,
                                [entry.prescription_id]: event.target.value,
                            }))} placeholder="Explain why this prescription is rejected"/>
                                <div className="flex gap-2">
                                  <Button size="sm" variant="outline" onClick={() => setRejectingId(null)}>
                                    Cancel
                                  </Button>
                                  <Button size="sm" disabled={approvalBusyId === entry.prescription_id} onClick={() => submitReject(entry.prescription_id)}>
                                    Confirm rejection
                                  </Button>
                                </div>
                              </div>
                            </td>
                          </tr>) : null}
                        </Fragment>))}
                  </tbody>
                </table>
              </div>)}
        </div>) : null}
    </div>);
}
