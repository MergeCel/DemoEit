<script setup lang="ts">
import { computed, ref } from 'vue'
import { FileVideo, Folder, FolderOpen, Grid2X2, Image, List, MoreHorizontal, Plus, Search, SlidersHorizontal, Upload, X } from 'lucide-vue-next'
import { useAppStore } from '../stores/app'
import { formatBytes, formatDate } from '../utils'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import EmptyState from '../components/EmptyState.vue'

const store = useAppStore()
const query = ref('')
const kind = ref('all')
const folderId = ref<string | null>(null)
const view = ref<'grid' | 'list'>('grid')
const createFolderOpen = ref(false)
const uploadOpen = ref(false)
const newFolderName = ref('')
const selected = ref<string | null>(null)
const deleteTarget = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const customName = ref('')
const pendingFile = ref<File | null>(null)

const media = computed(() => store.state.media.filter((item) => {
  const matchesQuery = item.name.toLowerCase().includes(query.value.toLowerCase())
  const matchesKind = kind.value === 'all' || item.kind === kind.value
  const matchesFolder = folderId.value === null || item.folderId === folderId.value
  return matchesQuery && matchesKind && matchesFolder
}))

function createFolder() {
  if (!newFolderName.value.trim()) return
  store.addFolder(newFolderName.value)
  newFolderName.value = ''
  createFolderOpen.value = false
}

function chooseFile(event: Event) {
  const target = event.target as HTMLInputElement
  pendingFile.value = target.files?.[0] ?? null
  if (pendingFile.value) customName.value = pendingFile.value.name.replace(/\.[^/.]+$/, '')
}

function upload() {
  if (!pendingFile.value || !customName.value.trim()) return
  const isImage = pendingFile.value.type.startsWith('image/')
  const url = isImage ? URL.createObjectURL(pendingFile.value) : 'https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&w=900&q=80'
  store.addMedia({ folderId: folderId.value, name: customName.value, originalName: pendingFile.value.name, kind: isImage ? 'image' : 'video', mimeType: pendingFile.value.type, size: pendingFile.value.size, dimensions: 'Belum dianalisis', thumbnail: url })
  pendingFile.value = null
  customName.value = ''
  uploadOpen.value = false
}
</script>

