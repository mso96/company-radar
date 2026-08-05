import { getAgencyRuntimeEnv } from "@/lib/agency/runtime"

export async function GET(_: Request, { params }: { params: Promise<{ workspaceId: string; fileName: string }> }) {
  const { workspaceId, fileName } = await params
  if (!/^[0-9a-f-]{36}$/i.test(workspaceId) || !/^[0-9a-f-]{36}\.(png|jpg|webp|svg)$/i.test(fileName)) return new Response("Not found", { status: 404 })
  const bucket = (await getAgencyRuntimeEnv()).AGENCY_ASSETS
  if (!bucket) return new Response("Not found", { status: 404 })
  const object = await bucket.get(`${workspaceId}/${fileName}`)
  if (!object) return new Response("Not found", { status: 404 })
  const contentType = fileName.endsWith(".png") ? "image/png" : fileName.endsWith(".jpg") ? "image/jpeg" : fileName.endsWith(".webp") ? "image/webp" : "image/svg+xml"
  return new Response(object.body, { headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=31536000, immutable", ETag: object.httpEtag } })
}
