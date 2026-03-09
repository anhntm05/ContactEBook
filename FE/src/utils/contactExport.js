import { getPrimaryEmail, getPrimaryPhone } from "./contactDisplay";

const today = () => new Date().toISOString().slice(0, 10);

const csvEscape = (value) => {
  const str = `${value ?? ""}`;
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return `"${str.replaceAll('"', '""')}"`;
  }
  return str;
};

const flattenContact = (contact) => ({
  "Display Name": contact.displayName || "",
  "First Name": contact.firstName || "",
  "Last Name": contact.lastName || "",
  Nickname: contact.nickname || "",
  "Primary Phone": getPrimaryPhone(contact),
  "Primary Email": getPrimaryEmail(contact),
  Company: contact.company || "",
  "Job Title": contact.jobTitle || "",
  Tags: Array.isArray(contact.tags) ? contact.tags.join(" | ") : "",
  Favorite: contact.favorite ? "Yes" : "No",
  Notes: contact.notes || "",
});

const downloadBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};

export const exportContactsToCSV = (contacts, filePrefix = "contacts") => {
  const rows = contacts.map(flattenContact);
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);
  const csvLines = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
  ];

  const csvContent = csvLines.join("\n");
  downloadBlob(new Blob([csvContent], { type: "text/csv;charset=utf-8" }), `${filePrefix}-${today()}.csv`);
};

export const exportContactsToExcel = (contacts, filePrefix = "contacts") => {
  const rows = contacts.map(flattenContact);
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);
  const tableRows = rows
    .map(
      (row) =>
        `<tr>${headers
          .map((header) => `<td>${`${row[header] ?? ""}`.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</td>`)
          .join("")}</tr>`
    )
    .join("");

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="UTF-8" /></head>
      <body>
        <table>
          <tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr>
          ${tableRows}
        </table>
      </body>
    </html>
  `;

  downloadBlob(
    new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" }),
    `${filePrefix}-${today()}.xlsx`
  );
};

const escapeVCardValue = (value = "") =>
  `${value}`
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replaceAll("\n", "\\n");

const buildVCard = (contact) => {
  const fullName = contact.displayName || "Unnamed Contact";
  const firstName = contact.firstName || "";
  const lastName = contact.lastName || "";
  const middleName = contact.middleName || "";
  const company = contact.company || "";
  const title = contact.jobTitle || "";
  const note = contact.notes || "";

  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${escapeVCardValue(fullName)}`,
    `N:${escapeVCardValue(lastName)};${escapeVCardValue(firstName)};${escapeVCardValue(middleName)};;`,
  ];

  (contact.phones || []).forEach((phone) => {
    if (phone?.value) {
      const type = (phone.label || "CELL").toUpperCase();
      lines.push(`TEL;TYPE=${escapeVCardValue(type)}:${escapeVCardValue(phone.value)}`);
    }
  });

  (contact.emails || []).forEach((email) => {
    if (email?.value) {
      const type = (email.label || "INTERNET").toUpperCase();
      lines.push(`EMAIL;TYPE=${escapeVCardValue(type)}:${escapeVCardValue(email.value)}`);
    }
  });

  if (company) lines.push(`ORG:${escapeVCardValue(company)}`);
  if (title) lines.push(`TITLE:${escapeVCardValue(title)}`);
  if (note) lines.push(`NOTE:${escapeVCardValue(note)}`);

  lines.push("END:VCARD");
  return lines.join("\n");
};

export const exportContactsToVCard = (contacts, filePrefix = "contacts") => {
  if (!contacts.length) return;
  const vcfContent = contacts.map(buildVCard).join("\n");
  downloadBlob(new Blob([vcfContent], { type: "text/vcard;charset=utf-8" }), `${filePrefix}-${today()}.vcf`);
};
