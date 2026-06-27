import type { EmailEvent } from './types';

export type EditableEmailTemplateDef = {
  event: EmailEvent;
  label: string;
  description: string;
  subject: string;
  bodyText: string;
  variables: string[];
};

export const EDITABLE_EMAIL_TEMPLATES: EditableEmailTemplateDef[] = [
  {
    event: 'order.imei.created',
    label: 'IMEI order received',
    description: 'Sent when an IMEI order is placed and processing starts.',
    subject: 'Order received — {{orderCode}}',
    bodyText:
      'Hi {{recipientName}},\n\nWe received your order {{orderCode}} for {{serviceName}} ({{amount}}).\n\nYour order is now being processed.\n\nTrack your order: {{url}}',
    variables: ['siteName', 'recipientName', 'orderCode', 'serviceName', 'amount', 'url'],
  },
  {
    event: 'order.imei.success',
    label: 'IMEI order success',
    description: 'Sent when an IMEI order completes successfully.',
    subject: 'Order {{orderCode}} — SUCCESS',
    bodyText:
      'Hi {{recipientName}},\n\nYour order {{orderCode}} for {{serviceName}} is now SUCCESS.\n\n{{resultCode}}\n{{comments}}\n\nView order: {{url}}',
    variables: ['siteName', 'recipientName', 'orderCode', 'serviceName', 'status', 'resultCode', 'comments', 'url'],
  },
  {
    event: 'order.imei.rejected',
    label: 'IMEI order rejected',
    description: 'Sent when an IMEI order is rejected.',
    subject: 'Order {{orderCode}} — REJECTED',
    bodyText:
      'Hi {{recipientName}},\n\nYour order {{orderCode}} for {{serviceName}} was REJECTED.\n\n{{comments}}\n\nView order: {{url}}',
    variables: ['siteName', 'recipientName', 'orderCode', 'serviceName', 'status', 'comments', 'url'],
  },
  {
    event: 'order.server.created',
    label: 'Server order received',
    description: 'Sent when a server order is placed and processing starts.',
    subject: 'Order received — {{orderCode}}',
    bodyText:
      'Hi {{recipientName}},\n\nWe received your order {{orderCode}} for {{serviceName}} ({{amount}}).\n\nYour order is now being processed.\n\nTrack your order: {{url}}',
    variables: ['siteName', 'recipientName', 'orderCode', 'serviceName', 'amount', 'url'],
  },
  {
    event: 'order.server.success',
    label: 'Server order success',
    description: 'Sent when a server order completes successfully.',
    subject: 'Order {{orderCode}} — SUCCESS',
    bodyText:
      'Hi {{recipientName}},\n\nYour order {{orderCode}} for {{serviceName}} is now SUCCESS.\n\n{{resultCode}}\n{{comments}}\n\nView order: {{url}}',
    variables: ['siteName', 'recipientName', 'orderCode', 'serviceName', 'status', 'resultCode', 'comments', 'url'],
  },
  {
    event: 'order.server.rejected',
    label: 'Server order rejected',
    description: 'Sent when a server order is rejected.',
    subject: 'Order {{orderCode}} — REJECTED',
    bodyText:
      'Hi {{recipientName}},\n\nYour order {{orderCode}} for {{serviceName}} was REJECTED.\n\n{{comments}}\n\nView order: {{url}}',
    variables: ['siteName', 'recipientName', 'orderCode', 'serviceName', 'status', 'comments', 'url'],
  },
  {
    event: 'wallet.topup_approved',
    label: 'Top-up approved',
    description: 'Sent when a wallet top-up is approved or manually credited.',
    subject: 'Top-up of {{amount}} approved',
    bodyText:
      'Hi {{recipientName}},\n\nYour top-up of {{amount}} was approved.\n\nNew balance: {{newBalance}}\n\nView wallet: {{url}}',
    variables: ['siteName', 'recipientName', 'amount', 'newBalance', 'url'],
  },
  {
    event: 'wallet.topup_rejected',
    label: 'Top-up rejected',
    description: 'Sent when a wallet top-up request is rejected.',
    subject: 'Top-up request rejected',
    bodyText:
      'Hi {{recipientName}},\n\nYour top-up request for {{amount}} was rejected.\n\n{{reason}}\n\nView wallet: {{url}}',
    variables: ['siteName', 'recipientName', 'amount', 'reason', 'url'],
  },
  {
    event: 'ticket.reply',
    label: 'Ticket reply',
    description: 'Sent when staff replies to a support ticket.',
    subject: 'Reply on {{ticketCode}} — {{subject}}',
    bodyText:
      'Hi {{recipientName}},\n\nA new reply was posted on ticket {{ticketCode}} — {{subject}}.\n\n{{body}}\n\nView ticket: {{url}}',
    variables: ['siteName', 'recipientName', 'ticketCode', 'subject', 'body', 'url'],
  },
];

export function interpolateTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? '');
}

function textToHtmlParagraphs(text: string): string {
  return text
    .split('\n\n')
    .map((p) => `<p style="margin:0 0 12px;line-height:1.55">${p.replace(/\n/g, '<br/>')}</p>`)
    .join('');
}

export function shellHtml(siteName: string, bodyHtml: string, footer?: string): string {
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f6f5ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f6f5ef;padding:32px 16px">
      <tr><td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border:1px solid #e6e3da;border-radius:16px;padding:32px">
          <tr><td>
            <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#64748b">${siteName}</div>
            <hr style="border:0;border-top:1px solid #e6e3da;margin:16px 0"/>
            ${bodyHtml}
            <hr style="border:0;border-top:1px solid #e6e3da;margin:24px 0"/>
            <div style="font-size:11px;color:#94a3b8">${footer ?? 'You are receiving this because of activity on your account.'}</div>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

export function renderCustomEmail(
  subjectTemplate: string,
  bodyTextTemplate: string,
  vars: Record<string, string>,
): { subject: string; text: string; html: string } {
  const subject = interpolateTemplate(subjectTemplate, vars);
  const text = interpolateTemplate(bodyTextTemplate, vars);
  const bodyHtml = textToHtmlParagraphs(text);
  const url = vars.url;
  const cta = url
    ? `<p><a href="${url}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:10px 18px;border-radius:999px;font-weight:600;font-size:13px">Open</a></p>`
    : '';
  const html = shellHtml(vars.siteName ?? 'Recovero', bodyHtml + cta);
  return { subject, text, html };
}
