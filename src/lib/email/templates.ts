/**
 * Plain-text + HTML email templates. Intentionally minimal: avoid third-
 * party MJML / react-email dependencies for the first cut. Looks fine in
 * both Gmail and Apple Mail.
 */

function shell(siteName: string, body: string, footer = ''): string {
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f6f5ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f6f5ef;padding:32px 16px">
      <tr><td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border:1px solid #e6e3da;border-radius:16px;padding:32px">
          <tr><td>
            <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#64748b">${siteName}</div>
            <hr style="border:0;border-top:1px solid #e6e3da;margin:16px 0"/>
            ${body}
            <hr style="border:0;border-top:1px solid #e6e3da;margin:24px 0"/>
            <div style="font-size:11px;color:#94a3b8">
              ${footer || 'You are receiving this because of activity on your account.'}
            </div>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

function block(text: string): string {
  return text
    .split('\n\n')
    .map((p) => `<p style="margin:0 0 12px;line-height:1.55">${p.replace(/\n/g, '<br/>')}</p>`)
    .join('');
}

export function ticketReplyTemplate(input: {
  siteName: string;
  recipientName: string;
  ticketCode: string;
  subject: string;
  authorRole: string;
  body: string;
  url: string;
}) {
  const text = `Hi ${input.recipientName},

A new reply was posted on ticket ${input.ticketCode} — ${input.subject}.

From: ${input.authorRole}
${input.body}

View ticket: ${input.url}`;
  const html = shell(
    input.siteName,
    `<h2 style="margin:0 0 12px;font-size:18px">New reply on ${input.ticketCode}</h2>
${block(text)}
<p><a href="${input.url}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:10px 18px;border-radius:999px;font-weight:600;font-size:13px">View ticket</a></p>`,
  );
  return { text, html };
}

export function orderStatusTemplate(input: {
  siteName: string;
  recipientName: string;
  orderCode: string;
  serviceName: string;
  status: string;
  resultCode?: string | null;
  comments?: string | null;
  url: string;
}) {
  const text = `Hi ${input.recipientName},

Your order ${input.orderCode} (${input.serviceName}) has been updated.

Status: ${input.status}
${input.resultCode ? `Result: ${input.resultCode}\n` : ''}${input.comments ? `Notes: ${input.comments}\n` : ''}
View order: ${input.url}`;
  const html = shell(
    input.siteName,
    `<h2 style="margin:0 0 12px;font-size:18px">Order ${input.orderCode} — ${input.status}</h2>
<p style="margin:0 0 12px">${input.serviceName}</p>
${input.resultCode ? `<div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;padding:12px;font-family:monospace;font-size:14px;margin:8px 0">${input.resultCode}</div>` : ''}
${input.comments ? `<p style="margin:8px 0;color:#475569">${input.comments}</p>` : ''}
<p style="margin-top:16px"><a href="${input.url}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:10px 18px;border-radius:999px;font-weight:600;font-size:13px">View order</a></p>`,
  );
  return { text, html };
}

export function topupApprovedTemplate(input: {
  siteName: string;
  recipientName: string;
  amount: string;
  newBalance: string;
  url: string;
}) {
  const text = `Hi ${input.recipientName},

Your top-up of $${input.amount} has been approved and credited to your wallet.
New balance: $${input.newBalance}.

View wallet: ${input.url}`;
  const html = shell(
    input.siteName,
    `<h2 style="margin:0 0 12px;font-size:18px">Top-up credited</h2>
<p style="margin:0 0 12px"><strong>$${input.amount}</strong> has landed in your wallet.</p>
<p style="margin:0 0 12px">New balance: $${input.newBalance}</p>
<p><a href="${input.url}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:10px 18px;border-radius:999px;font-weight:600;font-size:13px">View wallet</a></p>`,
  );
  return { text, html };
}

export function paymentCreditedTemplate(input: {
  siteName: string;
  recipientName: string;
  amount: string;
  gateway: string;
  txHash?: string | null;
  url: string;
}) {
  const text = `Hi ${input.recipientName},

We received your payment via ${input.gateway} for $${input.amount}.
${input.txHash ? `Tx: ${input.txHash}\n` : ''}
Wallet: ${input.url}`;
  const html = shell(
    input.siteName,
    `<h2 style="margin:0 0 12px;font-size:18px">Payment received</h2>
<p style="margin:0 0 12px"><strong>$${input.amount}</strong> credited via <strong>${input.gateway}</strong>.</p>
${input.txHash ? `<p style="margin:0 0 12px;color:#475569;font-family:monospace;font-size:11px">${input.txHash}</p>` : ''}
<p><a href="${input.url}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:10px 18px;border-radius:999px;font-weight:600;font-size:13px">View wallet</a></p>`,
  );
  return { text, html };
}

export function passwordChangedTemplate(input: { siteName: string; recipientName: string }) {
  const text = `Hi ${input.recipientName},

Your account password was just changed. If this wasn't you, contact support immediately.`;
  const html = shell(
    input.siteName,
    `<h2 style="margin:0 0 12px;font-size:18px">Password changed</h2>
${block(text)}`,
  );
  return { text, html };
}
