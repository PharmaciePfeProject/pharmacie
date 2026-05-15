import { useEffect, useMemo, useState } from "react";
import {
  createPrescription,
  fetchPatientCard,
  updatePrescription,
} from "@/api/prescriptions";

export const createLine = () => ({
  product_id: "",
  total_qt: "1",
  days: "",
  dist_number: "",
  is_periodic: "0",
  periodicity: "",
  posologie: "",
});

export const usePrescriptionForm = ({
  t,
  canCreate,
  isDoctorUser,
  doctors,
  agents,
  types,
  products,
  loadData,
  pageSize,
  setError,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [doctorId, setDoctorId] = useState("");
  const [agentId, setAgentId] = useState("");
  const [agentSituation, setAgentSituation] = useState("");
  const [prescriptionNumber, setPrescriptionNumber] = useState("");
  const [prescriptionType, setPrescriptionType] = useState("");
  const [systemDateLabel, setSystemDateLabel] = useState("");
  const [lines, setLines] = useState([createLine()]);
  const [radiosText, setRadiosText] = useState("");
  const [analysesText, setAnalysesText] = useState("");
  const [editingPrescriptionId, setEditingPrescriptionId] = useState(null);
  const [patientCard, setPatientCard] = useState(null);
  const [patientCardLoading, setPatientCardLoading] = useState(false);

  const selectableDoctors = useMemo(() => doctors, [doctors]);
  const isEditing = editingPrescriptionId !== null;
  const normalizedAgentId = useMemo(() => String(agentId ?? "").trim(), [agentId]);

  const selectedAgent = useMemo(
    () => agents.find((agent) => String(agent.agent_id) === normalizedAgentId) || null,
    [normalizedAgentId, agents],
  );

  const selectedAgentName = useMemo(
    () =>
      selectedAgent?.agent_name ||
      selectedAgent?.agent_situation ||
      patientCard?.agent_name ||
      "-",
    [patientCard?.agent_name, selectedAgent],
  );

  const agentLookupError = useMemo(() => {
    if (!normalizedAgentId) return null;
    return selectedAgent ? null : t("prescriptions.invalidAgent");
  }, [normalizedAgentId, selectedAgent, t]);

  useEffect(() => {
    if (isDoctorUser) {
      if (selectableDoctors.length > 0) {
        const forcedDoctorId = String(selectableDoctors[0].doctor_id);
        if (doctorId !== forcedDoctorId) setDoctorId(forcedDoctorId);
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

    if (selectedAgent) {
      const nextSituation = selectedAgent.agent_situation || "";
      if (agentSituation !== nextSituation) setAgentSituation(nextSituation);
      return;
    }

    if (normalizedAgentId) {
      if (agentSituation) setAgentSituation("");
      return;
    }

    const firstAgent = agents[0];
    if (normalizedAgentId !== String(firstAgent.agent_id)) {
      setAgentId(String(firstAgent.agent_id));
    }
    const firstSituation = firstAgent.agent_situation || "";
    if (agentSituation !== firstSituation) setAgentSituation(firstSituation);
  }, [normalizedAgentId, agentSituation, agents, selectedAgent, agentId]);

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
    const currentAgentId = normalizedAgentId;
    if (!currentAgentId) {
      setPatientCard(null);
      return;
    }

    let active = true;
    (async () => {
      try {
        setPatientCardLoading(true);
        const card = await fetchPatientCard(currentAgentId);
        if (active) setPatientCard(card);
      } catch {
        if (active) setPatientCard(null);
      } finally {
        if (active) setPatientCardLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [normalizedAgentId]);

  const updateLine = (index, field, value) => {
    setLines((prev) =>
      prev.map((line, lineIndex) =>
        lineIndex === index ? { ...line, [field]: value } : line,
      ),
    );
  };

  const addLine = () => setLines((prev) => [...prev, createLine()]);

  const removeLine = (index) =>
    setLines((prev) => prev.filter((_, lineIndex) => lineIndex !== index));

  const resetForm = () => {
    setEditingPrescriptionId(null);
    setAgentId("");
    setAgentSituation("");
    setPrescriptionNumber("");
    setPrescriptionType("");
    setRadiosText("");
    setAnalysesText("");
    setLines([createLine()]);
  };

  const startEditPrescription = (item) => {
    if (!canCreate) {
      setError(t("prescriptions.authorizedOnly"));
      return;
    }
    setError(null);
    setEditingPrescriptionId(item.prescription_id);
    setAgentId(String(item.agent_id || ""));
    setAgentSituation(item.agent_situation || "");
    setPrescriptionNumber(item.prescription_number || "");
    setPrescriptionType(item.type || "");
    setDoctorId(String(item.doctor_id || ""));
    setRadiosText((item.radios || []).join("\n"));
    setAnalysesText((item.analyses || []).join("\n"));
    setLines(
      (item.lines || []).length > 0
        ? item.lines.map((line) => ({
            product_id: String(line.product_id || ""),
            total_qt: String(line.total_qt || "1"),
            days: line.days === null || line.days === undefined ? "" : String(line.days),
            dist_number:
              line.dist_number === null || line.dist_number === undefined
                ? ""
                : String(line.dist_number),
            is_periodic: String(line.is_periodic ?? 0),
            periodicity: line.periodicity || "",
            posologie: line.posologie || "",
          }))
        : [createLine()],
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const getProductById = (value) =>
    products.find((product) => String(product.product_id) === value.trim()) || null;

  const productOptions = useMemo(
    () =>
      products.map((product) => ({
        value: String(product.product_id),
        label: product.lib || `Product ${product.product_id}`,
        description: product.bar_code || undefined,
      })),
    [products],
  );

  const productPlaceholder =
    t("common.product") === "common.product" ? "Product" : t("common.product");
  const productSearchPlaceholder =
    t("prescriptions.productSearchPlaceholder") ===
    "prescriptions.productSearchPlaceholder"
      ? "Search product name"
      : t("prescriptions.productSearchPlaceholder");

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canCreate) return;

    const invalidLine = lines.find(
      (line) => line.product_id.trim() && !getProductById(line.product_id),
    );
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
      const parseRequests = (rawText) =>
        rawText
          .split(/\r?\n|,/)
          .map((value) => value.trim())
          .filter(Boolean);

      const payload = {
        agent_id: agentId || undefined,
        agent_situation: agentSituation || undefined,
        prescription_number: prescriptionNumber || undefined,
        type: prescriptionType || undefined,
        doctor_id: Number(doctorId),
        lines: payloadLines,
        radios: parseRequests(radiosText),
        analyses: parseRequests(analysesText),
      };

      if (isEditing) {
        await updatePrescription(editingPrescriptionId, payload);
      } else {
        await createPrescription(payload);
      }

      resetForm();
      await loadData(1, pageSize);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          (isEditing ? t("prescriptions.updateFailed") : t("prescriptions.createFailed")),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return {
    submitting,
    doctorId,
    setDoctorId,
    agentId,
    setAgentId,
    agentSituation,
    prescriptionNumber,
    setPrescriptionNumber,
    prescriptionType,
    setPrescriptionType,
    systemDateLabel,
    lines,
    radiosText,
    setRadiosText,
    analysesText,
    setAnalysesText,
    patientCard,
    patientCardLoading,
    editingPrescriptionId,
    setEditingPrescriptionId,
    selectableDoctors,
    isEditing,
    normalizedAgentId,
    selectedAgentName,
    agentLookupError,
    updateLine,
    addLine,
    removeLine,
    resetForm,
    startEditPrescription,
    getProductById,
    productOptions,
    productPlaceholder,
    productSearchPlaceholder,
    onSubmit,
  };
};
