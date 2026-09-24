import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { createSeed } from '../data/seed'
import type { AppNotification, AppState, ContentType, MediaFile, Platform, Post, SocialAccount, User } from '../types'

const STORAGE_KEY = 'socialsync:prototype:v1'

function migrateState(state: AppState): AppState {
  state.users = state.users.map((user) => ({ ...user, passwordTemplate: user.passwordTemplate ?? true }))
  // The earlier email-only Drive simulation was not real OAuth. Keep it disconnected until a backend owns token exchange.
  state.driveConnection = { provider: 'google-drive', accountEmail: '', connected: false, connectedAt: null }
  return state
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createSeed()
    const parsed = JSON.parse(raw) as AppState
    if (parsed.version !== 1) return createSeed()
    return migrateState(parsed)
  } catch {
    return createSeed()
  }
}

const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

export const useAppStore = defineStore('app', () => {
  const state = ref<AppState>(loadState())
  const toast = ref<{ type: AppNotification['type']; title: string; message: string } | null>(null)

  const activeUser = computed(() => state.value.users.find((user) => user.id === state.value.activeUserId) ?? state.value.users[0])
  const unreadCount = computed(() => state.value.notifications.filter((notification) => !notification.read).length)
  const isViewer = computed(() => activeUser.value?.role === 'Viewer')
  const isAdmin = computed(() => activeUser.value?.role === 'Admin')

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.value))
    } catch {
      notify('error', 'Penyimpanan browser penuh', 'Hapus beberapa media lokal atau reset data demo untuk melanjutkan.')
    }
  }

  function notify(type: AppNotification['type'], title: string, message: string, permanent = false) {
    toast.value = { type, title, message }
    if (permanent) {
      state.value.notifications.unshift({ id: id('notif'), type, title, message, read: false, createdAt: new Date().toISOString() })
      persist()
    }
    window.setTimeout(() => {
      if (toast.value?.title === title) toast.value = null
    }, 4200)
  }

  function setActiveUser(userId: string) {
    state.value.activeUserId = userId
    persist()
  }

  function addFolder(name: string) {
    state.value.folders.push({ id: id('folder'), name: name.trim(), parentId: null, createdAt: new Date().toISOString() })
    persist()
    notify('success', 'Folder dibuat', `${name.trim()} siap digunakan.`)
  }

  function renameFolder(folderId: string, name: string) {
    const folder = state.value.folders.find((item) => item.id === folderId)
    if (folder) folder.name = name.trim()
    persist()
  }

  function deleteFolder(folderId: string) {
    state.value.media.forEach((media) => {
      if (media.folderId === folderId) media.folderId = null
    })
    state.value.folders = state.value.folders.filter((folder) => folder.id !== folderId)
    persist()
    notify('success', 'Folder dihapus', 'File di dalamnya dipindahkan ke Semua Media.')
  }

  function addMedia(media: Omit<MediaFile, 'id' | 'createdAt' | 'uploadedBy'>) {
    state.value.media.unshift({ ...media, id: id('media'), uploadedBy: activeUser.value.id, createdAt: new Date().toISOString() })
    persist()
    notify('success', 'Media ditambahkan', `${media.name} tersimpan di Drive.`)
  }

  function renameMedia(mediaId: string, name: string) {
    const media = state.value.media.find((item) => item.id === mediaId)
    if (media) media.name = name.trim()
    persist()
  }

  function moveMedia(mediaId: string, folderId: string | null) {
    const media = state.value.media.find((item) => item.id === mediaId)
    if (media) media.folderId = folderId
    persist()
    notify('success', 'Media dipindahkan', `${media?.name ?? 'Media'} berhasil dipindahkan.`)
  }

  function deleteMedia(mediaId: string) {
    const used = state.value.posts.some((post) => post.mediaIds.includes(mediaId) && ['scheduled', 'publishing'].includes(post.status))
    if (used) {
      notify('error', 'Media tidak dapat dihapus', 'File masih digunakan oleh post terjadwal atau sedang dipublikasikan.')
      return false
    }
    state.value.media = state.value.media.filter((media) => media.id !== mediaId)
    persist()
    notify('success', 'Media dihapus', 'File telah dihapus dari Drive.')
    return true
  }

  function savePost(input: {
    id?: string
    title: string
    type: ContentType
    caption: string
    hashtags: string
    mediaIds: string[]
    platforms: Platform[]
    scheduledAt: string | null
    settings: Partial<Record<Platform, Record<string, string | boolean>>>
    asDraft?: boolean
  }) {
    const existing = input.id ? state.value.posts.find((post) => post.id === input.id) : undefined
    const now = new Date().toISOString()
    const post: Post = {
      id: existing?.id ?? id('post'),
      title: input.title.trim(),
      type: input.type,
      caption: input.caption.trim(),
      hashtags: input.hashtags.trim(),
      mediaIds: [...input.mediaIds],
      status: input.asDraft ? 'draft' : input.scheduledAt ? 'scheduled' : 'publishing',
      scheduledAt: input.scheduledAt,
      createdAt: existing?.createdAt ?? now,
      createdBy: existing?.createdBy ?? activeUser.value.id,
      platforms: input.platforms.map((platform) => ({ platform, status: input.asDraft || input.scheduledAt ? 'pending' : 'processing', settings: input.settings[platform] ?? {} })),
      metrics: existing?.metrics ?? {},
    }
    if (existing) Object.assign(existing, post)
    else state.value.posts.unshift(post)
    state.value.activities.unshift({ id: id('activity'), actor: activeUser.value.name, action: input.asDraft ? 'menyimpan draft' : input.scheduledAt ? 'menjadwalkan' : 'mengirim untuk publikasi', subject: post.title, createdAt: now })
    persist()
    if (input.scheduledAt) notify('success', 'Post dijadwalkan', `${post.title} masuk ke kalender.`, true)
    return post
  }

  function deleteDraft(postId: string) {
    const draft = state.value.posts.find((post) => post.id === postId && post.status === 'draft')
    if (!draft) return
    state.value.posts = state.value.posts.filter((post) => post.id !== postId)
    state.value.activities.unshift({ id: id('activity'), actor: activeUser.value.name, action: 'menghapus draft', subject: draft.title, createdAt: new Date().toISOString() })
    persist()
    notify('success', 'Draft dihapus', `${draft.title} telah dihapus.`)
  }

  function finishPublishing(postId: string, forcedFailure?: Platform) {
    const post = state.value.posts.find((item) => item.id === postId)
    if (!post) return
    post.platforms.forEach((result) => {
      const failed = result.platform === forcedFailure
      result.status = failed ? 'failed' : 'success'
      result.error = failed ? 'Simulasi: token platform perlu diperbarui.' : undefined
      result.platformPostId = failed ? undefined : `demo-${result.platform}-${Date.now()}`
      result.publishedAt = failed ? undefined : new Date().toISOString()
      if (!failed) {
        const base = result.platform === 'tiktok' ? 1800 : result.platform === 'instagram' ? 1200 : 700
        post.metrics[result.platform] = { views: base, likes: Math.round(base * 0.12), comments: 18, shares: 24, saves: 31, fetchedAt: new Date().toISOString() }
      }
    })
    const successes = post.platforms.filter((item) => item.status === 'success').length
    post.status = successes === post.platforms.length ? 'published' : successes ? 'partial' : 'failed'
    persist()
    notify(post.status === 'published' ? 'success' : 'warning', post.status === 'published' ? 'Publikasi selesai' : 'Publikasi selesai sebagian', `${post.title}: ${successes} dari ${post.platforms.length} platform berhasil.`, true)
  }

  function cancelPost(postId: string) {
    const post = state.value.posts.find((item) => item.id === postId)
    if (!post || post.status !== 'scheduled') return
    post.status = 'cancelled'
    post.platforms.forEach((platform) => { platform.status = 'cancelled' })
    persist()
    notify('success', 'Jadwal dibatalkan', `${post.title} tidak akan dipublikasikan.`)
  }

  function markNotification(id: string) {
    const notification = state.value.notifications.find((item) => item.id === id)
    if (notification) notification.read = true
    persist()
  }

  function markAllNotifications() {
    state.value.notifications.forEach((item) => { item.read = true })
    persist()
  }

  function updateAccount(accountId: string, status: SocialAccount['status']) {
    const account = state.value.accounts.find((item) => item.id === accountId)
    if (!account) return
    account.status = status
    if (status === 'connected') account.expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()
    persist()
    notify(status === 'connected' ? 'success' : 'warning', status === 'connected' ? 'Akun terhubung' : 'Koneksi diputus', `${account.accountName} kini berstatus ${status}.`)
  }

  function addAccount(platform: Platform, accountName: string, handle: string) {
    state.value.accounts.push({ id: id('account'), platform, accountName, handle, status: 'connected', expiresAt: new Date(Date.now() + 60 * 86400000).toISOString(), followers: 0 })
    persist()
    notify('success', 'Akun terhubung', `${accountName} siap digunakan.`)
  }

  function addUser(input: Omit<User, 'id' | 'initials' | 'active' | 'passwordTemplate'>) {
    const initials = input.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
    state.value.users.push({ ...input, id: id('user'), initials, active: true, passwordTemplate: true })
    persist()
    notify('success', 'Pengguna ditambahkan', `${input.name} mendapat akses sebagai ${input.role}.`)
  }

  function toggleUser(userId: string) {
    const user = state.value.users.find((item) => item.id === userId)
    if (user && user.id !== activeUser.value.id) user.active = !user.active
    persist()
  }

  function reset() {
    state.value = createSeed()
    persist()
    notify('success', 'Data demo dipulihkan', 'Semua data kembali ke kondisi awal.')
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(state.value, null, 2)], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `socialsync-backup-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  async function importData(file: File) {
    try {
      const parsed = JSON.parse(await file.text()) as AppState
      if (parsed.version !== 1 || !Array.isArray(parsed.posts)) throw new Error('invalid')
      state.value = migrateState(parsed)
      persist()
      notify('success', 'Data berhasil diimpor', 'Workspace dipulihkan dari file JSON.')
    } catch {
      notify('error', 'File tidak valid', 'Gunakan file ekspor SocialSync versi 1.')
    }
  }

  return {
    state, toast, activeUser, unreadCount, isViewer, isAdmin, setActiveUser, addFolder, renameFolder,
    deleteFolder, addMedia, renameMedia, moveMedia, deleteMedia, savePost, deleteDraft, finishPublishing, cancelPost,
    markNotification, markAllNotifications, updateAccount, addAccount, addUser, toggleUser, reset,
    exportData, importData, notify,
  }
})
