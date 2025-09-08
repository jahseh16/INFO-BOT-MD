import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState
} from '@whiskeysockets/baileys';
import P from 'pino';
import qrcode from 'qrcode-terminal';
import { loadPlugins } from './lib/pluginLoader.js';
import handleMessages from './handler/messageHandler.js';

// --- Funciones de Tareas de Fondo ---

/**
 * Inicia el ciclo para mantener al bot apareciendo "en línea".
 * @param {import('@whiskeysockets/baileys').WASocket} sock El socket de Baileys.
 */
function startOnlinePresence(sock) {
  const interval = setInterval(async () => {
    try {
      await sock.sendPresenceUpdate('available');
    } catch (e) {
      console.error('Error al actualizar la presencia "en línea":', e);
    }
  }, 60 * 1000); // Cada 60 segundos
  return interval;
}

/**
 * Inicia el ciclo para actualizar el estado del perfil del bot.
 * @param {import('@whiskeysockets/baileys').WASocket} sock El socket de Baileys.
 */
function startStatusUpdater(sock) {
  const statusList = [
    '🤖 Bot activo 24/7',
    '🌐 Cambiando info cada minuto',
    '🛠 Proyecto por Jahseh',
    '🚀 Powered by Baileys',
    '💬 Conéctate ahora',
    '💗 Te amo 7w7',
  ];

  let i = 0;
  const updateStatus = async () => {
    try {
      const nuevoEstado = statusList[i];
      await sock.updateProfileStatus(nuevoEstado);
      i = (i + 1) % statusList.length;
    } catch (err) {
      console.error('⚠️ Error actualizando estado:', err.message);
    }
  };

  // Actualiza una vez al inicio y luego cada minuto
  updateStatus();
  const interval = setInterval(updateStatus, 60 * 1000); // cada minuto
  return interval;
}


// --- Lógica Principal del Bot ---

const startBot = async () => {
  const { state, saveCreds } = await useMultiFileAuthState('./session');

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    logger: P({ level: 'info' }),
    browser: ['Bot Jahseh', 'Chrome', '1.0.0']
  });

  const allCommands = await loadPlugins();
  console.log(`✅ Total de comandos cargados: ${allCommands.length}`);

  handleMessages(sock, allCommands);

  let presenceInterval;
  let statusInterval;

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('Escanea este código QR con tu teléfono:');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      // Detener tareas de fondo al desconectar
      clearInterval(presenceInterval);
      clearInterval(statusInterval);

      const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Conexión cerrada. Reintentando:', shouldReconnect);
      if (shouldReconnect) {
        startBot();
      }
    } else if (connection === 'open') {
      console.log('✅ Bot conectado correctamente');

      // Iniciar tareas de fondo al conectar
      presenceInterval = startOnlinePresence(sock);
      statusInterval = startStatusUpdater(sock);
    }
  });

  sock.ev.on('creds.update', saveCreds);
};

startBot();
