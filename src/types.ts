export type Platform = 'instagram' | 'tiktok' | 'facebook'
export type ContentType = 'story' | 'video' | 'photo' | 'carousel'
export type PostStatus = 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed' | 'partial' | 'cancelled'
export type Role = 'Admin' | 'Editor' | 'Viewer'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  active: boolean
  initials: string
  passwordTemplate: boolean
}

export interface DriveConnection {
  provider: 'google-drive'
  accountEmail: string
  connected: boolean
  connectedAt: string | null
}

export interface Folder {
  id: string
  name: string
  parentId: string | null
  createdAt: string
}

export interface MediaFile {
  id: string
  folderId: string | null
  name: string
  originalName: string
  kind: 'image' | 'video'
  mimeType: string
  size: number
  duration?: number
  dimensions: string
  thumbnail: string
  uploadedBy: string
  createdAt: string
}

export interface PlatformResult {
  platform: Platform
  status: 'pending' | 'processing' | 'success' | 'failed' | 'cancelled'
  platformPostId?: string
  publishedAt?: string
  error?: string
  settings: Record<string, string | boolean>
}

export interface Metrics {
  views: number
  likes: number
  comments: number
  shares: number
  saves: number
  fetchedAt: string
}

export interface Post {
  id: string
  title: string
  type: ContentType
  caption: string
  hashtags: string
  mediaIds: string[]
  status: PostStatus
  scheduledAt: string | null
  createdAt: string
  createdBy: string
  platforms: PlatformResult[]
  metrics: Partial<Record<Platform, Metrics>>
}

export interface SocialAccount {
  id: string
  platform: Platform
  accountName: string
  handle: string
  status: 'connected' | 'expired' | 'error' | 'disconnected'
  expiresAt: string | null
  followers: number
}

export interface AppNotification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  read: boolean
  createdAt: string
}

export interface Activity {
  id: string
  actor: string
  action: string
  subject: string
  createdAt: string
}

export interface AppState {
  version: 1
  activeUserId: string
  users: User[]
  folders: Folder[]
  media: MediaFile[]
  posts: Post[]
  accounts: SocialAccount[]
  driveConnection: DriveConnection
  notifications: AppNotification[]
  activities: Activity[]
}

export const platformLabels: Record<Platform, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  facebook: 'Facebook',
}

export const contentLabels: Record<ContentType, string> = {
  story: 'Story',
  video: 'Video',
  photo: 'Foto',
  carousel: 'Carousel',
}
