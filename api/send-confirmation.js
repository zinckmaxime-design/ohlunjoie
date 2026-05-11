const { Resend } = require('resend');

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDateFr(dateStr) {
  if (!dateStr) return '';
  const parts = String(dateStr).split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
}

function buildParticipationList(volunteer) {
  const items = [];
  if (volunteer.preparation_salle) items.push('Préparation salle');
  if (volunteer.partie_evenement) items.push('Partie soirée');
  if (volunteer.evenement_entier) items.push('Soirée entière');
  return items;
}

function buildEmailHtml(volunteer, event) {
  const name = escapeHtml(volunteer.prenom);
  const eventTitle = escapeHtml(event.titre);
  const eventDate = formatDateFr(event.date);
  const eventTime = event.heure ? escapeHtml(event.heure) : null;
  const eventLocation = event.lieu ? escapeHtml(event.lieu) : null;
  const participation = buildParticipationList(volunteer);

  let detailsRows = `
    <tr>
      <td style="padding:8px 12px;font-weight:600;color:#555;border-bottom:1px solid #eee;">Date</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;">${eventDate}</td>
    </tr>`;

  if (eventTime) {
    detailsRows += `
    <tr>
      <td style="padding:8px 12px;font-weight:600;color:#555;border-bottom:1px solid #eee;">Heure</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;">${eventTime}</td>
    </tr>`;
  }

  if (eventLocation) {
    detailsRows += `
    <tr>
      <td style="padding:8px 12px;font-weight:600;color:#555;border-bottom:1px solid #eee;">Lieu</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;">${eventLocation}</td>
    </tr>`;
  }

  detailsRows += `
    <tr>
      <td style="padding:8px 12px;font-weight:600;color:#555;border-bottom:1px solid #eee;">Participation</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;">${participation.map(p => escapeHtml(p)).join(', ')}</td>
    </tr>`;

  if (volunteer.heure_arrivee) {
    detailsRows += `
    <tr>
      <td style="padding:8px 12px;font-weight:600;color:#555;border-bottom:1px solid #eee;">Arrivée</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(volunteer.heure_arrivee)}</td>
    </tr>`;
  }

  if (volunteer.heure_depart) {
    detailsRows += `
    <tr>
      <td style="padding:8px 12px;font-weight:600;color:#555;border-bottom:1px solid #eee;">Départ</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(volunteer.heure_depart)}</td>
    </tr>`;
  }

  if (volunteer.commentaire) {
    detailsRows += `
    <tr>
      <td style="padding:8px 12px;font-weight:600;color:#555;">Commentaire</td>
      <td style="padding:8px 12px;">${escapeHtml(volunteer.commentaire)}</td>
    </tr>`;
  }

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#0d7377;padding:24px 32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;">Confirmation d'inscription</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;font-size:16px;color:#333;">
                Bonjour <strong>${name}</strong>,
              </p>
              <p style="margin:0 0 24px;font-size:16px;color:#333;">
                Votre inscription à l'événement <strong>${eventTitle}</strong> a bien été enregistrée.
              </p>
              <!-- Event details card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 12px 8px;font-size:14px;font-weight:700;color:#0d7377;text-transform:uppercase;letter-spacing:0.5px;">
                    Détails de l'événement
                  </td>
                  <td></td>
                </tr>
                ${detailsRows}
              </table>
              <p style="margin:0;font-size:14px;color:#666;">
                Merci pour votre engagement bénévole !
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#999;">
                Cet email a été envoyé automatiquement suite à votre inscription.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.RESEND_FROM || "Ohlun'Joie <noreply@ohlunjoie.fr>";

  if (!resendApiKey) {
    return res.status(400).json({ error: 'Email service not configured' });
  }

  const { volunteer, event } = req.body || {};

  if (!volunteer || !event) {
    return res.status(400).json({ error: 'Missing volunteer or event data' });
  }

  const { prenom, nom, email } = volunteer;
  const { titre, date } = event;

  if (!prenom || !nom || !email || !titre || !date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Basic email format check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  try {
    const resend = new Resend(resendApiKey);
    const html = buildEmailHtml(volunteer, event);

    const { error } = await resend.emails.send({
      from: fromAddress,
      to: email,
      subject: `Confirmation d'inscription - ${titre}`,
      html
    });

    if (error) throw error;

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Resend email error:', err);
    return res.status(500).json({ error: 'Failed to send email' });
  }
};
