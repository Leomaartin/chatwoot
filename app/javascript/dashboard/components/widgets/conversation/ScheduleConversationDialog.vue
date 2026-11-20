<script setup>
import { ref, computed, watch } from 'vue';
import { format, addHours, startOfHour, isValid, parseISO } from 'date-fns';
import Dialog from 'dashboard/components-next/dialog/Dialog.vue';

const props = defineProps({
  conversation: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['confirm', 'close']);

const dialogRef = ref(null);
const selectedDate = ref('');
const selectedTime = ref('');
const errorMessage = ref('');

const formatLocalDate = date => format(date, 'yyyy-MM-dd');
const formatLocalTime = date => format(date, 'HH:mm');

const todayDateString = computed(() => formatLocalDate(new Date()));

const initDefaultDateTime = () => {
  errorMessage.value = '';
  const existingSchedule =
    props.conversation?.custom_attributes?.scheduled_at ||
    props.conversation?.snoozed_until;

  if (existingSchedule) {
    try {
      const parsed =
        typeof existingSchedule === 'string'
          ? parseISO(existingSchedule)
          : new Date(existingSchedule);
      if (isValid(parsed)) {
        selectedDate.value = formatLocalDate(parsed);
        selectedTime.value = formatLocalTime(parsed);
        return;
      }
    } catch (e) {
      // ignore
    }
  }

  // Default to 1 hour from now
  const nextHour = startOfHour(addHours(new Date(), 1));
  selectedDate.value = formatLocalDate(nextHour);
  selectedTime.value = formatLocalTime(nextHour);
};

watch(
  () => props.conversation,
  () => {
    initDefaultDateTime();
  },
  { immediate: true }
);

const setPreset = preset => {
  errorMessage.value = '';
  const now = new Date();
  if (preset === '1h') {
    const d = addHours(now, 1);
    selectedDate.value = formatLocalDate(d);
    selectedTime.value = formatLocalTime(d);
  } else if (preset === '2h') {
    const d = addHours(now, 2);
    selectedDate.value = formatLocalDate(d);
    selectedTime.value = formatLocalTime(d);
  } else if (preset === 'tomorrow-morning') {
    const tomorrow = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      9,
      0,
      0
    );
    selectedDate.value = formatLocalDate(tomorrow);
    selectedTime.value = '09:00';
  } else if (preset === 'tomorrow-afternoon') {
    const tomorrow = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      15,
      0,
      0
    );
    selectedDate.value = formatLocalDate(tomorrow);
    selectedTime.value = '15:00';
  }
};

const open = () => {
  initDefaultDateTime();
  dialogRef.value?.open();
};

const close = () => {
  dialogRef.value?.close();
  emit('close');
};

const handleConfirm = () => {
  if (!selectedDate.value || !selectedTime.value) {
    errorMessage.value = 'Por favor selecciona fecha y hora.';
    return;
  }

  try {
    const dateObj = new Date(`${selectedDate.value}T${selectedTime.value}:00`);
    if (!isValid(dateObj)) {
      errorMessage.value = 'La fecha y hora no son válidas.';
      return;
    }

    emit('confirm', {
      conversation: props.conversation,
      scheduledAt: dateObj.toISOString(),
      displayDate: selectedDate.value,
      displayTime: selectedTime.value,
    });
    close();
  } catch (err) {
    errorMessage.value = 'Error al procesar la fecha y hora.';
  }
};

defineExpose({ open, close });
</script>

<template>
  <Dialog
    ref="dialogRef"
    type="edit"
    title="Agendar conversación"
    confirm-button-label="Agendar"
    cancel-button-label="Cancelar"
    width="md"
    @confirm="handleConfirm"
    @close="close"
  >
    <div class="flex flex-col gap-4 py-2">
      <p class="text-sm text-n-slate-11 m-0">
        Selecciona la fecha y el horario en que deseas agendar esta conversación.
      </p>

      <!-- Quick presets -->
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="px-2.5 py-1 text-xs rounded-lg font-medium bg-n-slate-3 hover:bg-n-slate-4 text-n-slate-12 transition-colors cursor-pointer"
          @click="setPreset('1h')"
        >
          En 1 hora
        </button>
        <button
          type="button"
          class="px-2.5 py-1 text-xs rounded-lg font-medium bg-n-slate-3 hover:bg-n-slate-4 text-n-slate-12 transition-colors cursor-pointer"
          @click="setPreset('2h')"
        >
          En 2 horas
        </button>
        <button
          type="button"
          class="px-2.5 py-1 text-xs rounded-lg font-medium bg-n-slate-3 hover:bg-n-slate-4 text-n-slate-12 transition-colors cursor-pointer"
          @click="setPreset('tomorrow-morning')"
        >
          Mañana 09:00
        </button>
        <button
          type="button"
          class="px-2.5 py-1 text-xs rounded-lg font-medium bg-n-slate-3 hover:bg-n-slate-4 text-n-slate-12 transition-colors cursor-pointer"
          @click="setPreset('tomorrow-afternoon')"
        >
          Mañana 15:00
        </button>
      </div>

      <!-- Date & Time inputs -->
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs font-medium text-n-slate-11 mb-1.5">
            Fecha
          </label>
          <input
            v-model="selectedDate"
            type="date"
            :min="todayDateString"
            class="w-full px-3 py-2 text-sm rounded-lg border border-n-slate-6 bg-n-surface-1 text-n-slate-12 focus:outline-none focus:border-n-brand"
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-n-slate-11 mb-1.5">
            Horario
          </label>
          <input
            v-model="selectedTime"
            type="time"
            class="w-full px-3 py-2 text-sm rounded-lg border border-n-slate-6 bg-n-surface-1 text-n-slate-12 focus:outline-none focus:border-n-brand"
          />
        </div>
      </div>

      <p v-if="errorMessage" class="text-xs text-n-ruby-9 m-0">
        {{ errorMessage }}
      </p>
    </div>
  </Dialog>
</template>