<template>
  <div class="page-toolbar">
    <div class="search-box"><Search :size="18"/><input v-model="query" placeholder="Cari nama media..." /></div>
    <select v-model="kind" class="select-control"><option value="all">Semua tipe</option><option value="image">Foto</option><option value="video">Video</option></select>
    <div class="view-switch"><button :class="{ active: view === 'grid' }" @click="view = 'grid'"><Grid2X2 :size="18"/></button><button :class="{ active: view === 'list' }" @click="view = 'list'"><List :size="19"/></button></div>
    <button v-if="!store.isViewer" class="button" @click="createFolderOpen = true"><Folder :size="18"/> Folder Baru</button>
    <button v-if="!store.isViewer" class="button button-primary" @click="uploadOpen = true"><Upload :size="18"/> Upload Media</button>
  </div>

  <section class="storage-summary">
    <div><span class="storage-icon"><HardDriveIcon /></span><div><strong>Penyimpanan prototipe</strong><p>{{ store.state.media.length }} file tersimpan sebagai metadata browser</p></div></div>
    <div class="storage-bar"><span style="width: 32%" /></div><small>Simulasi 1,6 GB dari 5 GB</small>
  </section>

  <section class="folder-section">
    <div class="mini-section-title"><div><h2>Folder</h2><span>{{ store.state.folders.length }} folder</span></div><button @click="folderId = null">Lihat semua media</button></div>
    <div class="folder-grid">
      <button v-for="folder in store.state.folders" :key="folder.id" class="folder-card" :class="{ active: folderId === folder.id }" @click="folderId = folder.id"><span><FolderOpen :size="23" /></span><div><strong>{{ folder.name }}</strong><small>{{ store.state.media.filter((media) => media.folderId === folder.id).length }} file</small></div><MoreHorizontal :size="18" /></button>
    </div>
  </section>

  <section class="media-section">
    <div class="mini-section-title"><div><h2>{{ folderId ? store.state.folders.find((folder) => folder.id === folderId)?.name : 'Semua Media' }}</h2><span>{{ media.length }} file</span></div><button><SlidersHorizontal :size="16"/> Filter lanjutan</button></div>
    <div v-if="media.length" class="media-grid" :class="{ 'media-list-view': view === 'list' }">
      <article v-for="item in media" :key="item.id" class="media-card" :class="{ selected: selected === item.id }" @click="selected = selected === item.id ? null : item.id">
        <div class="media-thumb"><img :src="item.thumbnail" :alt="item.name"/><span class="media-kind"><component :is="item.kind === 'video' ? FileVideo : Image" :size="15"/>{{ item.kind === 'video' ? `${item.duration ?? 0} dtk` : 'Foto' }}</span><button @click.stop="selected = item.id"><MoreHorizontal :size="18" /></button></div>
        <div class="media-info"><strong>{{ item.name }}</strong><p>{{ item.dimensions }} · {{ formatBytes(item.size) }}</p><span>{{ formatDate(item.createdAt) }}</span></div>
        <div v-if="selected === item.id && !store.isViewer" class="media-actions" @click.stop>
          <select :value="item.folderId ?? ''" @change="store.moveMedia(item.id, ($event.target as HTMLSelectElement).value || null)"><option value="">Semua Media</option><option v-for="folder in store.state.folders" :key="folder.id" :value="folder.id">{{ folder.name }}</option></select>
          <button @click="deleteTarget = item.id">Hapus</button>
        </div>
      </article>
    </div>
    <EmptyState v-else title="Media tidak ditemukan" message="Coba ubah kata kunci, tipe file, atau pilih folder lain." />
  </section>

  <div v-if="createFolderOpen" class="modal-backdrop" @click.self="createFolderOpen = false"><form class="modal-card compact-modal" @submit.prevent="createFolder"><button type="button" class="icon-button close-button" @click="createFolderOpen = false"><X :size="20"/></button><span class="modal-kicker">ORGANISASI DRIVE</span><h2>Buat folder baru</h2><p>Kelompokkan aset agar mudah ditemukan oleh seluruh tim.</p><label>Nama folder<input v-model="newFolderName" autofocus maxlength="60" placeholder="Contoh: Kampanye Oktober" /></label><button class="button button-primary button-full" :disabled="!newFolderName.trim()"><Plus :size="18"/> Buat Folder</button></form></div>
  <div v-if="uploadOpen" class="modal-backdrop" @click.self="uploadOpen = false"><form class="modal-card upload-modal" @submit.prevent="upload"><button type="button" class="icon-button close-button" @click="uploadOpen = false"><X :size="20"/></button><span class="modal-kicker">MEDIA LIBRARY</span><h2>Upload media</h2><p>Untuk prototipe, file disimpan sebagai pratinjau lokal. Maksimal disarankan 1 MB.</p><button type="button" class="drop-zone" @click="fileInput?.click()"><Upload :size="28"/><strong>{{ pendingFile?.name ?? 'Pilih foto atau video' }}</strong><span>JPG, PNG, WEBP, MP4, atau MOV</span></button><input ref="fileInput" hidden type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime" @change="chooseFile"/><label>Nama file di SocialSync<input v-model="customName" placeholder="Nama yang mudah dicari" /></label><button class="button button-primary button-full" :disabled="!pendingFile || !customName.trim()">Simpan ke Drive</button></form></div>
  <ConfirmDialog :open="Boolean(deleteTarget)" title="Hapus File Ini?" :message="`File ${store.state.media.find((item) => item.id === deleteTarget)?.name ?? ''} akan dihapus permanen dari penyimpanan lokal.`" confirm-label="Ya, Hapus" danger @close="deleteTarget = null" @confirm="deleteTarget && store.deleteMedia(deleteTarget); deleteTarget = null" />
</template>

<script lang="ts">
import { HardDrive as HardDriveIcon } from 'lucide-vue-next'
</script>
