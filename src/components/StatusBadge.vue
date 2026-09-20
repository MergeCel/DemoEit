<script setup lang="ts">
defineProps<{ status: string }>()

const labels: Record<string, string> = {
  draft: 'Draft', scheduled: 'Terjadwal', publishing: 'Memproses', published: 'Tayang', failed: 'Gagal', partial: 'Sebagian', cancelled: 'Dibatalkan',
  connected: 'Terhubung', expired: 'Kedaluwarsa', error: 'Bermasalah', disconnected: 'Terputus', pending: 'Menunggu', processing: 'Memproses', success: 'Berhasil', active: 'Aktif', inactive: 'Nonaktif',
}
</script>

<template><span class="status-badge" :class="`status-${status}`"><i />{{ labels[status] ?? status }}</span></template>
