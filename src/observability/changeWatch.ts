import * as fs from 'fs';
import * as path from 'path';

const HOME = process.env.HOME || '/tmp';
const LOG_DIR = path.join(HOME, '.a3m-router');
const LOG_FILE = path.join(LOG_DIR, 'change-log.ndjson');

export interface ChangeEntry {
  id: string;
  timestamp: string;
  summary: string;
  reviewAfter: string;
  reviewWindow: string;
  reviewed: boolean;
}

export interface ImpactReview {
  change: ChangeEntry;
  status: 'pending' | 'ready' | 'overdue';
}

export function logChange(summary: string, reviewWindowDays: number = 7): string {
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
    const id = `chg_${Date.now()}`;
    const now = new Date();
    const reviewAfter = new Date(now.getTime() + reviewWindowDays * 24 * 60 * 60 * 1000);
    const entry: ChangeEntry = { id, timestamp: now.toISOString(), summary, reviewAfter: reviewAfter.toISOString(), reviewWindow: `${reviewWindowDays}d`, reviewed: false };
    fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
    return id;
  } catch { return ''; }
}

export function getPendingReviews(): ImpactReview[] {
  const reviews: ImpactReview[] = [];
  try {
    if (!fs.existsSync(LOG_FILE)) return reviews;
    const now = new Date();
    for (const line of fs.readFileSync(LOG_FILE, 'utf-8').split('\n').filter(Boolean)) {
      try {
        const entry: ChangeEntry = JSON.parse(line);
        if (entry.reviewed) continue;
        const reviewDate = new Date(entry.reviewAfter);
        const days = Math.floor((now.getTime() - reviewDate.getTime()) / (24 * 60 * 60 * 1000));
        reviews.push({ change: entry, status: days < 0 ? 'pending' : days < 3 ? 'ready' : 'overdue' });
      } catch {}
    }
  } catch {}
  return reviews;
}

export function formatPendingReviews(): string {
  const reviews = getPendingReviews();
  if (reviews.length === 0) return '  ✅ No changes pending review.';
  let out = '';
  for (const r of reviews) {
    const icon = r.status === 'overdue' ? '🔴' : r.status === 'ready' ? '🟡' : '🟢';
    const days = Math.floor((Date.now() - new Date(r.change.reviewAfter).getTime()) / 86400000);
    out += `  ${icon} ${r.change.id} — ${r.change.summary}\n     Created: ${r.change.timestamp.slice(0,10)} | Due: ${r.change.reviewAfter.slice(0,10)} (${Math.abs(days)}d)\n`;
  }
  return out;
}
