// email-debug.js
import 'dotenv/config';
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

(async () => {
  try {
    const msg = {
      to: 'navyasharma.1307@gmail.com', // send to yourself
      from: 'navyasharma.1307@gmail.com', // your verified sender
      subject: 'SendGrid Verification Test',
      text: 'If you see this, SendGrid is working fine now.',
    };

    const [response] = await sgMail.send(msg);
    console.log('✅ Email sent. Status code:', response.statusCode);
  } catch (err) {
    console.error('❌ Send failed:', err.response?.body || err);
  }
})();

