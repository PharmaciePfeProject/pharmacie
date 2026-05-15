import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import { escapeHtml, formatDateTime, normalizeCsvValue } from "./prescriptionFormatters";

export const buildMedicalRequestDocument = ({
  prescription,
  requestType,
  requestLabel,
  language,
  user,
  t,
}) => {
  if (!prescription || !requestLabel) return null;

  const locale = language === "fr" ? "fr-FR" : "en-US";
  const issuedAt = formatDateTime(prescription.prescription_date, locale);
  const printIssuedAt = formatDateTime(new Date().toISOString(), locale);
  const doctorName =
    prescription.doctor_name ||
    [user?.firstname, user?.lastname].filter(Boolean).join(" ").trim() ||
    user?.username ||
    "N/A";
  const patientName =
    prescription.agent_name || prescription.agent_situation || "N/A";
  const requestTypeLabel =
    requestType === "RADIO"
      ? t("prescriptions.print.requestType.radio")
      : t("prescriptions.print.requestType.analysis");
  const badgeLabel = requestType === "RADIO" ? "RADIO" : "ANALYSIS";

  const printableRows = [
    [
      t("prescriptions.print.prescriptionNumber"),
      prescription.prescription_number || prescription.prescription_id || "N/A",
    ],
    [t("prescriptions.print.prescriptionType"), prescription.type || "N/A"],
    [t("prescriptions.print.prescriptionDate"), issuedAt],
    [t("prescriptions.print.doctor"), doctorName],
    [
      t("prescriptions.print.doctorAccount"),
      user?.username || prescription.doctor_id || "N/A",
    ],
    [t("prescriptions.print.agentId"), prescription.agent_id || "N/A"],
    [t("prescriptions.print.agentPatient"), patientName],
    [
      t("prescriptions.print.patientSituation"),
      prescription.agent_situation || "N/A",
    ],
    [
      t("prescriptions.print.approvalStatus"),
      prescription.approval?.status || "PENDING",
    ],
    [t("prescriptions.print.printedOn"), printIssuedAt],
  ];

  const rowsMarkup = printableRows
    .map(
      ([label, value]) => `
          <div class="meta-row">
            <div class="meta-label">${escapeHtml(label)}</div>
            <div class="meta-value">${escapeHtml(value)}</div>
          </div>
        `,
    )
    .join("");

  const html = `
<!DOCTYPE html>
<html lang="${escapeHtml(language)}">
  <head>
    <meta charset="UTF-8" />
    <title>${escapeHtml(requestTypeLabel)} - ${escapeHtml(requestLabel)}</title>
    <style>
      :root {
        color-scheme: light;
        --ink: #0f172a;
        --muted: #475569;
        --line: #dbe4ea;
        --accent: #0f766e;
        --accent-soft: #ecfeff;
        --paper: #ffffff;
        --panel: #f8fafc;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        background: #e2e8f0;
        color: var(--ink);
        font-family: "Segoe UI", Arial, sans-serif;
      }
      .page {
        width: 210mm;
        min-height: 297mm;
        margin: 0 auto;
        background: var(--paper);
        padding: 18mm 16mm;
      }
      .hero {
        border: 1px solid var(--line);
        border-radius: 20px;
        overflow: hidden;
      }
      .hero-top {
        display: flex;
        justify-content: space-between;
        gap: 24px;
        padding: 18px 20px;
        background: linear-gradient(135deg, #0f766e 0%, #115e59 100%);
        color: white;
      }
      .hero-top h1 {
        margin: 0;
        font-size: 28px;
        line-height: 1.1;
      }
      .hero-top p {
        margin: 8px 0 0;
        color: rgba(255,255,255,0.84);
        font-size: 13px;
      }
      .badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 110px;
        padding: 10px 14px;
        border: 1px solid rgba(255,255,255,0.24);
        border-radius: 999px;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.18em;
      }
      .hero-body {
        padding: 20px;
        background: linear-gradient(180deg, var(--accent-soft) 0%, #ffffff 100%);
      }
      .request-box {
        margin-bottom: 18px;
        border: 1px solid #99f6e4;
        border-radius: 18px;
        background: white;
        padding: 18px;
      }
      .request-label {
        margin: 0 0 8px;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.16em;
        color: var(--accent);
        text-transform: uppercase;
      }
      .request-value {
        margin: 0;
        font-size: 24px;
        font-weight: 700;
        line-height: 1.3;
      }
      .meta-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }
      .meta-row {
        border: 1px solid var(--line);
        border-radius: 14px;
        background: var(--panel);
        padding: 14px;
      }
      .meta-label {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--muted);
        margin-bottom: 8px;
      }
      .meta-value {
        font-size: 15px;
        font-weight: 600;
        line-height: 1.4;
        word-break: break-word;
      }
      .footer {
        margin-top: 28px;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 18px;
      }
      .signature {
        border-top: 1px solid var(--line);
        padding-top: 12px;
        min-height: 84px;
      }
      .signature-title {
        font-size: 12px;
        font-weight: 700;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.12em;
      }
      .signature-name {
        margin-top: 36px;
        font-size: 14px;
        font-weight: 600;
      }
      .note {
        margin-top: 18px;
        padding: 14px 16px;
        border-radius: 14px;
        background: #f8fafc;
        border: 1px dashed #cbd5e1;
        color: var(--muted);
        font-size: 12px;
        line-height: 1.6;
      }
      @media print {
        body { background: white; }
        .page {
          width: auto;
          min-height: auto;
          margin: 0;
          padding: 0;
        }
      }
    </style>
  </head>
  <body>
    <main class="page">
      <section class="hero">
        <div class="hero-top">
          <div>
            <h1>${escapeHtml(requestTypeLabel)}</h1>
            <p>${escapeHtml(t("prescriptions.print.heroSubtitle"))}</p>
          </div>
          <div class="badge">${escapeHtml(badgeLabel)}</div>
        </div>
        <div class="hero-body">
          <div class="request-box">
            <p class="request-label">${escapeHtml(
              requestType === "RADIO"
                ? t("prescriptions.print.requestedExam")
                : t("prescriptions.print.requestedAnalysis"),
            )}</p>
            <p class="request-value">${escapeHtml(requestLabel)}</p>
          </div>
          <div class="meta-grid">${rowsMarkup}</div>
          <div class="note">
            ${escapeHtml(t("prescriptions.print.note"))}
          </div>
          <div class="footer">
            <div class="signature">
              <div class="signature-title">${escapeHtml(
                t("prescriptions.print.issuedByDoctor"),
              )}</div>
              <div class="signature-name">${escapeHtml(doctorName)}</div>
            </div>
            <div class="signature">
              <div class="signature-title">${escapeHtml(
                t("prescriptions.print.patientAgent"),
              )}</div>
              <div class="signature-name">${escapeHtml(patientName)}</div>
            </div>
          </div>
        </div>
      </section>
    </main>
    <script>
      window.onload = function () {
        window.print();
      };
    </script>
  </body>
</html>`;

  return {
    html,
    printableRows,
    requestTypeLabel,
    requestType,
    requestLabel,
  };
};

