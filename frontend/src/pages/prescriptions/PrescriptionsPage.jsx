import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { createPrescription, fetchPrescriptionAgents, fetchPrescriptionDoctors, fetchPrescriptionTypes, fetchPrescriptions, } from "@/api/prescriptions";
import { fetchProducts } from "@/api/products";
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
    const [agentId, setAgentId] = useState("");
    const [agentSituation, setAgentSituation] = useState("");
    const [prescriptionNumber, setPrescriptionNumber] = useState("");
    const [prescriptionType, setPrescriptionType] = useState("");
    const [systemDateLabel, setSystemDateLabel] = useState("");
    const [lines, setLines] = useState([createLine()]);
    const canCreate = useMemo(() => hasPermission(user, PERMISSIONS.PRESCRIPTIONS_MANAGE), [user]);
    const isDoctorUser = useMemo(() => Boolean(user?.roles?.includes("MEDECIN")), [user]);
    const selectableDoctors = useMemo(() => doctors, [doctors]);
    const helperCards = useMemo(() => [
        { label: t("prescriptions.card.doctors"), value: selectableDoctors.length, tone: "blue" },
        { label: t("prescriptions.card.products"), value: products.length, tone: "emerald" },
        { label: t("prescriptions.card.results"), value: items.length, tone: "slate" },
    ], [items.length, products.length, selectableDoctors.length, t]);
    const selectedAgent = useMemo(() => agents.find((agent) => String(agent.agent_id) === agentId.trim()) || null, [agentId, agents]);
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
    const loadData = async (page = 1, pageSize = 10, prescriptionNumber = activePrescriptionSearch) => {
        const [prescriptionsRes, productsRes, doctorsRes, agentsRes, typesRes] = await Promise.all([
            fetchPrescriptions({
                page,
                pageSize,
                prescription_number: prescriptionNumber || undefined,
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
    }, [t]);
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
            await createPrescription({
                agent_id: agentId || undefined,
                agent_situation: agentSituation || undefined,
                prescription_number: prescriptionNumber || undefined,
                type: prescriptionType || undefined,
                doctor_id: Number(doctorId),
                lines: payloadLines,
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
            await loadData(page, pageSize, activePrescriptionSearch);
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
        try {
            setLoading(true);
            setError(null);
            setActivePrescriptionSearch(nextSearch);
            await loadData(1, pagination.pageSize, nextSearch);
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
            await loadData(1, pagination.pageSize, "");
        }
        catch (err) {
            setError(err?.response?.data?.message || t("prescriptions.reloadFailed"));
        }
        finally {
            setLoading(false);
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

        {canCreate ? (<form className="mt-4 space-y-4" onSubmit={onSubmit}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-2">
                <p className="text-sm font-medium">{t("prescriptions.agentId")}</p>
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
                    <th className="px-4 py-3 font-semibold">{t("common.lines")}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (<tr key={item.prescription_id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">{item.prescription_id}</td>
                      <td className="px-4 py-3">{item.prescription_number || t("common.notAvailable")}</td>
                      <td className="px-4 py-3">
                        {item.prescription_date ? new Date(item.prescription_date).toLocaleString() : t("common.notAvailable")}
                      </td>
                      <td className="px-4 py-3">{item.doctor_name || item.doctor_id || t("common.notAvailable")}</td>
                      <td className="px-4 py-3">{item.type || t("common.notAvailable")}</td>
                      <td className="px-4 py-3">{item.lines.length}</td>
                    </tr>))}
                </tbody>
              </table>
            </div>

            <div className="mt-4">
              <Pagination currentPage={pagination.page} totalPages={pagination.totalPages} pageSize={pagination.pageSize} onPrevious={() => onPageChange(Math.max(1, pagination.page - 1))} onNext={() => onPageChange(Math.min(pagination.totalPages, pagination.page + 1))} onPageSizeChange={(pageSize) => onPageChange(1, pageSize)}/>
            </div>
          </>)}
      </div>
    </div>);
}
