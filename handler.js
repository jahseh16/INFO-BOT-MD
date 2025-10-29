import { readdirSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { owner } from './config.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const commands = new Map()

async function loadPlugin(filePath) {
  try {
    const module = await import(`file://${filePath}?t=${Date.now()}`)
    const handler = module.default
    if (!handler || typeof handler.command === 'undefined') {
      return
    }

    const commandNames = Array.isArray(handler.command) ? handler.command : [handler.command]

    for (const name of commandNames) {
      if (commands.has(name)) {
        console.warn(`[!] Comando duplicado '${name}' en ${filePath}. Será ignorado.`)
        continue
      }
      commands.set(name, {
        ...handler,
        filePath: filePath
      })
    }
  } catch (e)_ {
    console.error(`[!] Error cargando plugin ${filePath}:`, e)
  }
}

async function _loadPluginsFromDir(dir) {
  const files = readdirSync(dir)
  for (const file of files) {
    const fullPath = join(dir, file)
    if (statSync(fullPath).isDirectory()) {
      await _loadPluginsFromDir(fullPath)
    } else if (file.endsWith('.js')) {
      await loadPlugin(fullPath)
    }
  }
}

export async function handler(m, { conn }) {
    if (m.isBaileys || !m.message) return

    const { message, key } = m
    // Determinar el JID del remitente correctamente (chat privado vs. grupo)
    const sender = key.participant ? key.participant : key.remoteJid
    const senderNumber = sender.split('@')[0]

    const text = (message.conversation || message.extendedTextMessage?.text || '').trim()
    const prefixes = /^[.!#/?\>]/
    const prefix = prefixes.test(text) ? text.match(prefixes)[0] : null

    if (!prefix) return

    const [commandName, ...args] = text.slice(prefix.length).trim().split(/ +/)
    const command = commands.get(commandName.toLowerCase())

    if (command) {
        // Verificar si es un comando de propietario
        if (command.rowner && !owner.includes(senderNumber)) {
            return m.reply('Este comando solo puede ser utilizado por el propietario del bot.')
        }

        try {
            await command.handler(m, { conn, text, args, usedPrefix: prefix, command: commandName })
        } catch (e) {
            console.error(`[!] Error ejecutando comando '${commandName}':`, e)
            await m.reply('Ocurrió un error al ejecutar el comando.')
        }
    }
}

export const loadPlugins = async () => {
    commands.clear()
    await _loadPluginsFromDir(join(__dirname, 'plugins'))
    console.log('[+] Plugins cargados correctamente.')
}

export const getCommands = () => commands
