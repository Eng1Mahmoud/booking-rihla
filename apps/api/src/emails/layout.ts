/** Shared premium email chrome for Rihla transactional mail (Mailjet HTML). */

const BRAND = {
  primary: '#0B6E76',
  primaryDark: '#08545B',
  ink: '#0F1C24',
  muted: '#5B6B76',
  border: '#E6ECEF',
  surface: '#F5F8F9',
  card: '#FFFFFF',
  success: '#0F7A4A',
  warning: '#B45309',
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export type EmailShellOptions = {
  language: string;
  preheader?: string;
  title: string;
  eyebrow?: string;
  bodyHtml: string;
  footerNote?: string;
};

/**
 * Table-based layout for broad client support (Gmail, Outlook, Apple Mail).
 * Inline styles only — no external CSS.
 */
export function renderEmailShell(options: EmailShellOptions): string {
  const ar = options.language === 'ar';
  const dir = ar ? 'rtl' : 'ltr';
  const lang = ar ? 'ar' : 'en';
  const align = ar ? 'right' : 'left';
  const brand = process.env.EMAIL_FROM_NAME || 'Rihla';
  const year = new Date().getFullYear();
  const preheader = options.preheader
    ? escapeHtml(options.preheader)
    : '';
  const footer =
    options.footerNote ??
    (ar
      ? 'رسالة تلقائية من رحلة. لا ترد على هذا البريد.'
      : 'Automated message from Rihla. Please do not reply.');

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${escapeHtml(options.title)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.surface};color:${BRAND.ink};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.surface};">
    <tr>
      <td align="center" style="padding:28px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:${BRAND.card};border-radius:16px;overflow:hidden;border:1px solid ${BRAND.border};box-shadow:0 12px 40px rgba(15,28,36,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,${BRAND.primary} 0%,${BRAND.primaryDark} 100%);padding:28px 28px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="${align}" style="font-family:Segoe UI,Tahoma,Arial,sans-serif;">
                    <div style="font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:rgba(255,255,255,0.75);font-weight:600;">${escapeHtml(brand)}</div>
                    ${
                      options.eyebrow
                        ? `<div style="margin-top:10px;font-size:12px;color:rgba(255,255,255,0.85);">${escapeHtml(options.eyebrow)}</div>`
                        : ''
                    }
                    <h1 style="margin:10px 0 0;font-size:22px;line-height:1.35;font-weight:700;color:#ffffff;">${escapeHtml(options.title)}</h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;font-family:Segoe UI,Tahoma,Arial,sans-serif;font-size:15px;line-height:1.65;color:${BRAND.ink};text-align:${align};">
              ${options.bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px 24px;border-top:1px solid ${BRAND.border};background:#FAFCFC;font-family:Segoe UI,Tahoma,Arial,sans-serif;font-size:12px;line-height:1.55;color:${BRAND.muted};text-align:${align};">
              ${escapeHtml(footer)}
              <div style="margin-top:8px;">© ${year} ${escapeHtml(brand)}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function codeBadge(code: string): string {
  const digits = escapeHtml(code)
    .split('')
    .map(
      (d) =>
        `<span style="display:inline-block;min-width:1.35em;margin:0 2px;padding:10px 0;border-radius:10px;background:#F0F7F8;border:1px solid ${BRAND.border};font-size:22px;font-weight:700;letter-spacing:0.04em;color:${BRAND.primary};text-align:center;">${d}</span>`,
    )
    .join('');
  return `<div style="margin:22px 0;text-align:center;direction:ltr;">${digits}</div>`;
}

export function infoCard(rows: { label: string; value: string }[]): string {
  const items = rows
    .map(
      (row) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid ${BRAND.border};font-size:12px;color:${BRAND.muted};width:38%;vertical-align:top;">${escapeHtml(row.label)}</td>
        <td style="padding:10px 0;border-bottom:1px solid ${BRAND.border};font-size:14px;font-weight:600;color:${BRAND.ink};vertical-align:top;">${escapeHtml(row.value)}</td>
      </tr>`,
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px;">${items}</table>`;
}

export function primaryNote(text: string, tone: 'neutral' | 'success' | 'warning' = 'neutral'): string {
  const bg =
    tone === 'success'
      ? '#ECFDF3'
      : tone === 'warning'
        ? '#FFF7ED'
        : BRAND.surface;
  const border =
    tone === 'success'
      ? '#A7F3D0'
      : tone === 'warning'
        ? '#FED7AA'
        : BRAND.border;
  const color =
    tone === 'success'
      ? BRAND.success
      : tone === 'warning'
        ? BRAND.warning
        : BRAND.ink;
  return `<div style="margin:16px 0;padding:14px 16px;border-radius:12px;background:${bg};border:1px solid ${border};color:${color};font-size:14px;line-height:1.55;">${escapeHtml(text)}</div>`;
}

export function mutedParagraph(text: string): string {
  return `<p style="margin:0 0 14px;color:${BRAND.muted};font-size:14px;line-height:1.6;">${escapeHtml(text)}</p>`;
}

export function bodyParagraph(text: string): string {
  return `<p style="margin:0 0 14px;color:${BRAND.ink};font-size:15px;line-height:1.65;">${escapeHtml(text)}</p>`;
}
