export interface BrowserPdfBinding { quickAction(action: "pdf", input: { html: string; pdfOptions: Record<string, unknown> }): Promise<Response> }

export async function renderA4Pdf(browser: BrowserPdfBinding, letterHtml: string) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>@page{size:A4 portrait;margin:12mm}html,body{margin:0;padding:0;background:#fff}body{width:186mm}article{box-sizing:border-box!important;width:186mm!important;max-width:186mm!important;min-height:273mm!important;padding:10mm!important;overflow:hidden!important}</style></head><body>${letterHtml}</body></html>`
  const response = await browser.quickAction("pdf", { html, pdfOptions: { format: "a4", landscape: false, scale: 1, printBackground: true, displayHeaderFooter: false, preferCSSPageSize: true, margin: { top: "0px", right: "0px", bottom: "0px", left: "0px" } } })
  if (!response.ok) throw new Error(`PDF rendering failed (${response.status}).`)
  const pdf = await response.arrayBuffer()
  const pages = (new TextDecoder("latin1").decode(pdf).match(/\/Type\s*\/Page\b/g) ?? []).length
  if (pages > 1) throw new Error("This letter runs beyond one A4 page. Shorten the content before approval.")
  if (pdf.byteLength < 5 || new TextDecoder().decode(pdf.slice(0, 5)) !== "%PDF-") throw new Error("The PDF renderer returned an invalid document.")
  return pdf
}

export async function renderHash(html: string, addressJson: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${html}\n${addressJson}`))
  return Array.from(new Uint8Array(bytes)).map((byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 24)
}
