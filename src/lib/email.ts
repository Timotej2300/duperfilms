import "server-only";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Odošle e-mail cez Resend. Vráti false, ak nie je nakonfigurovaný alebo odoslanie zlyhá. */
export async function sendEmail(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[email] RESEND_API_KEY nie je nastavený – e-mail neodoslaný");
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "DuperFilms <support@duperfilms.eu>",
        to, subject, html,
        reply_to: "pomoc@duperfilms.eu",
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function layout(title: string, body: string, button?: { href: string; label: string }) {
  return `<div style="background:#050506;padding:32px;font-family:Arial,sans-serif;color:#f4f4f6">
  <div style="max-width:520px;margin:auto;background:#131318;border-radius:12px;padding:32px">
    <h1 style="letter-spacing:.18em;color:#e50914;font-size:22px;margin:0 0 24px">DUPERFILMS</h1>
    <h2 style="margin:0 0 12px">${esc(title)}</h2>
    <p style="line-height:1.6;color:#c9c9d1">${body}</p>
    ${button ? `<p style="margin:28px 0"><a href="${esc(button.href)}" style="background:#e50914;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">${esc(button.label)}</a></p>` : ""}
    <p style="font-size:12px;color:#777">Potrebuješ pomoc? support@duperfilms.eu · pomoc@duperfilms.eu</p>
  </div></div>`;
}

const site = () => process.env.NEXT_PUBLIC_SITE_URL ?? "https://duperfilms.eu";

export const mail = {
  verify: (to: string, token: string) =>
    sendEmail(to, "Potvrď svoj e-mail – DuperFilms",
      layout("Vitaj v DuperFilms!", "Potvrď svoju e-mailovú adresu. Odkaz platí 24 hodín.", { href: `${site()}/verify?token=${token}`, label: "Potvrdiť e-mail" })),
  reset: (to: string, token: string) =>
    sendEmail(to, "Obnovenie hesla – DuperFilms",
      layout("Obnovenie hesla", "Dostali sme žiadosť o obnovenie hesla. Odkaz platí 1 hodinu. Ak si o to nežiadal, ignoruj tento e-mail.", { href: `${site()}/reset-password?token=${token}`, label: "Nastaviť nové heslo" })),
  changeEmail: (to: string, token: string) =>
    sendEmail(to, "Potvrď nový e-mail – DuperFilms",
      layout("Zmena e-mailu", "Potvrď zmenu e-mailovej adresy účtu.", { href: `${site()}/verify?token=${token}`, label: "Potvrdiť zmenu" })),
  welcome: (to: string) =>
    sendEmail(to, "Vitaj v DuperFilms", layout("Účet vytvorený", "Tvoj účet je pripravený. Príjemné sledovanie!", { href: `${site()}/login`, label: "Prihlásiť sa" })),
  paymentChanged: (to: string, text: string) =>
    sendEmail(to, "Zmena predplatného – DuperFilms", layout("Predplatné", esc(text))),
};
