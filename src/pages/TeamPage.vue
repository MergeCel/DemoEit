<script setup lang="ts">
import { ref } from 'vue'
import { Plus, Shield, UserCheck, UserRoundCog, Users, X } from 'lucide-vue-next'
import StatusBadge from '../components/StatusBadge.vue'
import { useAppStore } from '../stores/app'
import type { Role } from '../types'

const store = useAppStore()
const modalOpen = ref(false)
const form = ref({ name: '', email: '', role: 'Editor' as Role })
const roleCopy: Record<Role, string> = { Admin: 'Akses penuh termasuk akun sosial dan pengguna.', Editor: 'Kelola media, post, dan jadwal publikasi.', Viewer: 'Hanya melihat dashboard dan engagement.' }

function add() {
  if (!form.value.name.trim() || !form.value.email.trim()) return
  store.addUser(form.value)
  modalOpen.value = false
  form.value = { name: '', email: '', role: 'Editor' }
}
</script>

<template>
  <section class="team-stats"><article><span><Users :size="22"/></span><div><strong>{{ store.state.users.length }}</strong><p>Total pengguna</p></div></article><article><span><Shield :size="22"/></span><div><strong>{{ store.state.users.filter((user) => user.role === 'Admin').length }}</strong><p>Administrator</p></div></article><article><span><UserCheck :size="22"/></span><div><strong>{{ store.state.users.filter((user) => user.active).length }}</strong><p>Akun aktif</p></div></article></section>
  <section class="card team-card"><div class="card-section-head"><div><span class="card-icon"><UserRoundCog :size="20"/></span><div><h3>Anggota Tim</h3><p>Akses aplikasi internal tanpa pendaftaran publik</p></div></div><button v-if="store.isAdmin" class="button button-primary" @click="modalOpen = true"><Plus :size="18"/> Tambah Pengguna</button></div><div class="team-list"><article v-for="user in store.state.users" :key="user.id"><div class="avatar">{{ user.initials }}</div><div class="team-identity"><strong>{{ user.name }} <small v-if="user.id === store.activeUser.id">Anda</small></strong><span>{{ user.email }}</span></div><div class="role-chip" :class="`role-${user.role.toLowerCase()}`"><Shield :size="14"/>{{ user.role }}</div><p>{{ roleCopy[user.role] }}</p><StatusBadge :status="user.active ? 'active' : 'inactive'"/><button v-if="store.isAdmin && user.id !== store.activeUser.id" class="button button-small" @click="store.toggleUser(user.id)">{{ user.active ? 'Nonaktifkan' : 'Aktifkan' }}</button></article></div></section>
  <div v-if="!store.isAdmin" class="role-notice"><Shield :size="19"/><p>Pengelolaan pengguna hanya tersedia untuk Admin. Gunakan pemilih profil di kanan atas untuk menguji peran berbeda.</p></div>
  <div v-if="modalOpen" class="modal-backdrop" @click.self="modalOpen = false"><form class="modal-card compact-modal" @submit.prevent="add"><button type="button" class="icon-button close-button" @click="modalOpen = false"><X :size="20"/></button><span class="modal-kicker">AKSES INTERNAL</span><h2>Tambah pengguna</h2><p>Undang anggota tim ke workspace SocialSync.</p><label>Nama lengkap<input v-model="form.name" placeholder="Nama anggota tim"/></label><label>Email kerja<input v-model="form.email" type="email" placeholder="nama@perusahaan.com"/></label><label>Role<select v-model="form.role"><option value="Admin">Admin</option><option value="Editor">Editor</option><option value="Viewer">Viewer</option></select><small>{{ roleCopy[form.role] }}</small></label><button class="button button-primary button-full" :disabled="!form.name || !form.email"><Plus :size="18"/> Tambah Pengguna</button></form></div>
</template>
