/**
 * Validate and normalize Telegram group + forum topic settings.
 * Group chat ID and topic thread ID must be provided together (or both cleared).
 */
export type ParsedGroupTopicConfig = {
  groupId: string | null;
  groupTopicId: number | null;
};

export function parseGroupTopicConfig(
  groupId: unknown,
  groupTopicId: unknown,
): { ok: true; value: ParsedGroupTopicConfig } | { ok: false; error: string } {
  const trimmedGroupId = typeof groupId === 'string' ? groupId.trim() : '';
  const trimmedTopicId = typeof groupTopicId === 'string' ? groupTopicId.trim() : String(groupTopicId ?? '').trim();

  if (!trimmedGroupId && !trimmedTopicId) {
    return { ok: true, value: { groupId: null, groupTopicId: null } };
  }

  if (!trimmedGroupId || !trimmedTopicId) {
    return {
      ok: false,
      error: 'Group chat ID and topic ID must both be filled, or both left empty.',
    };
  }

  const parsedTopicId = Number.parseInt(trimmedTopicId, 10);
  if (!Number.isFinite(parsedTopicId) || parsedTopicId <= 0) {
    return { ok: false, error: 'Topic ID is invalid.' };
  }

  return {
    ok: true,
    value: { groupId: trimmedGroupId, groupTopicId: parsedTopicId },
  };
}

export function telegramDeliveryHint(error: string): string {
  return /chat not found|not enough rights|Forbidden|topic closed/i.test(error)
    ? ' Make sure the bot is a group admin with permission to post in that topic.'
    : '';
}
