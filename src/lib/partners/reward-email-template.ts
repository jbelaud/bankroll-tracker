function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

export function partnerRewardEmailContent(input: { partnerName: string; quantity: number; locale: string; appUrl: string }) {
  const en = input.locale === "en";
  const origin = new URL(input.appUrl).origin;
  const href = `${origin}/${en ? "en" : "fr"}/account/subscription`;
  const subject = en ? `Your ${input.quantity} free scans are available` : `Vos ${input.quantity} scans offerts sont disponibles`;
  const introduction = en ? `Your ${input.partnerName} referral has been validated by Kalivoa.` : `Votre parrainage ${input.partnerName} a été validé par Kalivoa.`;
  const reward = en ? `${input.quantity} permanent scans have been added to your Kalivoa account, with no expiry.` : `${input.quantity} scans permanents ont été ajoutés à votre compte Kalivoa, sans date d’expiration.`;
  const label = en ? "View my scans" : "Voir mes scans";
  const footer = en ? "You received this email following your referral declaration on Kalivoa." : "Vous recevez cet email à la suite de votre déclaration de parrainage sur Kalivoa.";
  return { subject, text: `${introduction}\n\n${reward}\n\n${label} : ${href}\n\n${footer}`,
    html: `<!doctype html><html lang="${en ? "en" : "fr"}"><body style="margin:0;background:#0b1018;color:#f2f5f9;font-family:Arial,sans-serif"><div style="max-width:560px;margin:0 auto;padding:32px 24px"><p style="color:#61acff;font-size:20px;font-weight:700">Kalivoa</p><h1 style="font-size:24px;line-height:1.3">${escapeHtml(subject)}</h1><p style="line-height:1.7">${escapeHtml(introduction)}</p><p style="line-height:1.7">${escapeHtml(reward)}</p><p style="margin:28px 0"><a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 20px;background:#61acff;color:#081321;border-radius:10px;font-weight:700;text-decoration:none">${label}</a></p><p style="font-size:12px;line-height:1.6;color:#adb7c5">${footer}</p></div></body></html>` };
}
