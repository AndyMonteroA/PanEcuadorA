const nodemailer = require('nodemailer');

/**
 * Servicio de envío de emails — PanEcuador
 * Usa Nodemailer con Gmail (contraseña de aplicación)
 */

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

/**
 * Enviar email de recuperación de contraseña
 */
async function sendPasswordResetEmail(email, token, nombre) {
  const resetUrl = `${process.env.FRONTEND_URL || 'https://panecuador.online'}/reset-password/${token}`;

  const mailOptions = {
    from: process.env.MAIL_FROM || `PanEcuador <${process.env.MAIL_USER}>`,
    to: email,
    subject: '🔐 Recupera tu contraseña — PanEcuador',
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #FFF9F3; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #3E2723, #5D4037); padding: 32px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🍞 PanEcuador</h1>
          <p style="color: rgba(255,255,255,0.7); margin: 8px 0 0;">Recuperación de contraseña</p>
        </div>
        <div style="padding: 32px;">
          <p style="color: #333; font-size: 16px;">Hola <strong>${nombre}</strong>,</p>
          <p style="color: #555; line-height: 1.6;">
            Recibimos una solicitud para restablecer la contraseña de tu cuenta en PanEcuador.
            Haz clic en el siguiente botón para crear una nueva contraseña:
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}" 
               style="background: linear-gradient(135deg, #C47F3B, #D4A017); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
              Restablecer contraseña
            </a>
          </div>
          <p style="color: #888; font-size: 13px; line-height: 1.5;">
            Este enlace expira en <strong>1 hora</strong>. Si no solicitaste este cambio, 
            puedes ignorar este correo y tu contraseña seguirá siendo la misma.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="color: #aaa; font-size: 12px; text-align: center;">
            Si el botón no funciona, copia y pega esta URL en tu navegador:<br/>
            <a href="${resetUrl}" style="color: #C47F3B; word-break: break-all;">${resetUrl}</a>
          </p>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`📧 Email de recuperación enviado a: ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Error enviando email:', error);
    throw error;
  }
}

/**
 * Verificar que el transporter está configurado
 */
async function verifyEmailConfig() {
  try {
    if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
      console.warn('⚠️  Variables de email no configuradas (MAIL_USER, MAIL_PASS)');
      return false;
    }
    await transporter.verify();
    console.log('✅ Servicio de email configurado correctamente');
    return true;
  } catch (error) {
    console.warn('⚠️  No se pudo verificar el servicio de email:', error.message);
    return false;
  }
}

module.exports = { sendPasswordResetEmail, verifyEmailConfig };
