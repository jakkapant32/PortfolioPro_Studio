import generatePayload from 'promptpay-qr';
import QRCode from 'qrcode';

export async function generatePromptPayQR(phone, amount) {
  const payload = generatePayload(phone, { amount });
  return QRCode.toDataURL(payload, { width: 280, margin: 2 });
}
