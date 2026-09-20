<script setup lang="ts">
import { computed } from 'vue'
import { ArrowRight, CalendarClock, ChevronRight, Eye, Heart, MessageCircle, MousePointer2, Plus, Share2, Sparkles, TrendingDown, TrendingUp } from 'lucide-vue-next'
import { RouterLink } from 'vue-router'
import PlatformIcon from '../components/PlatformIcon.vue'
import StatusBadge from '../components/StatusBadge.vue'
import { useAppStore } from '../stores/app'
import type { Platform, Post } from '../types'
import { engagement, formatDate, formatNumber, isThisMonth } from '../utils'

const store = useAppStore()
const platforms: Platform[] = ['instagram', 'tiktok', 'facebook']
const published = computed(() => store.state.posts.filter((post) => post.status === 'published' || post.status === 'partial'))
const current = computed(() => published.value.filter((post) => isThisMonth(post.createdAt)))
const totals = computed(() => Object.fromEntries(platforms.map((platform) => [platform, current.value.reduce((sum, post) => sum + engagement(post.metrics[platform]), 0)])) as Record<Platform, number>)
const scheduled = computed(() => store.state.posts.filter((post) => post.status === 'scheduled').sort((a, b) => (a.scheduledAt ?? '').localeCompare(b.scheduledAt ?? '')).slice(0, 3))

function winner(platform: Platform, metric: 'engagement' | 'views' | 'likes'): Post | undefined {
  return [...current.value].filter((post) => post.metrics[platform]).sort((a, b) => {
    const am = a.metrics[platform]
    const bm = b.metrics[platform]
    const av = metric === 'engagement' ? engagement(am) : am?.[metric] ?? 0
    const bv = metric === 'engagement' ? engagement(bm) : bm?.[metric] ?? 0
    return bv - av
  })[0]
}

const boards = [
  { title: 'Engagement Tertinggi', subtitle: 'Total interaksi', metric: 'engagement' as const, icon: MousePointer2 },
  { title: 'Terbanyak Ditonton', subtitle: 'Jumlah views', metric: 'views' as const, icon: Eye },
  { title: 'Terbanyak Disukai', subtitle: 'Jumlah likes', metric: 'likes' as const, icon: Heart },
]

function value(post: Post | undefined, platform: Platform, metric: 'engagement' | 'views' | 'likes') {
  if (!post) return 0
  return metric === 'engagement' ? engagement(post.metrics[platform]) : post.metrics[platform]?.[metric] ?? 0
}
</script>

<template>
  <section class="welcome-strip">
    <div><span><Sparkles :size="15" /> Sabtu produktif</span><h2>Selamat datang kembali, {{ store.activeUser.name.split(' ')[0] }}.</h2><p>Konten bulan ini bergerak positif. Ada <strong>{{ scheduled.length }} post</strong> yang menunggu giliran tayang.</p></div>
    <RouterLink v-if="!store.isViewer" to="/composer" class="button button-light"><Plus :size="18" /> Susun konten baru</RouterLink>
    <div class="welcome-orbit orbit-one"/><div class="welcome-orbit orbit-two"/>
  </section>

  <div class="section-title"><div><p>PERFORMA BULAN INI</p><h2>Satu pandangan, tiga platform</h2></div><RouterLink to="/engagement">Lihat detail <ArrowRight :size="16" /></RouterLink></div>
  <section class="engagement-overview card">
    <div class="overview-heading"><span class="card-icon"><TrendingUp :size="20" /></span><div><h3>Engagement Bulan Ini</h3><p>Likes, komentar, bagikan, dan simpan</p></div></div>
    <div class="platform-stat-grid">
      <article v-for="(platform, index) in platforms" :key="platform" class="platform-stat">
        <div class="platform-stat-label"><PlatformIcon :platform="platform" /><span>{{ platform }}</span></div>
        <strong>{{ formatNumber(totals[platform]) }}</strong>
        <p :class="index === 2 ? 'trend-down' : 'trend-up'"><component :is="index === 2 ? TrendingDown : TrendingUp" :size="15" />{{ index === 0 ? '12,8' : index === 1 ? '18,4' : '2,1' }}% <span>vs bulan lalu</span></p>
      </article>
    </div>
  </section>

  <section class="leaderboard-grid">
    <article v-for="board in boards" :key="board.title" class="card leaderboard-card">
      <div class="leaderboard-head"><span class="card-icon"><component :is="board.icon" :size="19" /></span><div><h3>{{ board.title }}</h3><p>{{ board.subtitle }}</p></div></div>
      <div class="leader-list">
        <RouterLink v-for="platform in platforms" :key="platform" :to="winner(platform, board.metric) ? `/engagement/${winner(platform, board.metric)?.id}` : '/engagement'" class="leader-item">
          <PlatformIcon :platform="platform" />
          <div><strong>{{ winner(platform, board.metric)?.title ?? 'Belum ada data' }}</strong><span>{{ formatNumber(value(winner(platform, board.metric), platform, board.metric)) }} {{ board.metric === 'engagement' ? 'interaksi' : board.metric }}</span></div>
          <ChevronRight :size="17" />
        </RouterLink>
      </div>
    </article>
  </section>

  <section class="dashboard-bottom">
    <article class="card schedule-preview">
      <div class="card-section-head"><div><span class="card-icon"><CalendarClock :size="20" /></span><div><h3>Segera Tayang</h3><p>Jadwal terdekat Anda</p></div></div><RouterLink to="/schedule">Buka kalender</RouterLink></div>
      <div class="schedule-list">
        <div v-for="post in scheduled" :key="post.id" class="schedule-row">
          <div class="date-block"><strong>{{ new Date(post.scheduledAt!).getDate() }}</strong><span>{{ new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(new Date(post.scheduledAt!)) }}</span></div>
          <img :src="store.state.media.find((media) => media.id === post.mediaIds[0])?.thumbnail" alt="" />
          <div class="schedule-copy"><strong>{{ post.title }}</strong><span>{{ formatDate(post.scheduledAt!, true) }}</span><div><PlatformIcon v-for="item in post.platforms" :key="item.platform" :platform="item.platform" size="sm" /></div></div>
          <StatusBadge :status="post.status" />
        </div>
      </div>
    </article>
    <article class="card quick-insight">
      <div class="insight-art"><MessageCircle :size="31"/><Share2 :size="25"/><Heart :size="22"/></div>
      <span>INSIGHT MINGGU INI</span>
      <h3>Video pendek adalah format terkuat Anda.</h3>
      <p>Konten video menghasilkan rata-rata <strong>2,3x lebih banyak interaksi</strong> dibanding foto tunggal minggu ini.</p>
      <RouterLink to="/engagement">Lihat analisis konten <ArrowRight :size="16" /></RouterLink>
    </article>
  </section>
</template>
