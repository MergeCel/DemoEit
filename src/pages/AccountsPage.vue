<script setup lang="ts">
import { ref } from 'vue'
import { AlertTriangle, CheckCircle2, Cloud, HardDrive, Link2, LockKeyhole, Plus, RefreshCw, ShieldCheck, Unplug, Upload, X } from 'lucide-vue-next'
import PlatformIcon from '../components/PlatformIcon.vue'
import StatusBadge from '../components/StatusBadge.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import { useAppStore } from '../stores/app'
import type { Platform } from '../types'
import { formatDate, formatNumber } from '../utils'

const store = useAppStore()
const disconnectTarget = ref<string | null>(null)
const connectOpen = ref(false)
const connectForm = ref({ platform: 'instagram' as Platform, name: '', handle: '' })

function connect() {
  if (!connectForm.value.name.trim() || !connectForm.value.handle.trim()) return
  store.addAccount(connectForm.value.platform, connectForm.value.name, connectForm.value.handle)
  connectOpen.value = false
  connectForm.value = { platform: 'instagram', name: '', handle: '' }
}

</script>

<template>
  <div class="section-title account-section-title"><div><p>SUMBER MEDIA</p><h2>Drive pengguna</h2></div><RouterLink v-if="!store.isViewer" to="/drive" class="button"><Upload :size="18"/> Upload dari perangkat</RouterLink></div>
  <section class="card drive-connection-card">
    <span class="drive-provider-icon"><Cloud :size="26"/></span>
    <div><span class="demo-chip">MENUNGGU BACKEND</span><h3>Google Drive</h3><p>OAuth Google Drive belum diaktifkan. Integrasi akan dilanjutkan setelah backend tersedia agar pertukaran dan penyimpanan token ditangani dengan aman.</p></div>
    <div class="drive-connection-actions" v-if="!store.isViewer"><button class="button button-primary" disabled title="OAuth diaktifkan setelah backend tersedia"><LockKeyhole :size="18"/> Belum tersedia</button><RouterLink to="/drive" class="button"><HardDrive :size="17"/> Buka Media Library</RouterLink></div>
  </section>
  <div class="section-title"><div><p>SALURAN PUBLIKASI</p><h2>Akun yang terhubung</h2></div><button v-if="store.isAdmin" class="button button-primary" @click="connectOpen = true"><Plus :size="18"/> Hubungkan Akun</button></div>
  <section class="account-grid">
    <article v-for="account in store.state.accounts" :key="account.id" class="card account-card" :class="`account-${account.status}`"><header><PlatformIcon :platform="account.platform" size="lg"/><StatusBadge :status="account.status"/></header><h3>{{ account.accountName }}</h3><p>{{ account.handle }}</p><div class="account-stats"><div><span>Pengikut</span><strong>{{ formatNumber(account.followers) }}</strong></div><div><span>Token berlaku hingga</span><strong>{{ account.expiresAt ? formatDate(account.expiresAt) : '—' }}</strong></div></div><div v-if="account.status === 'expired'" class="account-alert"><AlertTriangle :size="17"/><span>Jadwal ke platform ini berisiko gagal.</span></div><div v-else class="account-ok"><CheckCircle2 :size="17"/><span>Siap menerima post baru</span></div><footer v-if="store.isAdmin"><button v-if="account.status !== 'connected'" class="button button-primary" @click="store.updateAccount(account.id, 'connected')"><RefreshCw :size="17"/> Autentikasi Ulang</button><button v-else class="button" @click="store.updateAccount(account.id, 'connected')"><RefreshCw :size="17"/> Refresh</button><button class="button button-text-danger" @click="disconnectTarget = account.id"><Unplug :size="17"/> Putuskan</button></footer></article>
  </section>
  <div v-if="!store.isAdmin" class="role-notice"><ShieldCheck :size="19"/><p>Hanya Admin yang dapat menghubungkan atau memutus akun. Anda sedang melihat halaman ini sebagai <strong>{{ store.activeUser.role }}</strong>.</p></div>
  <div v-if="connectOpen" class="modal-backdrop" @click.self="connectOpen = false"><form class="modal-card compact-modal" @submit.prevent="connect"><button type="button" class="icon-button close-button" @click="connectOpen = false"><X :size="20"/></button><span class="modal-kicker">DEMO · SIMULASI OAUTH</span><h2>Hubungkan akun</h2><p>Pilih platform dan isi identitas akun demo untuk pengujian. Dialog ini digantikan OAuth asli pada full launch.</p><label>Platform<select v-model="connectForm.platform"><option value="instagram">Instagram</option><option value="tiktok">TikTok</option><option value="facebook">Facebook</option></select></label><label>Nama akun<input v-model="connectForm.name" placeholder="Contoh: Brand Indonesia"/></label><label>Handle<input v-model="connectForm.handle" placeholder="@username"/></label><button class="button button-primary button-full" :disabled="!connectForm.name || !connectForm.handle"><Link2 :size="18"/> Simulasikan OAuth</button></form></div>
  <ConfirmDialog :open="Boolean(disconnectTarget)" title="Putuskan Koneksi Akun?" :message="`Anda akan memutus koneksi ${store.state.accounts.find((item) => item.id === disconnectTarget)?.accountName ?? ''}. Post terjadwal yang memakai akun ini berisiko dibatalkan.`" confirm-label="Ya, Putuskan" danger @close="disconnectTarget = null" @confirm="disconnectTarget && store.updateAccount(disconnectTarget, 'disconnected'); disconnectTarget = null"/>
</template>
