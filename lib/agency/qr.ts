import QRCode from "qrcode"

export function qrSvgDataUrl(value: string, dark = "#111827") {
  const qr = QRCode.create(value, { errorCorrectionLevel: "M" })
  const size = qr.modules.size
  const cells = qr.modules.data
  let path = ""
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) if (cells[y * size + x]) path += `M${x + 2} ${y + 2}h1v1h-1z`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size + 4} ${size + 4}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="white"/><path d="${path}" fill="${dark}"/></svg>`
  return `data:image/svg+xml;base64,${toBase64(svg)}`
}

function toBase64(value: string) {
  const bytes = new TextEncoder().encode(value)
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}
