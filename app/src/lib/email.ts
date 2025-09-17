// src/lib/email.ts
// Build a subject + simple HTML for the digest (no sending here).

import type { DigestData, DigestItem } from "./digest";
import { formatDateUTC } from "./format";

function row(i: DigestItem) {
  const label =
    i.status === "overdue"
      ? `Overdue by ${Math.abs(i.daysUntilDue)}d`
      : i.status === "today"
      ? "Today"
      : `In ${i.daysUntilDue}d`;
  return `
    <tr>
      <td style="padding:8px 0;">
        <div style="font-weight:600;">${i.name}</div>
        <div style="font-size:12px;color:#64748b">${i.category}</div>
      </td>
      <td style="padding:8px 0;text-align:right;font-size:13px;">
        <span>${label}</span>
        <div style="color:#334155">${formatDateUTC(i.nextDueAt)}</div>
      </td>
    </tr>
  `;
}

export function renderDigestEmail(d: DigestData) {
  const subject = `Keep In Touch — ${d.stats.overdue} overdue, ${d.stats.today} today`;

  const section = (title: string, items: DigestItem[]) =>
    items.length
      ? `
  <h2 style="margin:16px 0 8px 0;font-size:16px">${title}</h2>
  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${items
    .map(row)
    .join("")}</table>`
      : "";

  const html = `
<!doctype html>
<html>
  <body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif; color:#0f172a; margin:24px;">
    <h1 style="margin:0 0 8px 0;font-size:20px">Daily digest</h1>
    <p style="margin:0 0 16px 0;color:#475569">
      Overdue <b>${d.stats.overdue}</b> • Today <b>${
    d.stats.today
  }</b> • Upcoming <b>${d.stats.upcoming}</b>
    </p>
    ${section("Overdue", d.overdue)}
    ${section("Today", d.today)}
    ${section("Upcoming", d.upcoming)}
    <p style="margin-top:24px;font-size:12px;color:#64748b">
      Only contacts with Notify ≠ NONE will be emailed.
    </p>
  </body>
</html>`;
  return { subject, html };
}
