import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState
} from '@whiskeysockets/baileys'
import P from 'pino'
import qrcode from 'qrcode-terminal'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 👉 Cargar plugins automáticamente
const loadPlugins = async (sock) => {
  const pluginsDir = path.join(__dirname, 'plugins')
  if (!fs.existsSync(pluginsDir)) return
  const files = fs.readdirSync(pluginsDir).filter(file => file.endsWith('.js'))
  for (let file of files) {
    try {
      let plugin = await import(`file://${path.join(pluginsDir, file)}`)
      if (typeof plugin.default === 'function') {
        plugin.default(sock)
        console.log(`🧩 Plugin cargado: ${file}`)
      }
    } catch (e) {
      console.error(`❌ Error cargando plugin ${file}:`, e)
    }
  }
}

const startBot = async () => {
  const { state, saveCreds } = await useMultiFileAuthState('./session')

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false, // usamos qrcode-terminal manualmente
    logger: P({ level: 'info' }),
    browser: ['Bot Jahseh', 'Chrome', '1.0.0']
  })

  sock.ev.on('connection.update', async ({ qr, connection, lastDisconnect }) => {
    if (qr) {
      qrcode.generate(qr, { small: true }) // imprime QR en consola
    }

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
      if (shouldReconnect) startBot()
    }

    if (connection === 'open') {
      console.log('✅ Bot conectado correctamente')

      // 👉 El bot se muestra en línea al conectarse
      await sock.sendPresenceUpdate('available')

      // 👉 Mantener el bot siempre en línea (refresca cada minuto)
      setInterval(async () => {
        await sock.sendPresenceUpdate('available')
      }, 60 * 1000)
    }
  })

  // Guardar credenciales
  sock.ev.on('creds.update', saveCreds)

  // Cargar plugins
  await loadPlugins(sock)
}

startBot()
