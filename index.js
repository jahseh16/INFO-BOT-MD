import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  makeInMemoryStore
} from '@whiskeysockets/baileys'
import P from 'pino'
import qrcode from 'qrcode-terminal'
import { handler, loadPlugins } from './handler.js'

// Almacenamiento en memoria para reintentar mensajes
const store = makeInMemoryStore({ logger: P().child({ level: 'silent', stream: 'store' }) })

const startBot = async () => {
  const { state, saveCreds } = await useMultiFileAuthState('./session')

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    logger: P({ level: 'silent' }),
    browser: ['Bot Jahseh', 'Chrome', '1.0.0']
  })

  store.bind(sock.ev)

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update
    if (qr) {
      console.log('Escanea este código QR con tu teléfono:')
      qrcode.generate(qr, { small: true })
    }
    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut
      console.log('Conexión cerrada, reconectando:', shouldReconnect)
      if (shouldReconnect) {
        startBot()
      }
    } else if (connection === 'open') {
      console.log('✅ Bot conectado correctamente')
      // Cargar plugins después de una conexión exitosa
      await loadPlugins()
    }
  })

  // Guardar credenciales
  sock.ev.on('creds.update', saveCreds)

  // Procesar mensajes con el handler
  sock.ev.on('messages.upsert', async (m) => {
    const msg = m.messages[0]
    if (!msg.key.fromMe && m.type === 'notify') {
      // Pasar el mensaje al handler global
      await handler(msg, { conn: sock })
    }
  })
}

startBot()