export const exportMedicalRequestPdf = ({ docData, setError, t }) => {
  if (!docData) return;

  const { html } = docData;
  const printBlob = new Blob([html], { type: "text/html;charset=utf-8" });
  const printUrl = window.URL.createObjectURL(printBlob);
  const printWindow = window.open(printUrl, "_blank", "width=980,height=820");
  if (!printWindow) {
    window.URL.revokeObjectURL(printUrl);
    setError(t("prescriptions.print.windowError"));
    return;
  }

  const cleanup = () => {
    window.setTimeout(() => {
      window.URL.revokeObjectURL(printUrl);
    }, 60000);
  };

  if (printWindow.document?.readyState === "complete") {
    cleanup();
  } else {
    printWindow.addEventListener("load", cleanup, { once: true });
  }
};

export const exportMedicalRequestWord = async ({ docData, t }) => {
  if (!docData) return;

  const { printableRows, requestTypeLabel, requestType, requestLabel } = docData;
  const rows = [
    [
      requestType === "RADIO"
        ? t("prescriptions.print.requestedExam")
        : t("prescriptions.print.requestedAnalysis"),
      requestLabel,
    ],
    ...printableRows,
  ];

  const tableRows = rows.map(
    (row) =>
      new TableRow({
        children: row.map(
          (cell) =>
            new TableCell({
              children: [new Paragraph(String(cell ?? ""))],
            }),
        ),
      }),
  );

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: requestTypeLabel,
                bold: true,
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Table({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${requestType.toLowerCase()}-request-${new Date()
    .toISOString()
    .slice(0, 10)}.docx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const exportMedicalRequestExcel = ({ docData, language, t }) => {
  if (!docData) return;

  const { printableRows, requestType, requestLabel } = docData;
  const rows = [
    [language === "fr" ? "Champ" : "Field", language === "fr" ? "Valeur" : "Value"],
    [
      requestType === "RADIO"
        ? t("prescriptions.print.requestedExam")
        : t("prescriptions.print.requestedAnalysis"),
      requestLabel,
    ],
    ...printableRows,
  ];

  const csvContent = rows
    .map((row) => row.map(normalizeCsvValue).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${requestType.toLowerCase()}-request-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const buildPrescriptionExportRows = ({ items, t }) => {
  const exportHeaders = [
    t("common.id"),
    t("prescriptions.number"),
    t("prescriptions.print.prescriptionDate"),
    t("prescriptions.doctorColumn"),
    t("prescriptions.type"),
    t("prescriptions.print.approvalStatus"),
    t("prescriptions.assignedPharmacist"),
    t("prescriptions.agentId"),
    t("prescriptions.agentSituation"),
    `${t("prescriptions.lines")} ${t("common.id")}`,
    `${t("common.product")} ${t("common.id")}`,
    t("common.product"),
    t("common.quantity"),
    t("prescriptions.days"),
    t("prescriptions.distributionCount"),
    t("prescriptions.periodic"),
    t("prescriptions.periodicity"),
    t("prescriptions.posologie"),
  ];

  const rows = [exportHeaders];

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

  return rows;
};

export const exportPrescriptionCsv = ({ rows }) => {
  const csvContent = rows
    .map((row) => row.map(normalizeCsvValue).join(","))
    .join("\n");

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

export const exportPrescriptionWord = async ({ rows, title }) => {
  const tableRows = rows.map(
    (row, rowIndex) =>
      new TableRow({
        children: row.map(
          (cell) =>
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: String(cell ?? ""),
                      bold: rowIndex === 0,
                    }),
                  ],
                }),
              ],
            }),
        ),
      }),
  );

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [new TextRun({ text: title, bold: true })],
          }),
          new Paragraph({ text: "" }),
          new Table({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `prescriptions-${new Date().toISOString().slice(0, 10)}.docx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const exportPrescriptionPdf = ({ rows, title }) => {
  const header = rows[0];
  const body = rows.slice(1);

  const html = `
      <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)} PDF</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 16px; }
          table { border-collapse: collapse; width: 100%; font-size: 11px; }
          th, td { border: 1px solid #cbd5e1; padding: 6px; text-align: left; }
          th { background: #f1f5f9; }
        </style>
      </head>
      <body>
        <h2>${escapeHtml(title)}</h2>
        <table>
          <thead><tr>${header
            .map((h) => `<th>${escapeHtml(h)}</th>`)
            .join("")}</tr></thead>
          <tbody>${body
            .map(
              (row) =>
                `<tr>${row
                  .map((cell) => `<td>${escapeHtml(cell)}</td>`)
                  .join("")}</tr>`,
            )
            .join("")}</tbody>
        </table>
        <script>window.onload = () => window.print();</script>
      </body>
      </html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  window.open(url, "_blank", "width=1200,height=900");
};
