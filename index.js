const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const P = require('pino');
const qrcode = require('qrcode-terminal');

const statusList = [
  '🤖 Bot activo 24/7',
  '🌐 Cambiando info cada minuto',
  '🛠 Proyecto por Jahseh',
  '🚀 Powered by Baileys',
  '💬 Conéctate ahora',
  '👾 Te amo 7w7',
];

let statusInterval = null;

async function iniciarBot() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState('./session');

    const sock = makeWASocket({
      auth: state,
      logger: P({ level: 'silent' }),
      browser: ['INDEX-BOT', 'Safari', '1.0.0']
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
        if (statusInterval) {
          clearInterval(statusInterval);
          statusInterval = null;
          console.log('🧹 Intervalo de actualización de estado detenido.');
        }

        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = (statusCode !== DisconnectReason.loggedOut);
        console.log(`❌ Conexión cerrada debido a: ${lastDisconnect?.error}, reconectando: ${shouldReconnect}`);

        if (shouldReconnect) {
          console.log('🔄 Intentando reconectar...');
          iniciarBot();
        } else {
          console.log('🚫 No se reconectará, cierre de sesión iniciado por el usuario o error fatal que impide la reconexión automática.');
        }
      }

      if (connection === 'open') {
        console.log('✅ Bot conectado exitosamente');
        console.log(`ID del Bot: ${sock.user?.id?.split(':')[0]}`);

        if (statusInterval) {
          clearInterval(statusInterval);
          statusInterval = null;
          console.log('🧹 Intervalo de estado previo limpiado en nueva conexión.');
        }

        let i = 0;
       statusInterval = setInterval(async () => {
  try {
    if (!sock) {
      console.log('❌ sock no está definido');
      return;
    }

    if (!sock.user || !sock.user.id) {
      console.log('❌ Usuario no definido todavía en sock.user.id');
      return;
    }

    const nuevoEstado = statusList[i];
    await sock.updateProfileStatus(nuevoEstado);
    console.log('📝 Info actualizada:', nuevoEstado);
    i = (i + 1) % statusList.length;

  } catch (err) {
    console.error('⚠ Error actualizando info:', err.message || err);
  }
}, 60_000);



        console.log('🕒 Intervalo de actualización de estado iniciado.');
      }
    });
  } catch (error) {
    console.error('💥 Error fatal al iniciar el bot:', error);
  }
}

console.log("🚀 Iniciando el proceso del bot...");
iniciarBot()
  .then(() => {
    console.log("👍 Función iniciarBot ejecutada. El bot está intentando conectarse...");
  })
  .catch(err => {
    console.error("🔥 Error crítico durante la llamada inicial a iniciarBot:", err);
  });

process.on('SIGINT', async () => {
  console.log("🛑 Recibido SIGINT (Ctrl+C). Cerrando conexión...");
  if (statusInterval) clearInterval(statusInterval);
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log("🛑 Recibido SIGTERM. Cerrando conexión...");
  if (statusInterval) clearInterval(statusInterval);
  process.exit(0);
});

