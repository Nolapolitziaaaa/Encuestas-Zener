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

const sendInvitationEmail = async (nombre, email, token, rol = 'usuario') => {
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

          ${rol === 'admin' ? `
          <div style="text-align: center; margin-bottom: 20px;">
            <span style="display: inline-block; background: linear-gradient(135deg, #232856, #365878); color: #ffffff; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; letter-spacing: 0.5px;">ROL: ADMINISTRADOR</span>
          </div>
          ` : ''}
          <p class="body-text">Zener Chile te ha invitado a formar parte de su plataforma de evaluaci&oacute;n${rol === 'admin' ? ' como administrador' : ''}. Solo necesitas crear una contrase&ntilde;a para acceder al sistema.</p>

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
    subject: rol === 'admin' ? 'Invitación como Administrador - Encuestas Zener Chile' : 'Invitación a Encuestas Zener Chile',
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

const sendAdminInvitationEmail = async (nombre, apellido, email, token, tempPassword) => {
  const appUrl = process.env.APP_URL || 'http://localhost:5174';
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

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
        .header h1 { color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; }
        .header .subtitle { color: rgba(255,255,255,0.7); margin: 6px 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
        .content { padding: 36px 32px; }
        .greeting { font-size: 22px; font-weight: 700; color: #232856; margin: 0 0 8px; }
        .greeting-sub { font-size: 14px; color: #6b7280; margin: 0 0 24px; }
        .body-text { color: #374151; line-height: 1.7; font-size: 15px; margin: 0 0 8px; }
        .admin-badge { display: inline-block; background: linear-gradient(135deg, #232856, #365878); color: #ffffff; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 20px; }
        .credentials { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px 24px; margin: 24px 0; }
        .credentials-title { font-size: 13px; font-weight: 600; color: #232856; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 14px; }
        .cred-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
        .cred-row:last-child { border-bottom: none; }
        .cred-label { font-size: 13px; color: #6b7280; }
        .cred-value { font-size: 13px; font-weight: 600; color: #232856; }
        .btn-container { text-align: center; margin: 28px 0; }
        .button { display: inline-block; background: linear-gradient(135deg, #496b8c, #7095B4); color: #ffffff !important; padding: 14px 40px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px; box-shadow: 0 4px 14px rgba(112, 149, 180, 0.4); }
        .button:hover { background: linear-gradient(135deg, #365878, #496b8c); }
        .link-fallback { text-align: center; margin: 16px 0 0; }
        .link-fallback p { color: #9ca3af; font-size: 12px; margin: 0 0 6px; }
        .link-fallback a { color: #7095B4; font-size: 12px; word-break: break-all; }
        .note { background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 14px 18px; margin: 24px 0 0; }
        .note p { color: #92400e; font-size: 13px; margin: 0; line-height: 1.5; }
        .steps { background: #f0f5fa; border: 1px solid #bfd3e5; border-radius: 10px; padding: 16px 20px; margin: 20px 0 0; }
        .steps p { color: #232856; font-size: 13px; margin: 4px 0; line-height: 1.5; }
        .steps p strong { font-weight: 600; }
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
          <p class="greeting">&iexcl;Hola, ${nombre} ${apellido}!</p>
          <p class="greeting-sub">Has sido invitado como Administrador</p>
          <div class="admin-badge">ROL: ADMINISTRADOR</div>
          <p class="body-text">Has sido asignado como administrador del sistema de evaluaci&oacute;n de Zener Austral. A continuaci&oacute;n encontrar&aacute;s tus credenciales de acceso.</p>
          <div class="credentials">
            <p class="credentials-title">Credenciales de Acceso</p>
            <div class="cred-row">
              <span class="cred-label">URL del sistema</span>
              <span class="cred-value">${appUrl}</span>
            </div>
            <div class="cred-row">
              <span class="cred-label">Usuario (RUT)</span>
              <span class="cred-value">${apellido ? apellido + ' registrado en el sistema' : 'Registrado'}</span>
            </div>
            <div class="cred-row">
              <span class="cred-label">Contrase&ntilde;a temporal</span>
              <span class="cred-value">${tempPassword}</span>
            </div>
            <div class="cred-row">
              <span class="cred-label">Rol</span>
              <span class="cred-value" style="color: #7095B4;">Administrador</span>
            </div>
          </div>
          <div class="steps">
            <p><strong>Paso 1:</strong> Haz clic en el bot&oacute;n de abajo para crear tu contrase&ntilde;a personal.</p>
            <p><strong>Paso 2:</strong> Ingresa al sistema con tu RUT y la contrase&ntilde;a que creaste.</p>
            <p><strong>Paso 3:</strong> Como administrador podr&aacute;s gestionar plantillas, formularios, usuarios y reportes.</p>
          </div>
          <div class="btn-container">
            <a href="${resetUrl}" class="button">Crear Contrase&ntilde;a</a>
          </div>
          <div class="link-fallback">
            <p>Si el bot&oacute;n no funciona, copia este enlace:</p>
            <a href="${resetUrl}">${resetUrl}</a>
          </div>
          <div class="note">
            <p>&#9200; Este enlace es v&aacute;lido por 24 horas. Si no solicitaste acceso, puedes ignorar este correo.</p>
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
    subject: 'Invitación como Administrador - Encuestas Zener Chile',
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

const sendResetEmail = async (nombre, apellido, email, token) => {
  const appUrl = process.env.APP_URL || 'http://localhost:5174';
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

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
        .header h1 { color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; }
        .header .subtitle { color: rgba(255,255,255,0.7); margin: 6px 0 0; font-size: 13px; }
        .content { padding: 36px 32px; }
        .greeting { font-size: 22px; font-weight: 700; color: #232856; margin: 0 0 8px; }
        .greeting-sub { font-size: 14px; color: #6b7280; margin: 0 0 24px; }
        .body-text { color: #374151; line-height: 1.7; font-size: 15px; margin: 0 0 8px; }
        .note { background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 14px 18px; margin: 24px 0 0; }
        .note p { color: #92400e; font-size: 13px; margin: 0; line-height: 1.5; }
        .btn-container { text-align: center; margin: 28px 0; }
        .button { display: inline-block; background: linear-gradient(135deg, #496b8c, #7095B4); color: #ffffff !important; padding: 14px 40px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px; box-shadow: 0 4px 14px rgba(112, 149, 180, 0.4); }
        .button:hover { background: linear-gradient(135deg, #365878, #496b8c); }
        .link-fallback { text-align: center; margin: 16px 0 0; }
        .link-fallback p { color: #9ca3af; font-size: 12px; margin: 0 0 6px; }
        .link-fallback a { color: #7095B4; font-size: 12px; word-break: break-all; }
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
          <p class="subtitle">Restablecimiento de Contrase&ntilde;a</p>
        </div>
        <div class="content">
          <p class="greeting">&iexcl;Hola, ${nombre} ${apellido}!</p>
          <p class="greeting-sub">Se ha solicitado restablecer tu contrase&ntilde;a</p>
          <p class="body-text">Haz clic en el bot&oacute;n de abajo para crear una nueva contrase&ntilde;a. Este enlace es v&aacute;lido por 24 horas.</p>
          <div class="btn-container">
            <a href="${resetUrl}" class="button">Restablecer Contrase&ntilde;a</a>
          </div>
          <div class="link-fallback">
            <p>Si el bot&oacute;n no funciona, copia este enlace:</p>
            <a href="${resetUrl}">${resetUrl}</a>
          </div>
          <div class="note">
            <p>&#9200; Si no solicitaste este cambio, puedes ignorar este correo de forma segura.</p>
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
    subject: 'Restablecimiento de Contraseña - Encuestas Zener Chile',
    html,
    attachments: [{
      filename: 'logo.png',
      path: logoPath,
      cid: 'logo-zener',
    }],
  });
};

const sendDeadlineReminder = async (nombre, email, formularioTitulo, fechaLimite, diasRestantes) => {
  const appUrl = process.env.APP_URL || 'http://localhost:5174';
  const loginUrl = `${appUrl}/login`;

  const fechaLimiteText = new Date(fechaLimite).toLocaleDateString('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  const urgencyClass = diasRestantes <= 2 ? 'badge-urgent' : 'badge-pending';
  const urgencyText = diasRestantes <= 2
    ? 'URGENTE'
    : `${diasRestantes} d&iacute;as restantes`;

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
        .header h1 { color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; }
        .header .subtitle { color: rgba(255,255,255,0.7); margin: 6px 0 0; font-size: 13px; font-weight: 400; letter-spacing: 0.5px; text-transform: uppercase; }
        .content { padding: 36px 32px; }
        .greeting { font-size: 22px; font-weight: 700; color: #232856; margin: 0 0 8px; }
        .greeting-sub { font-size: 14px; color: #6b7280; margin: 0 0 24px; }
        .alert-box { background: ${diasRestantes <= 2 ? '#fef2f2' : '#fffbeb'}; border: 1px solid ${diasRestantes <= 2 ? '#fecaca' : '#fde68a'}; border-radius: 12px; padding: 20px 24px; margin: 24px 0; text-align: center; }
        .alert-box .days { font-size: 42px; font-weight: 800; color: ${diasRestantes <= 2 ? '#D71E1F' : '#d97706'}; margin: 0; line-height: 1; }
        .alert-box .days-label { font-size: 14px; color: ${diasRestantes <= 2 ? '#991b1b' : '#92400e'}; margin: 6px 0 0; font-weight: 600; }
        .form-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin: 24px 0; }
        .form-card-label { font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.8px; margin: 0 0 6px; }
        .form-card-title { font-size: 18px; font-weight: 700; color: #232856; margin: 0 0 16px; }
        .form-meta { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
        .meta-item { display: flex; align-items: center; gap: 6px; }
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
        .divider { height: 1px; background: #e2e8f0; margin: 0; }
        .footer { padding: 24px 32px; text-align: center; }
        .footer-brand { font-size: 14px; font-weight: 600; color: #232856; margin: 0 0 4px; }
        .footer-copy { font-size: 11px; color: #9ca3af; margin: 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo"><img src="cid:logo-zener" alt="Zener Chile" /></div>
          <h1>Recordatorio de Encuesta</h1>
          <div class="subtitle">Zener Chile &mdash; Sistema de Evaluaci&oacute;n</div>
        </div>

        <div class="content">
          <p class="greeting">Hola, ${nombre}</p>
          <p class="greeting-sub">Te recordamos que tienes una encuesta pendiente de responder.</p>

          <div class="alert-box">
            <p class="days">${diasRestantes}</p>
            <p class="days-label">d&iacute;as restantes para responder</p>
          </div>

          <div class="form-card">
            <p class="form-card-label">Formulario asignado</p>
            <p class="form-card-title">${formularioTitulo}</p>
            <div class="form-meta">
              <div class="meta-item">
                <span class="meta-text">Fecha l&iacute;mite: <strong>${fechaLimiteText}</strong></span>
              </div>
              <span class="meta-badge ${urgencyClass}">${urgencyText}</span>
            </div>
          </div>

          <p class="body-text">Debes responder la encuesta antes de la fecha l&iacute;mite indicada. Una vez vencido el plazo, no podr&aacute;s enviar tu respuesta.</p>

          <div class="btn-container">
            <a href="${loginUrl}" class="button">Iniciar sesi&oacute;n y responder</a>
          </div>

          <div class="note">
            <p>Si ya completaste esta encuesta, puedes ignorar este mensaje. Para cualquier consulta, contacta al administrador del sistema.</p>
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
    subject: `Recordatorio: ${formularioTitulo} - ${diasRestantes} d\u00edas restantes`,
    html,
    attachments: [{
      filename: 'logo.png',
      path: logoPath,
      cid: 'logo-zener',
    }],
  });
};

const sendRejectionEmail = async (nombre, apellido, email, formularioTitulo, comentario) => {
  const appUrl = process.env.APP_URL || 'http://localhost:5174';
  const loginUrl = `${appUrl}/login`;

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
        .header h1 { color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; }
        .header .subtitle { color: rgba(255,255,255,0.7); margin: 6px 0 0; font-size: 13px; }
        .content { padding: 36px 32px; }
        .greeting { font-size: 22px; font-weight: 700; color: #232856; margin: 0 0 8px; }
        .greeting-sub { font-size: 14px; color: #6b7280; margin: 0 0 24px; }
        .body-text { color: #374151; line-height: 1.7; font-size: 15px; margin: 0 0 8px; }
        .rejection-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 20px 24px; margin: 24px 0; }
        .rejection-box .label { font-size: 13px; font-weight: 600; color: #991b1b; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 8px; }
        .rejection-box .comment { font-size: 14px; color: #7f1d1d; line-height: 1.6; margin: 0; }
        .btn-container { text-align: center; margin: 28px 0; }
        .button { display: inline-block; background: linear-gradient(135deg, #496b8c, #7095B4); color: #ffffff !important; padding: 14px 40px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px; box-shadow: 0 4px 14px rgba(112, 149, 180, 0.4); }
        .button:hover { background: linear-gradient(135deg, #365878, #496b8c); }
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
          <p class="subtitle">Respuesta Rechazada</p>
        </div>
        <div class="content">
          <p class="greeting">Hola, ${nombre} ${apellido}</p>
          <p class="greeting-sub">Tu respuesta ha sido devuelta para revisi&oacute;n</p>
          <p class="body-text">La respuesta que enviaste para el formulario <strong>${formularioTitulo}</strong> ha sido rechazada y necesita ser corregida.</p>
          <div class="rejection-box">
            <p class="label">Motivo del rechazo:</p>
            <p class="comment">${comentario}</p>
          </div>
          <p class="body-text">Por favor, ingresa al sistema para revisar los comentarios y volver a enviar tu respuesta con los documentos correctos.</p>
          <div class="btn-container">
            <a href="${loginUrl}" class="button">Iniciar sesi&oacute;n</a>
          </div>
          <div class="note">
            <p>Si tienes alguna consulta sobre el motivo del rechazo, contacta al administrador del sistema.</p>
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
    subject: `Respuesta rechazada: ${formularioTitulo} - Zener Chile`,
    html,
    attachments: [{
      filename: 'logo.png',
      path: logoPath,
      cid: 'logo-zener',
    }],
  });
};

const sendDailySummaryEmail = async (adminEmails, resumen) => {
  if (!adminEmails.length || !resumen.length) return;

  const fecha = new Date().toLocaleDateString('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  let rows = '';
  for (const r of resumen) {
    const estadoClass = r.estado_validacion === 'validado' ? 'badge-ok' : r.estado_validacion === 'rechazado' ? 'badge-rejected' : 'badge-pending';
    const estadoLabel = r.estado_validacion === 'validado' ? 'Validado' : r.estado_validacion === 'rechazado' ? 'Rechazado' : 'Pendiente';
    rows += `
      <tr>
        <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #374151;">${r.proveedor_nombre}</td>
        <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #374151;">${r.proveedor_empresa || '-'}</td>
        <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #232856; font-weight: 600;">${r.formulario_titulo}</td>
        <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #6b7280;">${r.fecha_envio}</td>
        <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; text-align: center;">
          <span class="${estadoClass}">${estadoLabel}</span>
        </td>
      </tr>`;
  }

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #eef2f7; margin: 0; padding: 40px 20px; }
        .container { max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(35, 40, 86, 0.15); }
        .header { background: linear-gradient(135deg, #171c3a 0%, #232856 50%, #365878 100%); padding: 36px 32px; text-align: center; position: relative; }
        .header::after { content: ''; position: absolute; bottom: -1px; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, #7095B4, #FFD600, #7095B4); }
        .logo { margin-bottom: 12px; text-align: center; }
        .logo img { height: 56px; width: auto; display: inline-block; }
        .header h1 { color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; }
        .header .subtitle { color: rgba(255,255,255,0.7); margin: 6px 0 0; font-size: 13px; }
        .content { padding: 36px 32px; }
        .greeting { font-size: 20px; font-weight: 700; color: #232856; margin: 0 0 6px; }
        .greeting-sub { font-size: 14px; color: #6b7280; margin: 0 0 24px; }
        .summary-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px 24px; margin: 20px 0; text-align: center; }
        .summary-number { font-size: 36px; font-weight: 800; color: #232856; margin: 0; }
        .summary-label { font-size: 13px; color: #6b7280; margin: 4px 0 0; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        thead th { padding: 10px 14px; background: #232856; color: #ffffff; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; text-align: left; }
        thead th:first-child { border-radius: 8px 0 0 0; }
        thead th:last-child { border-radius: 0 8px 0 0; }
        .badge-ok { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; background: #d1fae5; color: #065f46; }
        .badge-pending { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; background: #fef3c7; color: #92400e; }
        .badge-rejected { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; background: #fee2e2; color: #991b1b; }
        .btn-container { text-align: center; margin: 28px 0; }
        .button { display: inline-block; background: linear-gradient(135deg, #496b8c, #7095B4); color: #ffffff !important; padding: 14px 40px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px; box-shadow: 0 4px 14px rgba(112, 149, 180, 0.4); }
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
          <h1>Resumen Diario</h1>
          <div class="subtitle">Encuestas Zener Chile &mdash; ${fecha}</div>
        </div>
        <div class="content">
          <p class="greeting">Hola, Administrador</p>
          <p class="greeting-sub">Este es el resumen de respuestas recibidas en las &uacute;ltimas 24 horas.</p>
          <div class="summary-card">
            <p class="summary-number">${resumen.length}</p>
            <p class="summary-label">respuestas recibidas ayer</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Proveedor</th>
                <th>Empresa</th>
                <th>Formulario</th>
                <th>Fecha</th>
                <th style="text-align:center;">Estado</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="btn-container">
            <a href="${process.env.APP_URL || 'http://localhost:5174'}/admin/reports" class="button">Ver Reportes</a>
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
    to: adminEmails.join(', '),
    subject: `Resumen diario: ${resumen.length} respuesta(s) recibida(s) - Zener Chile`,
    html,
    attachments: [{
      filename: 'logo.png',
      path: logoPath,
      cid: 'logo-zener',
    }],
  });
};

module.exports = {
  sendInvitationEmail,
  sendFormNotification,
  sendResetEmail,
  sendAdminInvitationEmail,
  sendDeadlineReminder,
  sendRejectionEmail,
  sendDailySummaryEmail,
  verifyConnection,
};
