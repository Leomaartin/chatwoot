<script>
import { mapGetters } from 'vuex';
import { useAdmin } from 'dashboard/composables/useAdmin';
import { useAlert } from 'dashboard/composables';
import { copyTextToClipboard } from 'shared/helpers/clipboard';
import {
  getSortedAgentsByAvailability,
  getAgentsByUpdatedPresence,
} from 'dashboard/helper/agentHelper.js';
import { picoSearch } from '@chatwoot/pico-search';
import MenuItem from './menuItem.vue';
import MenuItemWithSubmenu from './menuItemWithSubmenu.vue';
import wootConstants from 'dashboard/constants/globals';
import AgentLoadingPlaceholder from './agentLoadingPlaceholder.vue';
import NextInput from 'dashboard/components-next/input/Input.vue';
import Icon from 'dashboard/components-next/icon/Icon.vue';
import { openCommandBar } from 'dashboard/modules/command-bar/openCommandBar';
import { SNOOZE_CONVERSATION_PAGE } from 'dashboard/modules/command-bar/commands';

const MENU = {
  MARK_AS_READ: 'mark-as-read',
  MARK_AS_UNREAD: 'mark-as-unread',
  PRIORITY: 'priority',
  STATUS: 'status',
  SNOOZE: 'snooze',
  AGENT: 'agent',
  TEAM: 'team',
  LABEL: 'label',
  SEND_TO_BOT: 'send-to-bot',
  SCHEDULE: 'schedule',
  DELETE: 'delete',
  OPEN_NEW_TAB: 'open-new-tab',
  COPY_LINK: 'copy-link',
};

