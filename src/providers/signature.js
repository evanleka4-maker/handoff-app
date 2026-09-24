// SignatureProvider — generates a lease PDF and handles the sign flow.
// Free implementation: builds a real PDF with pdf-lib and "signs" it by
// re-rendering the document with a signature line, typed name, and
// timestamp burned in — a functioning e-sign flow, just without identity
// verification, audit-trail certification, or legal admissibility.
//
// --- Swapping to DocuSign later ---
// Implement the same two functions against the DocuSign eSignature API:
//   generateLeaseDocument(lease) -> still build the source PDF the same way
//   sendForSignature({ lease, resident }) -> call DocuSign's envelopes API
//     instead of writing "sent" locally, store the returned envelopeId as
//     providerRef, and add a webhook route that flips status to "signed"
//     when DocuSign calls back (instead of the local /sign endpoint).
// Every caller (src/routes/leases.js) only calls these two functions and
// reads back { pdfPath, providerRef } — nothing else changes.

const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
const fs = require("node:fs");
const path = require("node:path");

const LEASE_DIR = process.env.LEASE_DIR || path.join(__dirname, "../../data/leases");
fs.mkdirSync(LEASE_DIR, { recursive: true });

async function generateLeaseDocument({ lease, unit, resident, property }) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]); // US letter
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let y = 730;
  const line = (text, opts = {}) => {
    page.drawText(text, {
      x: 56,
      y,
      size: opts.size || 11,
      font: opts.bold ? bold : font,
      color: rgb(0.11, 0.13, 0.17),
    });
    y -= opts.gap || 20;
  };

  line("RESIDENTIAL LEASE AGREEMENT", { size: 18, bold: true, gap: 30 });
  line(property?.name || "Property", { size: 13, bold: true, gap: 22 });
  line(property?.address || "", { size: 10, gap: 26 });

  line(`Unit: ${unit?.label || "-"}`, { gap: 18 });
  line(`Resident: ${resident?.name || "-"}`, { gap: 18 });
  line(`Term: ${lease.term_start || "TBD"} through ${lease.term_end || "TBD"}`, { gap: 18 });
  line(`Monthly rent: ${lease.monthly_rent ? `$${lease.monthly_rent}` : "TBD"}`, { gap: 30 });

  line(
    "This lease is generated automatically from unit and resident data on file. By signing",
    { size: 10, gap: 14 }
  );
  line(
    "below, the resident agrees to the term and rent stated above and to the property's",
    { size: 10, gap: 14 }
  );
  line("standard house rules on file with management.", { size: 10, gap: 40 });

  line("_______________________________", { gap: 16 });
  line("Resident signature", { size: 9, gap: 30 });

  fs.writeFileSync(pdfPathFor(lease.id), await doc.save());
  return { pdfPath: pdfPathFor(lease.id) };
}

async function markSigned({ lease, unit, resident, property, signedAt }) {
  // Re-render the same document with the signature line filled in, so the
  // stored PDF reflects a genuinely signed document rather than just a DB flag.
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let y = 730;
  const line = (text, opts = {}) => {
    page.drawText(text, {
      x: 56,
      y,
      size: opts.size || 11,
      font: opts.bold ? bold : font,
      color: opts.color || rgb(0.11, 0.13, 0.17),
    });
    y -= opts.gap || 20;
  };

  line("RESIDENTIAL LEASE AGREEMENT", { size: 18, bold: true, gap: 30 });
  line(property?.name || "Property", { size: 13, bold: true, gap: 22 });
  line(property?.address || "", { size: 10, gap: 26 });
  line(`Unit: ${unit?.label || "-"}`, { gap: 18 });
  line(`Resident: ${resident?.name || "-"}`, { gap: 18 });
  line(`Term: ${lease.term_start || "TBD"} through ${lease.term_end || "TBD"}`, { gap: 18 });
  line(`Monthly rent: ${lease.monthly_rent ? `$${lease.monthly_rent}` : "TBD"}`, { gap: 40 });

  line(`Signed: ${resident?.name || "-"}`, { size: 12, bold: true, gap: 16 });
  line(`Timestamp: ${signedAt}`, { size: 9, gap: 14 });
  line("Signed electronically via Handoff", {
    size: 9,
    gap: 14,
    color: rgb(0.18, 0.49, 0.33),
  });

  fs.writeFileSync(pdfPathFor(lease.id), await doc.save());
  return { pdfPath: pdfPathFor(lease.id) };
}

function pdfPathFor(leaseId) {
  return path.join(LEASE_DIR, `${leaseId}.pdf`);
}

module.exports = { generateLeaseDocument, markSigned, pdfPathFor };
