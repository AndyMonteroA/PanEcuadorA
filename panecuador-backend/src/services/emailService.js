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
 * Enviar email de confirmación de pedido
 */
async function sendOrderConfirmationEmail(email, nombre, pedido, items) {
  const frontendUrl = process.env.FRONTEND_URL || 'https://panecuador.online';

  // Generar filas de productos
  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 12px 8px; border-bottom: 1px solid #f0e6d9;">
        <strong style="color: #333;">${item.nombre}</strong>
      </td>
      <td style="padding: 12px 8px; border-bottom: 1px solid #f0e6d9; text-align: center; color: #666;">
        ${item.cantidad}
      </td>
      <td style="padding: 12px 8px; border-bottom: 1px solid #f0e6d9; text-align: right; color: #333;">
        $${(parseFloat(item.precio_unitario || item.precio) * item.cantidad).toFixed(2)}
      </td>
    </tr>
  `).join('');

  const mailOptions = {
    from: process.env.MAIL_FROM || `PanEcuador <${process.env.MAIL_USER}>`,
    to: email,
    subject: `✅ Pedido #${pedido.id_pedido} confirmado — PanEcuador`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #FFF9F3; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #3E2723, #5D4037); padding: 32px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🍞 PanEcuador</h1>
          <p style="color: rgba(255,255,255,0.7); margin: 8px 0 0;">Confirmación de pedido</p>
        </div>
        <div style="padding: 32px;">
          <p style="color: #333; font-size: 16px;">¡Hola <strong>${nombre}</strong>!</p>
          <p style="color: #555; line-height: 1.6;">
            Tu pedido ha sido recibido y está siendo procesado. Aquí tienes el resumen:
          </p>

          <div style="background: white; border-radius: 10px; padding: 20px; margin: 24px 0; border: 1px solid #f0e6d9;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 16px;">
              <div>
                <span style="font-size: 13px; color: #888;">Número de pedido</span><br/>
                <strong style="font-size: 20px; color: #C47F3B;">#${pedido.id_pedido}</strong>
              </div>
              <div style="text-align: right;">
                <span style="font-size: 13px; color: #888;">Estado</span><br/>
                <span style="background: #FEF3C7; color: #92400E; padding: 4px 12px; border-radius: 12px; font-size: 13px; font-weight: 600;">
                  ${pedido.estado || 'pendiente'}
                </span>
              </div>
            </div>

            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="border-bottom: 2px solid #C47F3B;">
                  <th style="padding: 8px; text-align: left; font-size: 13px; color: #888;">Producto</th>
                  <th style="padding: 8px; text-align: center; font-size: 13px; color: #888;">Cant.</th>
                  <th style="padding: 8px; text-align: right; font-size: 13px; color: #888;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <div style="margin-top: 16px; padding-top: 16px; border-top: 2px solid #C47F3B;">
              ${parseFloat(pedido.descuento) > 0 ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #666;">Subtotal</span>
                <span style="color: #666;">$${parseFloat(pedido.subtotal).toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #22c55e;">Descuento</span>
                <span style="color: #22c55e;">-$${parseFloat(pedido.descuento).toFixed(2)}</span>
              </div>
              ` : ''}
              <div style="display: flex; justify-content: space-between;">
                <strong style="font-size: 18px; color: #333;">Total</strong>
                <strong style="font-size: 18px; color: #C47F3B;">$${parseFloat(pedido.total).toFixed(2)}</strong>
              </div>
            </div>
          </div>

          ${pedido.fecha_entrega_programada ? `
          <div style="background: #F0FDF4; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #22c55e;">
            <strong style="color: #15803d;">📦 Entrega programada</strong><br/>
            <span style="color: #166534; font-size: 15px;">
              ${new Date(pedido.fecha_entrega_programada).toLocaleDateString('es-EC', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              ${pedido.franja_horaria ? ` — ${pedido.franja_horaria}` : ''}
            </span>
          </div>
          ` : ''}

          <div style="text-align: center; margin: 24px 0;">
            <a href="${frontendUrl}/pedidos"
               style="background: linear-gradient(135deg, #C47F3B, #D4A017); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
              Ver mis pedidos
            </a>
          </div>

          <p style="color: #888; font-size: 13px; text-align: center; line-height: 1.5;">
            Recibirás notificaciones cuando tu pedido cambie de estado.<br/>
            ¡Gracias por comprar en PanEcuador! 🍞
          </p>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`📧 Email de confirmación de pedido #${pedido.id_pedido} enviado a: ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Error enviando email de confirmación:', error);
    // No lanzar error — el pedido ya se creó exitosamente
    return false;
  }
}

module.exports = { sendPasswordResetEmail, sendOrderConfirmationEmail, verifyEmailConfig };
