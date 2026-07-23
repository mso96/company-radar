import type { PostalAddress } from "@/lib/agency/types"

export interface DirectMailLetterInput {
  companyName: string
  address: PostalAddress
  html: string
  tags: string
  idempotencyKey: string
  test?: boolean
}

export interface DirectMailLetterResult {
  id: string
  status: string
  costPence?: number
  pdfUrl?: string
}

export interface DirectMailProvider {
  createLetter(input: DirectMailLetterInput): Promise<DirectMailLetterResult>
  createTestPdf(input: Omit<DirectMailLetterInput, "test">): Promise<DirectMailLetterResult>
  getStatus(id: string): Promise<DirectMailLetterResult>
  cancelLetter(id: string): Promise<void>
}
