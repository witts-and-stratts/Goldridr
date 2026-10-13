const encoder = new TextEncoder();

function escapePdfText(value: string): string {
  return value.replace(/[\\()]/g, "\\$&").replace(/[^\x20-\x7e]/g, "?");
}

export function createDocumentPdf(title: string, lines: Array<{ text: string; emphasis?: boolean }>): Uint8Array {
  const content = ["BT", "/F2 18 Tf", "72 760 Td", `(${escapePdfText(title)}) Tj`, "0 -30 Td", ...lines.flatMap(({ text, emphasis }) => [`/${emphasis ? "F2" : "F1"} ${emphasis ? 11 : 10} Tf`, `(${escapePdfText(text)}) Tj`, "0 -18 Td"]), "ET"].join("\n");
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>", `<< /Length ${encoder.encode(content).length} >>\nstream\n${content}\nendstream`, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(encoder.encode(pdf).length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = encoder.encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return encoder.encode(pdf);
}
