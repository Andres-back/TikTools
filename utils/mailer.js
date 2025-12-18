const nodemailer = require('nodemailer');

// Usar variables de entorno para mayor seguridad
const EMAIL_USER = process.env.EMAIL_USER || 'resslow41@gmail.com';
const EMAIL_PASS = process.env.EMAIL_PASS || ''; // REEMPLAZAR CON TU APP PASSWORD DE GOOGLE

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587, // TLS
    secure: false,
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS
    }
});

// Verificar conexión al iniciar
transporter.verify((error, success) => {
    if (error) {
        console.error('❌ Error de configuración SMTP:', error.message);
    } else {
        console.log('✅ Servidor SMTP listo para enviar correos');
    }
});

const sendVerificationEmail = async (email, token) => {
    const verificationLink = `https://tiktoolstream.studio/verify-email.html?token=${token}`;

    const mailOptions = {
        from: '"TikToolStream" <resslow41@gmail.com>', // Debe coincidir con el usuario autenticado
        to: email,
        subject: 'Verifica tu cuenta - TikToolStream',
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h2 style="color: #333;">Bienvenido a TikToolStream</h2>
        <p>Gracias por registrarte. Para activar tu cuenta, por favor verifica tu correo electrónico haciendo clic en el siguiente botón:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" style="background-color: #00d9ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Verificar Correo</a>
        </div>
        <p style="font-size: 12px; color: #888;">Si no te registraste en TikToolStream, puedes ignorar este correo.</p>
        <p style="font-size: 12px; color: #888;">Enlace directo: ${verificationLink}</p>
      </div>
    `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Correo de verificación enviado a ${email}`);
        return true;
    } catch (error) {
        console.error('Error enviando correo:', error);
        return false;
    }
};

module.exports = {
    sendVerificationEmail,
    transporter // Exportar para diagnóstico
};
