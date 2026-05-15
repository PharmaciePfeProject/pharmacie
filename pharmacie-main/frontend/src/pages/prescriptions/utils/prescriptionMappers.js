export const buildHelperCards = ({ t, doctorsCount, productsCount, resultsCount }) => [
  {
    label: t("prescriptions.card.doctors"),
    value: doctorsCount,
    tone: "blue",
  },
  {
    label: t("prescriptions.card.products"),
    value: productsCount,
    tone: "emerald",
  },
  {
    label: t("prescriptions.card.results"),
    value: resultsCount,
    tone: "slate",
  },
];

export const buildQuickSteps = (t) => [
  t("prescriptions.quick.one"),
  t("prescriptions.quick.two"),
  t("prescriptions.quick.three"),
];

export const buildAgentOptions = ({ agents, t }) =>
  agents.map((agent) => ({
    value: String(agent.agent_id),
    label: agent.agent_name || t("prescriptions.agentFallback"),
    displayLabel: String(agent.agent_id),
    displayMeta: agent.agent_name || t("prescriptions.agentFallback"),
    description: agent.agent_situation
      ? `${t("prescriptions.situationLabel")}: ${agent.agent_situation}`
      : undefined,
  }));

export const buildDoctorOptions = ({ doctors, t }) =>
  doctors.map((doctor) => ({
    value: String(doctor.doctor_id),
    label:
      doctor.name || `${t("prescriptions.doctorFallback")} ${doctor.doctor_id}`,
  }));

export const buildTypeOptions = ({ types }) =>
  types.map((entry) => ({
    value: entry.type,
    label: entry.type,
  }));
