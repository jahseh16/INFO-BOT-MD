// plugins/menu.js
export default function (sock) {
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0];
    if (!m.message || m.key.fromMe) return;

    const jid = m.key.remoteJid;
    const text = m.message.conversation || m.message.extendedTextMessage?.text || '';

    if (!text.toLowerCase().startsWith('.menu')) return;

    // Hora y fecha (Perú)
    const hora = new Date().toLocaleTimeString('es-PE', {
      timeZone: 'America/Lima',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).toLowerCase();

    const fecha = new Date().toLocaleDateString('es-PE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const menuText = `
╭───❖ 「 COMANDOS 」 ❖───
👤 Usuario: *${m.pushName || 'Usuario'}*
📆 Fecha: *${fecha}*
🕒 Hora: *${hora}*
╰──────────────────────────
╭──────────────────────────
│ 🤖 Comandos disponibles:
│ 🪪 .dni
│ 🖼 .foto
│ 🔊 .tts
│ 🎰 .ruleta
│ 📲 .tiktok
│ ☎️ .tierra / .mundial / .waworld
│ 🍽️ .comidas → lista de comidas
│ 🍲 .comida <nombre> → ver receta
╰─────────────────────
`.trim();

    try {
      await sock.sendMessage(jid, {
        image: { url: 'https://files.catbox.moe/3fgors.png' },
        caption: menuText,
        buttons: [
          { buttonId: '.jugar', buttonText: { displayText: '🐽 Jugar' }, type: 1 },
          { buttonId: 'ia', buttonText: { displayText: '🤖 IA' }, type: 1 },
          { buttonId: '.waworld', buttonText: { displayText: '🌐 Mundo' }, type: 1 }
        ],
        headerType: 4,
        contextInfo: {
          externalAdReply: {
            title: 'BOT-RYNN💠',
            body: 'Desarrollado por Jahseh',
            mediaType: 1,
            thumbnailUrl: 'creado X Jahseh',
            renderLargerThumbnail: true,
            sourceUrl: ''
          }
        }
      }, { quoted: m });

      console.log(`✅ Menú con botones enviado a ${jid}`);
    } catch (e) {
      console.error('❌ Error al enviar menú:', e.message);
    }
  });
}

