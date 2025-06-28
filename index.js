// 📦 Importaciones
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const P = require('pino');
const qrcode = require('qrcode-terminal');
const axios = require('axios');

// 🔁 Estados personalizados
const statusList = [
  '🤖 Bot activo 24/7',
  '🌐 Cambiando info cada minuto',
  '🛠 Proyecto por Jahseh',
  '🚀 Powered by Baileys',
  '💬 Conéctate ahora',
  '👾 Te amo 7w7',
];

let statusInterval = null;

// 🧽 Limpiar texto HTML
function clean(data) {
  if (!data || typeof data !== 'string') return '';
  let regex = /(<([^>]+)>)/gi;
  data = data.replace(/(<br?\s?\/>)/gi, " \n");
  return data.replace(regex, "");
}

// 🔗 Acortador opcional (no acorta realmente)
async function shortener(url) {
  return url;
}

// 📥 Función TikTok (sin marca de agua)
const Tiktok = async (query) => {
  const { data } = await axios('https://lovetik.com/api/ajax/search', {
    method: 'POST',
    data: new URLSearchParams(Object.entries({ query })),
  });

  return {
    title: clean(data?.desc || 'Sin título'),
    author: clean(data?.author || 'Desconocido'),
    nowm: await shortener((data?.links?.[0]?.a || '').replace('https', 'http')),
  };
};

// 🚀 Inicio del bot
async function iniciarBot() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState('./session');

    const sock = makeWASocket({
      auth: state,
      logger: P({ level: 'silent' }),
      browser: ['INFO-BOT-MD', 'Chrome', '1.0.0']
    });

    sock.ev.on('connection.update', ({ qr }) => {
      if (qr) {
        qrcode.generate(qr, { small: true });
        console.log('📱 Escanea el código QR desde WhatsApp > Dispositivos vinculados');
      }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
      if (connection === 'close') {
        if (statusInterval) clearInterval(statusInterval);
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = (statusCode !== DisconnectReason.loggedOut);
        console.log(`❌ Conexión cerrada debido a: ${lastDisconnect?.error}, reconectando: ${shouldReconnect}`);
        if (shouldReconnect) iniciarBot();
      }

      if (connection === 'open') {
        console.log('✅ Bot conectado exitosamente');
        console.log(`ID del Bot: ${sock.user?.id?.split(':')[0]}`);
        if (statusInterval) clearInterval(statusInterval);
        let i = 0;
        statusInterval = setInterval(async () => {
          try {
            if (!sock.user?.id) return;
            const nuevoEstado = statusList[i];
            await sock.updateProfileStatus(nuevoEstado);
            console.log('📝 Info actualizada:', nuevoEstado);
            i = (i + 1) % statusList.length;
          } catch (err) {
            console.error('⚠ Error actualizando info:', err.message || err);
          }
        }, 60000);
        console.log('🕒 Intervalo de actualización de estado iniciado.');
      }
    });

    // 📩 Manejo de mensajes
    sock.ev.on('messages.upsert', async ({ messages }) => {
      const msg = messages[0];
      if (!msg.message || msg.key.fromMe) return;

      const texto = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
      const jid = msg.key.remoteJid;

      if (texto.includes('tiktok.com')) {
        await sock.sendMessage(jid, { text: '⏳ Descargando video sin marca de agua...' });

        try {
          const data = await Tiktok(texto);
          const response = await axios.get(data.nowm, { responseType: 'arraybuffer' });

          await sock.sendMessage(jid, {
            video: Buffer.from(response.data),
            mimetype: 'video/mp4',
            fileName: `${data.title}.mp4`,
            caption: `🎬 *${data.title}*\n👤 *Autor:* ${data.author}\n\n✅ *Video sin marca de agua*`,
          });

        } catch (e) {
          console.error(e);
          await sock.sendMessage(jid, { text: '❌ Error al obtener el video.' });
        }
      }
    });

  } catch (error) {
    console.error('💥 Error al iniciar el bot:', error);
  }
}

// ▶️ Ejecutar bot
console.log("🚀 Iniciando el proceso del bot...");
iniciarBot()
  .then(() => console.log("👍 Bot iniciado correctamente."))
  .catch(err => console.error("🔥 Error crítico al iniciar el bot:", err));

process.on('SIGINT', async () => {
  console.log("🛑 Cierre solicitado (Ctrl+C)");
  if (statusInterval) clearInterval(statusInterval);
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log("🛑 Cierre por señal SIGTERM");
  if (statusInterval) clearInterval(statusInterval);
  process.exit(0);
});



