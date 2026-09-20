<script setup lang="ts">
import { ref } from 'vue'
import { Database, Download, Info, RotateCcw, ShieldAlert, Upload } from 'lucide-vue-next'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import { useAppStore } from '../stores/app'

const store = useAppStore()
const resetOpen = ref(false)
const importInput = ref<HTMLInputElement | null>(null)
const storageSize = new Blob([JSON.stringify(store.state)]).size
</script>

<template>
  <section class="settings-grid">
    <article class="card settings-card"><span class="settings-icon"><Database :size="24"/></span><div><h2>Data prototipe</h2><p>Seluruh state aplikasi tersimpan pada <code>localStorage</code> browser ini dengan key berversi.</p><div class="storage-detail"><span>Ukuran data saat ini</span><strong>{{ (storageSize / 1024).toFixed(1) }} KB</strong></div><div class="settings-actions"><button class="button" @click="store.exportData"><Download :size="17"/> Ekspor JSON</button><button class="button" @click="importInput?.click()"><Upload :size="17"/> Impor JSON</button><input ref="importInput" hidden type="file" accept="application/json" @change="($event.target as HTMLInputElement).files?.[0] && store.importData(($event.target as HTMLInputElement).files![0])"/></div></div></article>
    <article class="card settings-card danger-settings"><span class="settings-icon"><RotateCcw :size="24"/></span><div><h2>Reset workspace</h2><p>Kembalikan folder, media, post, akun, dan notifikasi ke data demo awal.</p><button class="button button-danger" @click="resetOpen = true"><RotateCcw :size="17"/> Reset Data Demo</button></div></article>
  </section>
  <section class="prototype-notice"><ShieldAlert :size="24"/><div><h3>Batasan prototipe lokal</h3><p>Versi ini tidak menjalankan OAuth, queue worker, signed URL, API sosial media, atau scheduler di background. Publikasi dan engagement disimulasikan agar alur UI dapat direvisi.</p><ul><li>File besar tidak disimpan penuh karena localStorage umumnya dibatasi 5–10 MB.</li><li>Jadwal hanya berupa data; browser tidak dapat mengeksekusi publish ketika aplikasi ditutup.</li><li>Jangan masukkan password, token, atau kredensial nyata ke prototipe ini.</li></ul></div></section>
  <section class="card activity-card"><div class="card-section-head"><div><span class="card-icon"><Info :size="20"/></span><div><h3>Aktivitas Terbaru</h3><p>Simulasi audit trail untuk aksi workspace</p></div></div></div><div><p v-for="activity in store.state.activities" :key="activity.id"><strong>{{ activity.actor }}</strong> {{ activity.action }} <b>{{ activity.subject }}</b><span>{{ new Date(activity.createdAt).toLocaleString('id-ID') }}</span></p></div></section>
  <ConfirmDialog :open="resetOpen" title="Reset Seluruh Data Demo?" message="Perubahan yang Anda buat di browser ini akan hilang dan tidak dapat dikembalikan kecuali sudah diekspor." confirm-label="Ya, Reset" danger @close="resetOpen = false" @confirm="store.reset(); resetOpen = false"/>
</template>
