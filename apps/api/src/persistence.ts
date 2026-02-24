import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyticsEvents, leadRequests, owners, payments, reviewModerationAudit, reviews, supportRequests, venues } from "./data.js";

type PersistedState = {
  venues: typeof venues;
  reviews: typeof reviews;
  leadRequests: typeof leadRequests;
  owners: typeof owners;
  payments: typeof payments;
  analyticsEvents: typeof analyticsEvents;
  reviewModerationAudit: typeof reviewModerationAudit;
  supportRequests: typeof supportRequests;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultStoreFile = path.resolve(__dirname, "../data/store.json");
const storeFile = process.env.DATA_STORE_FILE?.trim() || defaultStoreFile;

function snapshotState(): PersistedState {
  return {
    venues,
    reviews,
    leadRequests,
    owners,
    payments,
    analyticsEvents,
    reviewModerationAudit,
    supportRequests
  };
}

function replaceArray<T>(target: T[], source: T[]): void {
  target.splice(0, target.length, ...source);
}

export function initDataStore(): void {
  fs.mkdirSync(path.dirname(storeFile), { recursive: true });
  if (!fs.existsSync(storeFile)) {
    persistStateSync();
    return;
  }

  try {
    const raw = fs.readFileSync(storeFile, "utf-8");
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    if (Array.isArray(parsed.venues)) replaceArray(venues, parsed.venues);
    if (Array.isArray(parsed.reviews)) replaceArray(reviews, parsed.reviews);
    if (Array.isArray(parsed.leadRequests)) replaceArray(leadRequests, parsed.leadRequests);
    if (Array.isArray(parsed.owners)) replaceArray(owners, parsed.owners);
    if (Array.isArray(parsed.payments)) replaceArray(payments, parsed.payments);
    if (Array.isArray(parsed.analyticsEvents)) replaceArray(analyticsEvents, parsed.analyticsEvents);
    if (Array.isArray(parsed.reviewModerationAudit)) replaceArray(reviewModerationAudit, parsed.reviewModerationAudit);
    if (Array.isArray(parsed.supportRequests)) replaceArray(supportRequests, parsed.supportRequests);
  } catch (error) {
    console.error("Failed to load data store, using in-memory seed:", error);
  }
}

export function persistStateSync(): void {
  try {
    fs.mkdirSync(path.dirname(storeFile), { recursive: true });
    fs.writeFileSync(storeFile, JSON.stringify(snapshotState(), null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to persist data store:", error);
  }
}
