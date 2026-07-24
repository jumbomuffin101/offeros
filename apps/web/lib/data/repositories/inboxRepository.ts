import type { InboxRepository } from "@/lib/data/types/repositories";
import { buildLocalInbox, signalKey } from "@/lib/application-attention-utils";
import { applicationRepository } from "@/lib/data/repositories/applicationRepository";
import { prepRepository } from "@/lib/data/repositories/prepRepository";
import { readApplicationEvents } from "@/lib/data/storage/local/applicationEventStorage";
import {
  readAttentionOverrides,
  writeAttentionOverrides,
} from "@/lib/data/storage/local/applicationAttentionStorage";

export const inboxRepository: InboxRepository = {
  async list() {
    const [applications, prep] = await Promise.all([
      applicationRepository.list(),
      prepRepository.list(),
    ]);
    return buildLocalInbox(
      applications,
      readApplicationEvents(),
      prep,
      readAttentionOverrides(),
    );
  },
  async override(input) {
    const inbox = await this.list();
    const item = inbox.items.find(
      (candidate) =>
        candidate.applicationId === input.applicationId
        && candidate.category === input.category,
    );
    if (!item) throw new Error("Attention item was not found.");
    const overrides = readAttentionOverrides().filter(
      (override) =>
        override.applicationId !== input.applicationId
        || override.category !== input.category,
    );
    const days = input.duration === "tomorrow" ? 1 : input.duration === "3_days" ? 3 : 7;
    overrides.push({
      applicationId: item.applicationId,
      category: item.category,
      signalKey: signalKey(item),
      dismissedUntil:
        input.action === "snooze"
          ? new Date(Date.now() + days * 86_400_000).toISOString()
          : null,
    });
    writeAttentionOverrides(overrides);
    return this.list();
  },
};
