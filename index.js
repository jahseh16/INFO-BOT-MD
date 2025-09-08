import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState
} from '@whiskeysockets/baileys';
import P from 'pino';
import qrcode from 'qrcode-terminal';
import { loadPlugins } from './lib/pluginLoader.js';
import handleMessages from './handler/messageHandler.js';

const startBot = async () => {
  const { state, saveCreds } = await useMultiFileAuthState('./session');

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true, // El QR se imprimirá en la terminal.
    logger: P({ level: 'info' }),
    browser: ['Bot Jahseh', 'Chrome', '1.0.0']
  });

  // Cargar todos los comandos de los plugins.
  const allCommands = await loadPlugins();
  console.log(`✅ Total de comandos cargados: ${allCommands.length}`);

  // Configurar el manejador de mensajes con los comandos cargados.
  handleMessages(sock, allCommands);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('Escanea este código QR con tu teléfono:');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Conexión cerrada. Reintentando:', shouldReconnect);
      if (shouldReconnect) {
        startBot();
      }
    } else if (connection === 'open') {
      console.log('✅ Bot conectado correctamente');
      await sock.sendPresenceUpdate('available');
    }
  });

  // Guardar credenciales en cada actualización.
  sock.ev.on('creds.update', saveCreds);

};

startBot();
