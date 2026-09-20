<script setup lang="ts">
import { X } from 'lucide-vue-next'

withDefaults(defineProps<{ open: boolean; title: string; message: string; confirmLabel?: string; danger?: boolean }>(), { confirmLabel: 'Ya, Lanjutkan', danger: false })
const emit = defineEmits<{ close: []; confirm: [] }>()
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal-backdrop" @click.self="emit('close')">
      <section class="confirm-card" role="dialog" aria-modal="true">
        <button class="icon-button close-button" @click="emit('close')"><X :size="20" /></button>
        <div class="confirm-symbol" :class="{ danger }">!</div>
        <h2>{{ title }}</h2>
        <p>{{ message }}</p>
        <div class="confirm-actions">
          <button class="button" :class="danger ? 'button-safe' : 'button-danger'" @click="emit('close')">Batal</button>
          <button class="button" :class="danger ? 'button-danger' : 'button-safe'" @click="emit('confirm')">{{ confirmLabel }}</button>
        </div>
      </section>
    </div>
  </Teleport>
</template>
