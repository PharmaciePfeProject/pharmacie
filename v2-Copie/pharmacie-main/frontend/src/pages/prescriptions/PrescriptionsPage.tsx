import { useEffect, useMemo, useState } from "react";
import {
  createPrescription,
  exportPrescriptionsExcel,
  fetchPrescriptionAgents,
  fetchPrescriptionDoctors,
  fetchPrescriptionTypes,
  fetchPrescriptions,
} from "@/api/prescriptions";
import { fetchProducts } from "@/api/products";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/Pagination";
import { createDefaultPagination } from "@/lib/pagination";
import { ROLES, hasRole } from "@/lib/roles";
import type { PaginationMeta } from "@/types/pagination";
import type {
  Prescription,
  PrescriptionAgent,
  PrescriptionDoctor,
  PrescriptionType,
} from "@/types/prescriptions";
import type { Product } from "@/pages/products/product.types";

type LineForm = {
  product_id: string;
  total_qt: string;
  days: string;
  dist_number: string;
  is_periodic: "0" | "1";
  periodicity: string;
  posologie: string;
};

const createLine = (): LineForm => ({
  product_id: "",
  total_qt: "1",
  days: "",
  dist_number: "",
  is_periodic: "0",
  periodicity: "",
  posologie: "",
});

export default function PrescriptionsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Prescription[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [doctors, setDoctors] = useState<PrescriptionDoctor[]>([]);
  const [agents, setAgents] = useState<PrescriptionAgent[]>([]);
  const [types, setTypes] = useState<PrescriptionType[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>(createDefaultPagination());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [doctorId, setDoctorId] = useState("");
  const [prescriptionSearch, setPrescriptionSearch] = useState("");
  const [activePrescriptionSearch, setActivePrescriptionSearch] = useState("");

  const [agentId, setAgentId] = useState("");
  const [agentSituation, setAgentSituation] = useState("");
  const [prescriptionNumber, setPrescriptionNumber] = useState("");
  const [prescriptionType, setPrescriptionType] = useState("");
  const [radiosInput, setRadiosInput] = useState("");
  const [systemDateLabel, setSystemDateLabel] = useState("");
  const [lines, setLines] = useState<LineForm[]>([createLine()]);

  const canCreate = useMemo(() => {
    return hasRole(user, ROLES.ADMIN) || hasRole(user, ROLES.MEDECIN);
  }, [user]);

  const isDoctorUser = useMemo(() => hasRole(user, ROLES.MEDECIN), [user]);

  const connectedDoctorName = useMemo(() => {
    const fullName = `${user?.firstname || ""} ${user?.lastname || ""}`.trim();
    return fullName;
  }, [user]);

  const selectableDoctors = useMemo(() => {
    if (!isDoctorUser) return doctors;

    const normalize = (value: string | null | undefined) =>
      String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");

    const target = normalize(connectedDoctorName);
    if (!target) return [];

    const exactMatches = doctors.filter((doctor) => normalize(doctor.name) === target);
    if (exactMatches.length > 0) return exactMatches;

    const partialMatches = doctors.filter((doctor) => normalize(doctor.name).includes(target));
    return partialMatches;
  }, [doctors, isDoctorUser, connectedDoctorName]);

  const loadData = async (page = 1, pageSize = 10, prescriptionNumber = activePrescriptionSearch) => {
    const [prescriptionsRes, productsRes, doctorsRes, agentsRes, typesRes] = await Promise.all([
      fetchPrescriptions({
        page,
        pageSize,
        prescription_number: prescriptionNumber || undefined,
      }),
      fetchProducts({ page: 1, pageSize: 50 }),
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
        if (doctorId !== forcedDoctorId) {
          setDoctorId(forcedDoctorId);
        }
      } else if (doctorId) {
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
      if (agentId) setAgentId("");
      if (agentSituation) setAgentSituation("");
      return;
    }

    const selectedAgent = agents.find((agent) => agent.agent_id === agentId);
    if (selectedAgent) {
      const nextSituation = selectedAgent.agent_situation || "";
      if (agentSituation !== nextSituation) {
        setAgentSituation(nextSituation);
      }
      return;
    }

    const firstAgent = agents[0];
    if (agentId !== firstAgent.agent_id) {
      setAgentId(firstAgent.agent_id);
    }

    const firstSituation = firstAgent.agent_situation || "";
    if (agentSituation !== firstSituation) {
      setAgentSituation(firstSituation);
    }
  }, [agentId, agentSituation, agents]);

  useEffect(() => {
    setSystemDateLabel(new Date().toLocaleDateString());
  }, []);

  useEffect(() => {
    if (types.length === 0) {
      if (prescriptionType) setPrescriptionType("");
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
      } catch (err: any) {
        if (active) setError(err?.response?.data?.message || "Failed to load prescriptions.");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const updateLine = (index: number, field: keyof LineForm, value: string) => {
    setLines((prev) =>
      prev.map((line, lineIndex) => (lineIndex === index ? { ...line, [field]: value } : line))
    );
  };

  const addLine = () => {
    setLines((prev) => [...prev, createLine()]);
  };

  const removeLine = (index: number) => {
    setLines((prev) => prev.filter((_, lineIndex) => lineIndex !== index));
  };

  const resetForm = () => {
    setAgentId("");
    setAgentSituation("");
    setPrescriptionNumber("");
    setPrescriptionType("");
    setRadiosInput("");
    setLines([createLine()]);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreate) return;

    const payloadLines = lines
      .filter((line) => line.product_id && Number(line.total_qt) > 0)
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
      setError("Add at least one valid line (product + quantity).");
      return;
    }

    if (!agentId) {
      setError("Please select an agent.");
      return;
    }

    if (!doctorId) {
      setError("Please select a doctor.");
      return;
    }

    const radios = Array.from(
      new Set(
        radiosInput
          .split(/[,\n]/)
          .map((entry) => entry.trim())
          .filter(Boolean)
      )
    );

    setSubmitting(true);
    setError(null);

    try {
      await createPrescription({
        agent_id: agentId || undefined,
        agent_situation: agentSituation || undefined,
        prescription_number: prescriptionNumber || undefined,
        type: prescriptionType || undefined,
        doctor_id: Number(doctorId),
        radios: radios.length > 0 ? radios : undefined,
        lines: payloadLines,
      });

      resetForm();
      await loadData(1, pagination.pageSize);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to create prescription.");
    } finally {
      setSubmitting(false);
    }
  };

  const onPageChange = async (page: number, pageSize = pagination.pageSize) => {
    try {
      setLoading(true);
      await loadData(page, pageSize, activePrescriptionSearch);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load prescriptions.");
    } finally {
      setLoading(false);
    }
  };

  const onSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nextSearch = prescriptionSearch.trim();
    try {
      setLoading(true);
      setError(null);
      setActivePrescriptionSearch(nextSearch);
      await loadData(1, pagination.pageSize, nextSearch);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to search prescriptions.");
    } finally {
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
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to reload prescriptions.");
    } finally {
      setLoading(false);
    }
  };

  const onExportExcel = async () => {
    try {
      setExporting(true);
      setError(null);

      const { blob, contentDisposition } = await exportPrescriptionsExcel({
        prescription_number: activePrescriptionSearch || undefined,
      });

      const filenameMatch = contentDisposition?.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
      const fileName = decodeURIComponent(filenameMatch?.[1] || filenameMatch?.[2] || "prescriptions.xlsx");

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to export prescriptions.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Doctor prescriptions workspace</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Data entry is backed by PRESCRIPTION and PRESCRIPTION_LINE.
        </p>

        {canCreate ? (
          <form className="mt-4 space-y-4" onSubmit={onSubmit}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-2">
                <p className="text-sm font-medium">Agent ID</p>
                <select
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm outline-none focus:border-primary"
                  value={agentId}
                  onChange={(e) => setAgentId(e.target.value)}
                >
                  <option value="">Select agent</option>
                  {agents.map((agent) => (
                    <option key={agent.agent_id} value={agent.agent_id}>
                      {agent.agent_id}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Agent situation</p>
                <Input value={agentSituation} readOnly />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Prescription number</p>
                <Input value={prescriptionNumber} onChange={(e) => setPrescriptionNumber(e.target.value)} />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Type</p>
                <select
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm outline-none focus:border-primary"
                  value={prescriptionType}
                  onChange={(e) => setPrescriptionType(e.target.value)}
                >
                  <option value="">Select type</option>
                  {types.map((entry) => (
                    <option key={entry.type} value={entry.type}>
                      {entry.type}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Date</p>
                <Input value={systemDateLabel} readOnly />
              </div>
              <div className="space-y-2 lg:col-span-2">
                <p className="text-sm font-medium">Radios (comma or new line)</p>
                <Input
                  value={radiosInput}
                  onChange={(e) => setRadiosInput(e.target.value)}
                  placeholder="Example: Thorax, Echographie abdominale"
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Doctor</p>
                <select
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm outline-none focus:border-primary"
                  value={doctorId}
                  disabled={isDoctorUser}
                  onChange={(e) => setDoctorId(e.target.value)}
                >
                  <option value="">{isDoctorUser ? "Connected doctor" : "Select doctor"}</option>
                  {selectableDoctors.map((doctor) => (
                    <option key={doctor.doctor_id} value={doctor.doctor_id}>
                      {doctor.name || `Doctor ${doctor.doctor_id}`}
                    </option>
                  ))}
                </select>
                {isDoctorUser && selectableDoctors.length === 0 ? (
                  <p className="text-xs text-destructive">
                    No matching doctor profile found for {connectedDoctorName || "this account"}.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-medium">Prescription lines</p>
                <Button type="button" variant="outline" onClick={addLine}>
                  Add line
                </Button>
              </div>

              {lines.map((line, index) => (
                <div key={index} className="grid grid-cols-1 gap-3 rounded-lg border p-3 md:grid-cols-2 lg:grid-cols-7">
                  <select
                    className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm outline-none focus:border-primary"
                    value={line.product_id}
                    onChange={(e) => updateLine(index, "product_id", e.target.value)}
                  >
                    <option value="">Product</option>
                    {products.map((product) => (
                      <option key={product.product_id} value={product.product_id}>
                        {product.product_id} - {product.lib}
                      </option>
                    ))}
                  </select>

                  <Input type="number" step="0.001" value={line.total_qt} onChange={(e) => updateLine(index, "total_qt", e.target.value)} placeholder="Quantity" />
                  <Input type="number" value={line.days} onChange={(e) => updateLine(index, "days", e.target.value)} placeholder="Days" />
                  <Input type="number" value={line.dist_number} onChange={(e) => updateLine(index, "dist_number", e.target.value)} placeholder="Distribution count" />

                  <select
                    className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm outline-none focus:border-primary"
                    value={line.is_periodic}
                    onChange={(e) => updateLine(index, "is_periodic", e.target.value as "0" | "1")}
                  >
                    <option value="0">Non periodic</option>
                    <option value="1">Periodic</option>
                  </select>

                  <Input value={line.periodicity} onChange={(e) => updateLine(index, "periodicity", e.target.value)} placeholder="Periodicity" />
                  <div className="flex gap-2">
                    <Input value={line.posologie} onChange={(e) => updateLine(index, "posologie", e.target.value)} placeholder="Dosage instructions" />
                    <Button type="button" variant="outline" onClick={() => removeLine(index)} disabled={lines.length === 1}>
                      X
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create prescription"}
            </Button>
          </form>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">Only ADMIN and DOCTOR roles can create prescriptions.</p>
        )}

        {error && <p className="mt-4 text-sm text-destructive whitespace-pre-line">{error}</p>}
      </div>

      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold">Existing prescriptions</h3>
        <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={onSearchSubmit}>
          <Input
            value={prescriptionSearch}
            onChange={(e) => setPrescriptionSearch(e.target.value)}
            placeholder="Search by prescription number"
            className="sm:max-w-md"
          />
          <div className="flex gap-2">
            <Button type="submit" variant="outline" disabled={loading}>
              Search
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={clearSearch}
              disabled={loading && !activePrescriptionSearch}
            >
              Reset
            </Button>
            <Button type="button" variant="outline" onClick={onExportExcel} disabled={loading || exporting}>
              {exporting ? "Exporting..." : "Export Excel"}
            </Button>
          </div>
        </form>
        {loading ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
        ) : (
          <>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full table-auto border-collapse text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left">
                    <th className="px-3 py-2">ID</th>
                    <th className="px-3 py-2">Number</th>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Doctor</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Radios</th>
                    <th className="px-3 py-2">Lines</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.prescription_id} className="border-t">
                      <td className="px-3 py-2">{item.prescription_id}</td>
                      <td className="px-3 py-2">{item.prescription_number || "-"}</td>
                      <td className="px-3 py-2">
                        {item.prescription_date ? new Date(item.prescription_date).toLocaleString() : "-"}
                      </td>
                      <td className="px-3 py-2">{item.doctor_name || item.doctor_id || "-"}</td>
                      <td className="px-3 py-2">{item.type || "-"}</td>
                      <td className="px-3 py-2">{item.radios?.length ? item.radios.join(", ") : "-"}</td>
                      <td className="px-3 py-2">{item.lines.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4">
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                pageSize={pagination.pageSize}
                onPrevious={() => onPageChange(Math.max(1, pagination.page - 1))}
                onNext={() => onPageChange(Math.min(pagination.totalPages, pagination.page + 1))}
                onPageSizeChange={(pageSize) => onPageChange(1, pageSize)}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
