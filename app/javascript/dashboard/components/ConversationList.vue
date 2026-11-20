<script setup>
import { ref, computed, provide, inject } from 'vue';
import { useStore } from 'dashboard/composables/store';
import { useAlert } from 'dashboard/composables';
import { Virtualizer } from 'virtua/vue';
import { useBreakpoints } from '@vueuse/core';
import { useChatListKeyboardEvents } from 'dashboard/composables/chatlist/useChatListKeyboardEvents';
import ConversationItem from './ConversationItem.vue';
import ScheduleConversationDialog from './widgets/conversation/ScheduleConversationDialog.vue';
import Spinner from 'dashboard/components-next/spinner/Spinner.vue';
import IntersectionObserver from 'dashboard/components/IntersectionObserver.vue';

import wootConstants from 'dashboard/constants/globals';

const props = defineProps({
  conversationList: { type: Array, default: () => [] },
  isLoading: { type: Boolean, default: false },
  showEndOfListMessage: { type: Boolean, default: false },
  label: { type: String, default: '' },
  teamId: { type: [String, Number], default: 0 },
  foldersId: { type: [String, Number], default: 0 },
  conversationType: { type: String, default: '' },
  showAssignee: { type: Boolean, default: false },
  isOnExpandedLayout: { type: Boolean, default: false },
});

const emit = defineEmits(['loadMore']);

const conversationListRef = ref(null);
const virtualListRef = ref(null);
const isContextMenuOpen = ref(false);

const store = useStore();
const assignLabels = inject('assignLabels');
const removeLabels = inject('removeLabels');

const schedulingConversation = ref(null);
const scheduleDialogRef = ref(null);

const onOpenScheduleModal = conversation => {
  schedulingConversation.value = conversation;
  scheduleDialogRef.value?.open();
};

provide('openScheduleModal', onOpenScheduleModal);

const handleScheduleConfirm = async ({ conversation, scheduledAt }) => {
  if (!conversation) return;
  const conversationId = conversation.id;
  try {
    const currentLabels = conversation.labels || [];
    const responderLabels = [
      'responder',
      'Responder',
      'reponder',
      'Reponder',
    ].filter(l =>
      currentLabels.some(cl => cl.toLowerCase() === l.toLowerCase())
    );

    if (responderLabels.length > 0 && removeLabels) {
      await removeLabels(responderLabels, [conversationId]);
    }

    if (assignLabels) {
      await assignLabels(['agendado'], [conversationId]);
    }

    const updatedCustomAttributes = {
      ...(conversation.custom_attributes || {}),
      scheduled_at: scheduledAt,
    };

    await store.dispatch('updateCustomAttributes', {
      conversationId,
      customAttributes: updatedCustomAttributes,
    });

    conversation.custom_attributes = updatedCustomAttributes;
    if (!conversation.labels) {
      conversation.labels = [];
    }
    if (!conversation.labels.some(l => l.toLowerCase() === 'agendado')) {
      conversation.labels.push('agendado');
    }
    conversation.labels = conversation.labels.filter(
      l => !['responder', 'reponder'].includes(l.toLowerCase())
    );

    useAlert('Conversación agendada con éxito');
  } catch (error) {
    useAlert('Error al agendar la conversación');
  }
};

provide('contextMenuElementTarget', virtualListRef);

const breakpoints = useBreakpoints({
  lg: wootConstants.LARGE_SCREEN_BREAKPOINT,
});
const isLgScreen = breakpoints.greaterOrEqual('lg');
const showExpandedCards = computed(
  () => props.isOnExpandedLayout && isLgScreen.value
);

useChatListKeyboardEvents(conversationListRef);

const intersectionObserverOptions = computed(() => ({
  root: conversationListRef.value,
  rootMargin: '100px 0px 100px 0px',
}));

const onContextMenuToggle = state => {
  isContextMenuOpen.value = state;
};

const loadMoreConversations = () => {
  emit('loadMore');
};

provide('toggleContextMenu', onContextMenuToggle);

defineExpose({ conversationListRef });
</script>

<template>
  <div
    ref="conversationListRef"
    class="flex-1 min-h-0 overflow-y-auto conversations-list"
    :class="{ '!overflow-hidden': isContextMenuOpen }"
  >
    <Virtualizer
      ref="virtualListRef"
      v-slot="{ item }"
      :data="conversationList"
      class="[&>div:has(+_div_.active)>*]:!border-n-surface-1 [&>div:has(+_div_.selected)>*]:!border-n-surface-1"
    >
      <ConversationItem
        :source="item"
        :label="label"
        :team-id="teamId"
        :folders-id="foldersId"
        :conversation-type="conversationType"
        :show-assignee="showAssignee"
        :show-expanded="showExpandedCards"
      />
    </Virtualizer>
    <div v-if="isLoading" class="flex justify-center my-4">
      <Spinner class="text-n-brand" />
    </div>
    <p v-else-if="showEndOfListMessage" class="p-4 text-center text-n-slate-11">
      {{ $t('CHAT_LIST.EOF') }}
    </p>
    <IntersectionObserver
      v-else
      :options="intersectionObserverOptions"
      @observed="loadMoreConversations"
    />
    <ScheduleConversationDialog
      ref="scheduleDialogRef"
      :conversation="schedulingConversation"
      @confirm="handleScheduleConfirm"
      @close="schedulingConversation = null"
    />
  </div>
</template>
