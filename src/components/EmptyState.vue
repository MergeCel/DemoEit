<script setup lang="ts">
import { Inbox } from 'lucide-vue-next'
defineProps<{ title: string; message: string }>()
</script>

<template><div class="empty-state"><span><Inbox :size="27" /></span><h3>{{ title }}</h3><p>{{ message }}</p><slot /></div></template>