export default {
  components: {
    MenuItem,
    MenuItemWithSubmenu,
    AgentLoadingPlaceholder,
    NextInput,
    Icon,
  },
  props: {
    chatId: {
      type: Number,
      default: null,
    },
    status: {
      type: String,
      default: '',
    },
    hasUnreadMessages: {
      type: Boolean,
      default: false,
    },
    inboxId: {
      type: Number,
      default: null,
    },
    priority: {
      type: String,
      default: null,
    },
    conversationLabels: {
      type: Array,
      default: () => [],
    },
    conversationUrl: {
      type: String,
      default: '',
    },
    allowedOptions: {
      type: Array,
      default: () => [],
    },
  },
  emits: [
    'updateConversation',
    'assignPriority',
    'markAsUnread',
    'markAsRead',
    'assignAgent',
    'assignTeam',
    'assignLabel',
    'removeLabel',
    'sendToBot',
    'schedule',
    'deleteConversation',
    'close',
  ],
  setup() {
    const { isAdmin } = useAdmin();
    return {
      isAdmin,
    };
  },
  data() {
    return {
      MENU,
      labelSearchQuery: '',
      STATUS_TYPE: wootConstants.STATUS_TYPE,
      readOption: {
        label: this.$t('CONVERSATION.CARD_CONTEXT_MENU.MARK_AS_READ'),
        icon: 'mail',
      },
      unreadOption: {
        label: this.$t('CONVERSATION.CARD_CONTEXT_MENU.MARK_AS_UNREAD'),
        icon: 'mail-unread',
      },
      statusMenuConfig: [
        {
          key: wootConstants.STATUS_TYPE.RESOLVED,
          label: this.$t('CONVERSATION.CARD_CONTEXT_MENU.RESOLVED'),
          icon: 'checkmark',
        },
        {
          key: wootConstants.STATUS_TYPE.OPEN,
          label: this.$t('CONVERSATION.CARD_CONTEXT_MENU.REOPEN'),
          icon: 'arrow-redo',
        },
        {
          key: wootConstants.STATUS_TYPE.PENDING,
          label: this.$t('CONVERSATION.CARD_CONTEXT_MENU.PENDING'),
          icon: 'book-clock',
        },
      ],
      snoozeOption: {
        key: wootConstants.STATUS_TYPE.SNOOZED,
        label: this.$t('CONVERSATION.CARD_CONTEXT_MENU.SNOOZE.TITLE'),
        icon: 'snooze',
      },
      priorityConfig: {
        key: MENU.PRIORITY,
        label: this.$t('CONVERSATION.PRIORITY.TITLE'),
        icon: 'warning',
        options: [
          {
            label: this.$t('CONVERSATION.PRIORITY.OPTIONS.NONE'),
            key: null,
          },
          {
            label: this.$t('CONVERSATION.PRIORITY.OPTIONS.URGENT'),
            key: 'urgent',
          },
          {
            label: this.$t('CONVERSATION.PRIORITY.OPTIONS.HIGH'),
            key: 'high',
          },
          {
            label: this.$t('CONVERSATION.PRIORITY.OPTIONS.MEDIUM'),
            key: 'medium',
          },
          {
            label: this.$t('CONVERSATION.PRIORITY.OPTIONS.LOW'),
            key: 'low',
          },
        ].filter(item => item.key !== this.priority),
      },
      labelMenuConfig: {
        key: MENU.LABEL,
        icon: 'tag',
        label: this.$t('CONVERSATION.CARD_CONTEXT_MENU.ASSIGN_LABEL'),
      },
      sendToBotOption: {
        key: MENU.SEND_TO_BOT,
        label: 'Enviar al bot',
        icon: 'bot',
        lucideIcon: 'i-lucide-bot',
      },
      scheduleOption: {
        key: MENU.SCHEDULE,
        label: 'Agendar',
        icon: 'calendar',
        lucideIcon: 'i-lucide-calendar-clock',
      },
      agentMenuConfig: {
        key: MENU.AGENT,
        icon: 'person-add',
        label: this.$t('CONVERSATION.CARD_CONTEXT_MENU.ASSIGN_AGENT'),
      },
      teamMenuConfig: {
        key: MENU.TEAM,
        icon: 'people-team-add',
        label: this.$t('CONVERSATION.CARD_CONTEXT_MENU.ASSIGN_TEAM'),
      },
      deleteOption: {
        key: MENU.DELETE,
        icon: 'delete',
        label: this.$t('CONVERSATION.CARD_CONTEXT_MENU.DELETE'),
      },
      openInNewTabOption: {
        key: MENU.OPEN_NEW_TAB,
        icon: 'open',
        label: this.$t('CONVERSATION.CARD_CONTEXT_MENU.OPEN_IN_NEW_TAB'),
      },
      copyLinkOption: {
        key: MENU.COPY_LINK,
        icon: 'copy',
        label: this.$t('CONVERSATION.CARD_CONTEXT_MENU.COPY_LINK'),
      },
    };
  },
  computed: {
    ...mapGetters({
      labels: 'labels/getLabels',
      teams: 'teams/getTeams',
      assignableAgentsUiFlags: 'inboxAssignableAgents/getUIFlags',
      currentUser: 'getCurrentUser',
      currentAccountId: 'getCurrentAccountId',
    }),
    filteredAgentOnAvailability() {
      const agents = this.$store.getters[
        'inboxAssignableAgents/getAssignableAgents'
      ](this.inboxId);
      const agentsByUpdatedPresence = getAgentsByUpdatedPresence(
        agents,
        this.currentUser,
        this.currentAccountId
      );
      const filteredAgents = getSortedAgentsByAvailability(
        agentsByUpdatedPresence
      );
      return filteredAgents;
    },
    assignableAgents() {
      return [
        {
          confirmed: true,
          name: 'None',
          id: null,
          role: 'agent',
          account_id: 0,
          email: 'None',
        },
        ...this.filteredAgentOnAvailability,
      ];
    },
    showSnooze() {
      // Don't show snooze if the conversation is already snoozed/resolved/pending
      return this.status === wootConstants.STATUS_TYPE.OPEN;
    },
    filteredLabels() {
      const labels = this.labelSearchQuery
        ? picoSearch(this.labels, this.labelSearchQuery, ['title'])
        : this.labels;
      // Assigned labels first, keeping each group's existing order.
      const isAssigned = label => this.conversationLabels.includes(label.title);
      return [...labels].sort((a, b) => isAssigned(b) - isAssigned(a));
    },
  },
  mounted() {
    this.$store.dispatch('inboxAssignableAgents/fetch', [this.inboxId]);
  },
  methods: {
    isAllowed(keys) {
      if (!this.allowedOptions.length) return true;
      return keys.some(key => this.allowedOptions.includes(key));
    },
    toggleStatus(status, snoozedUntil) {
      this.$emit('updateConversation', status, snoozedUntil);
    },
    async snoozeConversation() {
      await this.$store.dispatch('setContextMenuChatId', this.chatId);
      openCommandBar({ page: SNOOZE_CONVERSATION_PAGE });
    },
    assignPriority(priority) {
      this.$emit('assignPriority', priority);
    },
    sendToBot() {
      this.$emit('sendToBot', this.chatId);
      this.$emit('close');
    },
    scheduleConversation() {
      this.$emit('schedule', this.chatId);
      this.$emit('close');
    },
    deleteConversation() {
      this.$emit('deleteConversation', this.chatId);
    },
    openInNewTab() {
      if (!this.conversationUrl) return;

      const url = `${window.chatwootConfig.hostURL}${this.conversationUrl}`;
      window.open(url, '_blank', 'noopener,noreferrer');
      this.$emit('close');
    },
    async copyConversationLink() {
      if (!this.conversationUrl) return;
      try {
        const url = `${window.chatwootConfig.hostURL}${this.conversationUrl}`;
        await copyTextToClipboard(url);
        useAlert(this.$t('CONVERSATION.CARD_CONTEXT_MENU.COPY_LINK_SUCCESS'));
        this.$emit('close');
      } catch (error) {
        // error
      }
    },
    show(key) {
      // If the conversation status is same as the action, then don't display the option
      // i.e.: Don't show an option to resolve if the conversation is already resolved.
      return this.status !== key;
    },
    generateMenuLabelConfig(option, type = 'text') {
      return {
        key: option.id,
        ...(type === 'icon' && { icon: option.icon }),
        ...(type === 'label' && { color: option.color }),
        ...(type === 'agent' && { thumbnail: option.thumbnail }),
        ...(type === 'agent' && { status: option.availability_status }),
        ...(type === 'text' && { label: option.label }),
        ...(type === 'label' && { label: option.title }),
        ...(type === 'agent' && { label: option.name }),
        ...(type === 'team' && { label: option.name }),
      };
    },
  },
};
</script>

<template>
  <div
    class="p-1 rounded-md shadow-xl bg-n-alpha-3/50 backdrop-blur-[100px] outline-1 outline outline-n-weak/50"
  >
    <!-- Posponer -->
    <MenuItem
      v-if="isAllowed([MENU.SNOOZE])"
      :option="snoozeOption"
      variant="icon"
      @click.stop="snoozeConversation()"
    />
    <hr class="m-1 rounded border-b border-n-weak dark:border-n-weak" />

    <!-- Enviar al bot -->
    <MenuItem
      v-if="isAllowed([MENU.SEND_TO_BOT])"
      :option="sendToBotOption"
      variant="icon"
      @click.stop="sendToBot"
    />

    <!-- Agendar -->
    <MenuItem
      v-if="isAllowed([MENU.SCHEDULE])"
      :option="scheduleOption"
      variant="icon"
      @click.stop="scheduleConversation"
    />
    <hr class="m-1 rounded border-b border-n-weak dark:border-n-weak" />

    <!-- Eliminar conversación -->
    <MenuItem
      v-if="isAllowed([MENU.DELETE])"
      :option="deleteOption"
      variant="icon"
      @click.stop="deleteConversation"
    />
  </div>
</template>
