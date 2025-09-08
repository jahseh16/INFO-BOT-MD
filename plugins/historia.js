import axios from 'axios';

// El estado ahora es parte del módulo del plugin.
const usuariosPendientes = new Map();

export default [
    {
        command: '.xp',
        execute: async ({ sock, m }) => {
            const from = m.key.remoteJid;
            usuariosPendientes.set(from, true);
            await sock.sendMessage(from, {
                text: '📸 Por favor envíame tu comprobante (foto del pago).'
            }, { quoted: m });
        }
    },
    {
        command: 'historia',
        startsWith: true,
        execute: async ({ sock, m, text }) => {
            const from = m.key.remoteJid;
            if (!text) {
                return await sock.sendMessage(from, { text: '❌ Escribe una idea después de *historia*' }, { quoted: m });
            }

            await sock.sendMessage(from, { text: '⏳ *Espera un momento...*\nEstoy generando tu historia con IA 🧠📖' }, { quoted: m });

            try {
                const { data: historia } = await axios.get(`https://text.pollinations.ai/${encodeURIComponent(text)}`);
                const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(text)}`;
                const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=es&client=tw-ob&q=${encodeURIComponent(historia)}`;

                await sock.sendMessage(from, {
                    image: { url: imageUrl },
                    caption: `📚 *Historia Generada por IA de Jahseh:*\n\n${historia}`
                }, { quoted: m });

                await sock.sendMessage(from, {
                    audio: { url: ttsUrl },
                    mimetype: 'audio/mp4',
                    ptt: true
                }, { quoted: m });

            } catch (err) {
                console.error('❌ Error:', err);
                await sock.sendMessage(from, { text: '⚠️ Error generando la historia o audio' }, { quoted: m });
            }
        }
    },
    {
        // Este es el manejador global para el estado pendiente.
        global: true,
        execute: async ({ sock, m }) => {
            const from = m.key.remoteJid;
            if (usuariosPendientes.has(from) && m.message.imageMessage) {
                usuariosPendientes.delete(from);
                await sock.sendMessage(from, {
                    text: `✅ Gracias por tu compra.\n\n⏳ Por favor espera entre *5 a 10 minutos* mientras validamos tu pago.`
                }, { quoted: m });
            }
        }
    }
];
