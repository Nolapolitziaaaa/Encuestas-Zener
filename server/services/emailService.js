const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const logoPath = path.join(__dirname, '..', 'logo-email.png');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.office365.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
  tls: {
    ciphers: 'SSLv3',
  },
});

const fromName = process.env.SMTP_FROM_NAME || 'Encuestas Zener Chile';
const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;

const sendInvitationEmail = async (nombre, email, token) => {
  const appUrl = process.env.APP_URL || 'http://localhost:5174';
  const registerUrl = `${appUrl}/registro?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #eef2f7; margin: 0; padding: 40px 20px; }
        .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(35, 40, 86, 0.15); }

        .header { background: linear-gradient(135deg, #171c3a 0%, #232856 50%, #365878 100%); padding: 36px 32px; text-align: center; position: relative; }
        .header::after { content: ''; position: absolute; bottom: -1px; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, #7095B4, #FFD600, #7095B4); }
        .logo { margin-bottom: 12px; text-align: center; }
        .logo img { height: 56px; width: auto; display: inline-block; }
        .header h1 { color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.3px; }
        .header .subtitle { color: rgba(255,255,255,0.7); margin: 6px 0 0; font-size: 13px; font-weight: 400; letter-spacing: 0.5px; text-transform: uppercase; }

        .content { padding: 36px 32px; }
        .greeting { font-size: 22px; font-weight: 700; color: #232856; margin: 0 0 8px; }
        .greeting-sub { font-size: 14px; color: #6b7280; margin: 0 0 24px; }

        .body-text { color: #374151; line-height: 1.7; font-size: 15px; margin: 0 0 8px; }

        .steps { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px 24px; margin: 24px 0; }
        .steps-title { font-size: 13px; font-weight: 600; color: #232856; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 14px; }
        .step-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
        .step-table:last-child { margin-bottom: 0; }
        .step-td-num { width: 28px; vertical-align: top; padding-top: 1px; }
        .step-td-text { vertical-align: top; padding-top: 1px; }
        .step-num { display: inline-block; width: 24px; height: 24px; line-height: 24px; background: #232856; color: white; border-radius: 50%; font-size: 12px; font-weight: 700; text-align: center; }
        .step-text { font-size: 14px; color: #374151; line-height: 1.5; }

        .btn-container { text-align: center; margin: 28px 0; }
        .button { display: inline-block; background: linear-gradient(135deg, #496b8c, #7095B4); color: #ffffff !important; padding: 14px 40px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px; letter-spacing: 0.3px; box-shadow: 0 4px 14px rgba(112, 149, 180, 0.4); }
        .button:hover { background: linear-gradient(135deg, #365878, #496b8c); }
        .button span { color: #ffffff; }

        .link-fallback { text-align: center; margin: 16px 0 0; }
        .link-fallback p { color: #9ca3af; font-size: 12px; margin: 0 0 6px; }
        .link-fallback a { color: #7095B4; font-size: 12px; word-break: break-all; }

        .note { background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 14px 18px; margin: 24px 0 0; }
        .note p { color: #92400e; font-size: 13px; margin: 0; line-height: 1.5; }

        .divider { height: 1px; background: #f1f5f9; margin: 0; }

        .footer { padding: 24px 32px; text-align: center; }
        .footer-brand { font-size: 14px; font-weight: 600; color: #232856; margin: 0 0 4px; }
        .footer-copy { font-size: 12px; color: #9ca3af; margin: 0; }
        .footer-link { color: #7095B4; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo"><img src="cid:logo-zener" alt="Zener Chile" /></div>
          <h1>Encuestas Zener Chile</h1>
          <p class="subtitle">Sistema de Evaluaci&oacute;n</p>
        </div>

        <div class="content">
          <p class="greeting">&iexcl;Hola, ${nombre}!</p>
          <p class="greeting-sub">Tienes una invitaci&oacute;n pendiente</p>

          <p class="body-text">Zener Chile te ha invitado a formar parte de su plataforma de evaluaci&oacute;n. Solo necesitas crear una contrase&ntilde;a para acceder al sistema.</p>

          <div class="steps">
            <p class="steps-title">&iquest;C&oacute;mo funciona?</p>
            <table class="step-table" cellpadding="0" cellspacing="0">
              <tr>
                <td class="step-td-num"><span class="step-num">1</span></td>
                <td class="step-td-text"><span class="step-text">Haz clic en el bot&oacute;n de abajo para acceder y crear tu contrase&ntilde;a.</span></td>
              </tr>
            </table>
            <table class="step-table" cellpadding="0" cellspacing="0">
              <tr>
                <td class="step-td-num"><span class="step-num">2</span></td>
                <td class="step-td-text"><span class="step-text">Ingresa al sistema con tu RUT y la contrase&ntilde;a que creaste.</span></td>
              </tr>
            </table>
            <table class="step-table" cellpadding="0" cellspacing="0">
              <tr>
                <td class="step-td-num"><span class="step-num">3</span></td>
                <td class="step-td-text"><span class="step-text">Revisa tus formularios pendientes y compl&eacute;talos antes de la fecha l&iacute;mite.</span></td>
              </tr>
            </table>
          </div>

          <div class="btn-container">
            <a href="${registerUrl}" class="button">Crear contrase&ntilde;a</a>
          </div>

          <div class="link-fallback">
            <p>Si el bot&oacute;n no funciona, copia este enlace:</p>
            <a href="${registerUrl}">${registerUrl}</a>
          </div>

          <div class="note">
            <p>&#9200; Este enlace expira en 7 d&iacute;as. Si no solicitaste esta invitaci&oacute;n, puedes ignorar este correo de forma segura.</p>
          </div>
        </div>

        <div class="divider"></div>

        <div class="footer">
          <p class="footer-brand">Zener Chile</p>
          <p class="footer-copy">&copy; ${new Date().getFullYear()} Zener Chile &mdash; Todos los derechos reservados</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: email,
    subject: 'Invitación a Encuestas Zener Chile',
    html,
    attachments: [{
      filename: 'logo.png',
      path: logoPath,
      cid: 'logo-zener',
    }],
  });
};

const sendFormNotification = async (nombre, email, formularioTitulo, fechaLimite) => {
  const appUrl = process.env.APP_URL || 'http://localhost:5174';
  const loginUrl = `${appUrl}/login`;

  const fechaLimiteText = fechaLimite
    ? new Date(fechaLimite).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : 'Sin fecha límite definida';

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #eef2f7; margin: 0; padding: 40px 20px; }
        .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(35, 40, 86, 0.15); }

        .header { background: linear-gradient(135deg, #171c3a 0%, #232856 50%, #365878 100%); padding: 36px 32px; text-align: center; position: relative; }
        .header::after { content: ''; position: absolute; bottom: -1px; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, #7095B4, #FFD600, #7095B4); }
        .logo { margin-bottom: 12px; text-align: center; }
        .logo img { height: 56px; width: auto; display: inline-block; }
        .header h1 { color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.3px; }
        .header .subtitle { color: rgba(255,255,255,0.7); margin: 6px 0 0; font-size: 13px; font-weight: 400; letter-spacing: 0.5px; text-transform: uppercase; }

        .content { padding: 36px 32px; }
        .greeting { font-size: 22px; font-weight: 700; color: #232856; margin: 0 0 8px; }
        .greeting-sub { font-size: 14px; color: #6b7280; margin: 0 0 24px; }

        .form-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin: 24px 0; }
        .form-card-label { font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.8px; margin: 0 0 6px; }
        .form-card-title { font-size: 18px; font-weight: 700; color: #232856; margin: 0 0 16px; }
        .form-meta { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
        .meta-item { display: flex; align-items: center; gap: 6px; }
        .meta-icon { width: 18px; height: 18px; fill: none; stroke: #6b7280; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
        .meta-text { font-size: 13px; color: #374151; }
        .meta-text strong { color: #232856; }
        .meta-badge { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .badge-pending { background: #fef3c7; color: #92400e; }
        .badge-urgent { background: #fee2e2; color: #D71E1F; }

        .body-text { color: #374151; line-height: 1.7; font-size: 15px; margin: 0 0 8px; }

        .btn-container { text-align: center; margin: 28px 0; }
        .button { display: inline-block; background: linear-gradient(135deg, #496b8c, #7095B4); color: #ffffff !important; padding: 14px 40px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px; letter-spacing: 0.3px; box-shadow: 0 4px 14px rgba(112, 149, 180, 0.4); }
        .button span { color: #ffffff; }

        .note { background: #f0f5fa; border: 1px solid #bfd3e5; border-radius: 10px; padding: 14px 18px; margin: 24px 0 0; }
        .note p { color: #232856; font-size: 13px; margin: 0; line-height: 1.5; }

        .divider { height: 1px; background: #f1f5f9; margin: 0; }

        .footer { padding: 24px 32px; text-align: center; }
        .footer-brand { font-size: 14px; font-weight: 600; color: #232856; margin: 0 0 4px; }
        .footer-copy { font-size: 12px; color: #9ca3af; margin: 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo"><img src="cid:logo-zener" alt="Zener Chile" /></div>
          <h1>Encuestas Zener Chile</h1>
          <p class="subtitle">Sistema de Evaluaci&oacute;n</p>
        </div>

        <div class="content">
          <p class="greeting">Hola, ${nombre}</p>
          <p class="greeting-sub">Tienes un nuevo formulario pendiente</p>

          <div class="form-card">
            <p class="form-card-label">Formulario asignado</p>
            <p class="form-card-title">${formularioTitulo}</p>
            <div class="form-meta">
              <div class="meta-item">
                <svg class="meta-icon" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                <span class="meta-text"><strong>Fecha l&iacute;mite:</strong> ${fechaLimiteText}</span>
              </div>
              <span class="meta-badge badge-pending">Pendiente de respuesta</span>
            </div>
          </div>

          <p class="body-text">Se te ha asignado un nuevo formulario que requiere tu atenci&oacute;n. Ingresa al sistema para revisarlo y completar tu respuesta.</p>

          <div class="btn-container">
            <a href="${loginUrl}" class="button">Iniciar sesi&oacute;n</a>
          </div>

          <div class="note">
            <p>Recuerda completar el formulario antes de la fecha l&iacute;mite. Si tienes alguna consulta, contacta al administrador del sistema.</p>
          </div>
        </div>

        <div class="divider"></div>

        <div class="footer">
          <p class="footer-brand">Zener Chile</p>
          <p class="footer-copy">&copy; ${new Date().getFullYear()} Zener Chile &mdash; Todos los derechos reservados</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: email,
    subject: `Nuevo formulario: ${formularioTitulo} - Zener Chile`,
    html,
    attachments: [{
      filename: 'logo.png',
      path: logoPath,
      cid: 'logo-zener',
    }],
  });
};

const verifyConnection = async () => {
  try {
    await transporter.verify();
    console.log('✅ Servidor de email configurado correctamente');
  } catch (err) {
    console.warn('⚠️  Error configurando email:', err.message);
  }
};

module.exports = {
  sendInvitationEmail,
  sendFormNotification,
  verifyConnection,
};
