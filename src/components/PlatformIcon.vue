<script setup lang="ts">
import type { Platform } from '../types'

defineProps<{ platform: Platform; size?: 'sm' | 'md' | 'lg' }>()
</script>

<template>
  <span class="platform-icon" :class="[`platform-${platform}`, `platform-${size ?? 'md'}`]" :title="platform">
    <svg v-if="platform === 'instagram'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
    </svg>
    <svg v-else-if="platform === 'tiktok'" viewBox="0 0 24 24" fill="currentColor">
      <path d="M15.2 3c.4 2.2 1.7 3.5 3.8 3.8v3.1c-1.4 0-2.7-.4-3.8-1.2v6.2a6 6 0 1 1-5.1-5.9v3.2a2.9 2.9 0 1 0 2 2.7V3h3.1Z"/>
    </svg>
    <svg v-else viewBox="0 0 24 24" fill="currentColor"><path d="M14 8h3V4h-3c-3.3 0-5 2-5 5v2H6v4h3v7h4v-7h3.4l.6-4h-4V9c0-.7.3-1 1-1Z"/></svg>
  </span>
</template>
