<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, RouterLink, RouterView } from 'vue-router'
import { Bell, CalendarDays, ChartNoAxesCombined, ChevronDown, Cloud, HardDrive, LayoutDashboard, Menu, Plus, Settings, Share2, Users, X } from 'lucide-vue-next'
import { useAppStore } from './stores/app'

const route = useRoute()
const store = useAppStore()
const mobileMenu = ref(false)
const profileOpen = ref(false)
const pageTitle = computed(() => route.meta.title as string ?? 'SocialSync')
const pageEyebrow = computed(() => route.meta.eyebrow as string ?? '')

const primaryNav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/drive', label: 'Drive', icon: HardDrive },
  { to: '/schedule', label: 'Jadwal', icon: CalendarDays },
  { to: '/engagement', label: 'Engagement', icon: ChartNoAxesCombined },
]
const adminNav = [
  { to: '/accounts', label: 'Koneksi Akun', icon: Share2 },
  { to: '/team', label: 'Tim & Akses', icon: Users },
  { to: '/settings', label: 'Pengaturan', icon: Settings },
]
</script>

<template>
  <div class="app-shell">
    <div v-if="mobileMenu" class="mobile-scrim" @click="mobileMenu = false" />
    <aside class="sidebar" :class="{ open: mobileMenu }">
      <div class="brand"><div class="brand-mark"><Cloud :size="25" /><span /></div><div><strong>SocialSync</strong><small>Content workspace</small></div></div>
      <button class="sidebar-close" @click="mobileMenu = false"><X /></button>
      <nav class="sidebar-nav">
        <p class="nav-label">Workspace</p>
        <RouterLink v-for="item in primaryNav" :key="item.to" :to="item.to" @click="mobileMenu = false"><component :is="item.icon" :size="19" />{{ item.label }}</RouterLink>
        <p class="nav-label nav-label-spaced">Kelola</p>
        <RouterLink v-for="item in adminNav" :key="item.to" :to="item.to" @click="mobileMenu = false"><component :is="item.icon" :size="19" />{{ item.label }}</RouterLink>
      </nav>
      <div class="sidebar-tip"><span>PROTOTIPE LOKAL</span><strong>Data aman di browser ini</strong><p>Semua interaksi dapat dicoba tanpa terhubung ke API platform.</p></div>
      <div class="sidebar-user">
        <div class="avatar">{{ store.activeUser.initials }}</div>
        <div><strong>{{ store.activeUser.name }}</strong><span>{{ store.activeUser.role }}</span></div>
        <ChevronDown :size="17" />
      </div>
    </aside>

    <main class="main-column">
      <header class="topbar">
        <button class="mobile-menu-button" @click="mobileMenu = true"><Menu /></button>
        <div class="page-heading"><p>{{ pageEyebrow }}</p><h1>{{ pageTitle }}</h1></div>
        <div class="topbar-actions">
          <RouterLink v-if="!store.isViewer" to="/composer" class="button button-primary top-create"><Plus :size="18" />Buat Post</RouterLink>
          <RouterLink to="/notifications" class="icon-button notification-button" aria-label="Notifikasi"><Bell :size="20" /><b v-if="store.unreadCount">{{ store.unreadCount }}</b></RouterLink>
          <div class="profile-switcher">
            <button @click="profileOpen = !profileOpen"><span class="avatar avatar-small">{{ store.activeUser.initials }}</span><span class="profile-copy"><strong>{{ store.activeUser.name }}</strong><small>{{ store.activeUser.role }}</small></span><ChevronDown :size="15" /></button>
            <div v-if="profileOpen" class="profile-menu">
              <p>Uji tampilan sebagai</p>
              <button v-for="user in store.state.users.filter((u) => u.active)" :key="user.id" @click="store.setActiveUser(user.id); profileOpen = false"><span class="avatar avatar-small">{{ user.initials }}</span><span><strong>{{ user.name }}</strong><small>{{ user.role }}</small></span></button>
            </div>
          </div>
        </div>
      </header>
      <div class="page-container"><RouterView /></div>
    </main>

    <Transition name="toast">
      <div v-if="store.toast" class="toast" :class="`toast-${store.toast.type}`"><i /><div><strong>{{ store.toast.title }}</strong><p>{{ store.toast.message }}</p></div><button @click="store.toast = null"><X :size="17" /></button></div>
    </Transition>
  </div>
</template>
