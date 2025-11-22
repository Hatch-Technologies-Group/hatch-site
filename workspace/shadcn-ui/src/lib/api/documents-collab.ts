import { apiClient } from './client'

export type FileComment = {
  id: string
  content: string
  userId: string
  organizationId: string
  pageNumber?: number | null
  x?: number | null
  y?: number | null
  width?: number | null
  height?: number | null
  createdAt: string
  updatedAt: string
}

export type FileVersion = {
  id: string
  orgFileId: string
  versionNumber: number
  storageKey: string
  createdAt: string
  createdById?: string | null
}

export type ReviewStatus = 'NONE' | 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED'

export async function fetchFileComments(orgId: string, fileId: string): Promise<FileComment[]> {
  const res = await apiClient.get(`/organizations/${orgId}/files/${fileId}/comments`)
  return res.data
}

export async function createFileComment(
  orgId: string,
  fileId: string,
  payload: {
    content: string
    pageNumber?: number
    x?: number
    y?: number
    width?: number
    height?: number
  }
): Promise<FileComment> {
  const res = await apiClient.post(`/organizations/${orgId}/files/${fileId}/comments`, payload)
  return res.data
}

export async function updateFileComment(
  orgId: string,
  fileId: string,
  commentId: string,
  payload: { content?: string }
): Promise<FileComment> {
  const res = await apiClient.patch(
    `/organizations/${orgId}/files/${fileId}/comments/${commentId}`,
    payload
  )
  return res.data
}

export async function deleteFileComment(orgId: string, fileId: string, commentId: string) {
  const res = await apiClient.delete(
    `/organizations/${orgId}/files/${fileId}/comments/${commentId}`
  )
  return res.data as { deleted: boolean }
}

export async function fetchFileVersions(orgId: string, fileId: string): Promise<FileVersion[]> {
  const res = await apiClient.get(`/organizations/${orgId}/files/${fileId}/versions`)
  return res.data
}

export async function createFileVersion(
  orgId: string,
  fileId: string,
  storageKey: string
): Promise<FileVersion> {
  const res = await apiClient.post(`/organizations/${orgId}/files/${fileId}/versions`, {
    storageKey,
  })
  return res.data
}

export async function updateFileReviewStatus(
  orgId: string,
  fileId: string,
  status: ReviewStatus
): Promise<any> {
  const res = await apiClient.patch(
    `/organizations/${orgId}/files/${fileId}/review-status`,
    { status }
  )
  return res.data
}
