// Run provenance helpers. Never include secrets in anything built here.

import { canonicalJson, sha256Hex } from './canonical.mjs';

export const TRIGGER_TYPES = Object.freeze(['manual', 'scheduled', 'retry', 'backfill', 'test']);

export async function configHash(config) {
  return sha256Hex(canonicalJson(config));
}

const newId = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);

// Cloudflare scheduled(): controller.scheduledTime/cron + CF_VERSION_METADATA binding.
export function scheduledProvenance(controller, env, { workerName }) {
  return {
    trigger_type: 'scheduled',
    worker_name: env.BOXING_WORKER_NAME ?? workerName,
    worker_version: env.CF_VERSION_METADATA?.id ?? null,
    deployment_id: env.CF_VERSION_METADATA?.tag || null,
    invocation_id: newId(),
    scheduled_for: new Date(controller?.scheduledTime ?? Date.now()).toISOString(),
    cron: controller?.cron ?? null,
    runtime: 'cloudflare-workers',
  };
}

// Operator-initiated (HTTP route on the worker, or a local script).
export function manualProvenance({ workerName, workerVersion = null, runtime, trigger = 'manual' }) {
  if (!TRIGGER_TYPES.includes(trigger) || trigger === 'scheduled') throw new Error(`manualProvenance cannot record trigger ${trigger}`);
  return { trigger_type: trigger, worker_name: workerName, worker_version: workerVersion, deployment_id: null, invocation_id: newId(), scheduled_for: null, cron: null, runtime };
}
