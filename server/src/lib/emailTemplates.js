// Email-client-safe templates: table layout, inline styles, no SVG or web
// fonts (Gmail and Outlook strip both). Every template returns both an HTML
// and a plain-text body so clients that block HTML still get a usable mail.

const BRAND = {
    name: "Pebble",
    accent: "#7b7cf6",
    accentDark: "#6264ec",
    text: "#1f2030",
    muted: "#6b6d80",
    border: "#e6e6f0",
    background: "#f4f4fb",
};

const FONT =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function layout({ preheader, heading, bodyHtml, footerNote }) {
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(heading)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.background};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.background};">
  <tr>
    <td align="center" style="padding:40px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;">
        <tr>
          <td style="padding:0 0 24px 4px;font-family:${FONT};">
            <span style="display:inline-block;width:22px;height:16px;border-radius:50%;background:${BRAND.accent};vertical-align:middle;"></span>
            <span style="font-size:18px;font-weight:700;color:${BRAND.text};vertical-align:middle;padding-left:6px;">${BRAND.name}</span>
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;border:1px solid ${BRAND.border};border-radius:16px;padding:32px;font-family:${FONT};color:${BRAND.text};">
            <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;font-weight:700;">${escapeHtml(heading)}</h1>
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 4px 0;font-family:${FONT};font-size:12px;line-height:1.6;color:${BRAND.muted};">
            ${footerNote ? `${escapeHtml(footerNote)}<br>` : ""}
            &copy; ${new Date().getFullYear()} ${BRAND.name}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

function paragraph(text) {
    return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${BRAND.text};">${escapeHtml(text)}</p>`;
}

function button(href, label) {
    const safeHref = escapeHtml(href);
    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
  <tr>
    <td style="border-radius:10px;background:${BRAND.accent};">
      <a href="${safeHref}" target="_blank" style="display:inline-block;padding:12px 24px;font-family:${FONT};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">${escapeHtml(label)}</a>
    </td>
  </tr>
</table>`;
}

function linkFallback(href) {
    const safeHref = escapeHtml(href);
    return `<p style="margin:0;font-size:13px;line-height:1.6;color:${BRAND.muted};">Button not working? Paste this link into your browser:<br>
<a href="${safeHref}" target="_blank" style="color:${BRAND.accentDark};word-break:break-all;">${safeHref}</a></p>`;
}

export function passwordResetTemplate({ resetLink, expiresInMinutes = 15 }) {
    const subject = `Reset your ${BRAND.name} password`;

    const html = layout({
        preheader: `Use this link within ${expiresInMinutes} minutes to set a new password.`,
        heading: "Reset your password",
        bodyHtml: [
            paragraph(
                `We got a request to reset the password for your ${BRAND.name} account. Click the button below to choose a new one.`,
            ),
            button(resetLink, "Set a new password"),
            paragraph(
                `This link expires in ${expiresInMinutes} minutes and can only be used once.`,
            ),
            linkFallback(resetLink),
        ].join("\n"),
        footerNote:
            "If you didn't ask to reset your password, you can ignore this email. Your password won't change.",
    });

    const text = [
        `Reset your ${BRAND.name} password`,
        "",
        `We got a request to reset the password for your ${BRAND.name} account.`,
        `Use this link to set a new one. It expires in ${expiresInMinutes} minutes and can only be used once:`,
        "",
        resetLink,
        "",
        "If you didn't ask for this, you can ignore this email. Your password won't change.",
        "",
        `— The ${BRAND.name} team`,
    ].join("\n");

    return { subject, html, text };
}
