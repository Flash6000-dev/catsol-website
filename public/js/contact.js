/* CATSOL — enquiry flow (the "Contact CATSOL" form)

   Validates the form, then prepares an email in the visitor's OWN mail client addressed to
     the recipient in the form's data-recipient attribute. Nothing is sent to or stored by this
     website, and the UI says so.

   payload = { recipient, name, company, email, message }
*/

/** Default: open the visitor's email app with a prepared message. No server involved. */
export const mailtoTransport = {
  name: 'mailto',
  async send({ recipient, name, company, email, message }) {
    const subject = 'Enquiry from ' + name + (company ? ' (' + company + ')' : '');
    const body = message + '\n\n— ' + name + (company ? '\n' + company : '') + '\n' + email;
    window.location.href = 'mailto:' + recipient + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    return { message: 'Your email app should open with the message prepared. If nothing happens, write to ' + recipient + ' directly.' };
  },
};

/** POST the enquiry as JSON to the given endpoint. */
export const httpTransport = (endpoint) => ({
  name: 'http',
  async send(payload) {
    const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) throw new Error('The enquiry service returned ' + res.status);
    return { message: 'Thank you. Your enquiry has been received.' };
  },
});

/* ---- validation + UI ---- */
const FIELD_IDS = { name: 'f-name', email: 'f-email', message: 'f-msg' };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function init(form, transport) {
  const err = document.getElementById('formErr');
  const hint = document.getElementById('formHint');
  const submit = form.querySelector('button[type="submit"]');
  const recipient = form.dataset.recipient;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(form);
    const payload = {
      recipient,
      name: String(f.get('name') || '').trim(),
      company: String(f.get('company') || '').trim(),
      email: String(f.get('email') || '').trim(),
      message: String(f.get('message') || '').trim(),
    };

    const bad = [];
    if (!payload.name) bad.push('name');
    if (!EMAIL_RE.test(payload.email)) bad.push('email');
    if (!payload.message) bad.push('message');
    Object.values(FIELD_IDS).forEach((id) => document.getElementById(id).removeAttribute('aria-invalid'));

    if (bad.length) {
      bad.forEach((b) => document.getElementById(FIELD_IDS[b]).setAttribute('aria-invalid', 'true'));
      err.textContent = 'Please add your ' + bad.join(', ').replace(/, ([^,]*)$/, ' and $1') + ' so we can reply.';
      err.hidden = false;
      document.getElementById(FIELD_IDS[bad[0]]).focus();
      return;
    }

    err.hidden = true;
    submit.disabled = true;
    try {
      const result = await transport.send(payload);
      hint.textContent = result.message;
    } catch (ex) {
      err.textContent = 'Sorry, that did not work. Please write to ' + recipient + ' directly.';
      err.hidden = false;
    } finally {
      submit.disabled = false;
    }
  });
}

const form = document.getElementById('contactForm');
if (form) {
  const transport = mailtoTransport;
  init(form, transport);
}
