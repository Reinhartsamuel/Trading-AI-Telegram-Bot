import { Context } from "hono";
export async function verifyWebhook(c:Context) {
    const payload = await c.req.json();
    
    // Status pembayaran
    const paymentStatus = payload.payment.status; // "paid"
    
    // Ambil Telegram ID dari custom field
    // Struktur JSON OrderOnline biasanya ada di customer_data.additional_fields
    const customerFields = payload.customer_data.additional_fields || [];
    const tgField = customerFields.find((f:any) => f.label === 'Telegram ID');
    const telegramId = tgField ? tgField.value : null;

    if (paymentStatus === 'paid' && telegramId) {
        // 1. Update DB user jadi PRO
        // 2. Kirim notifikasi via Bot ke telegramId
        console.log(`User ${telegramId} sukses bayar!`);
    }

    return c.json({ status: 'ok' });
}