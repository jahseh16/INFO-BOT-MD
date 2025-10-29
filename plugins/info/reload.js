import { loadPlugins } from '../../handler.js'

let handler = async (m, { conn }) => {
  try {
    await loadPlugins()
    m.reply('✅ Plugins recargados exitosamente.')
  } catch (e) {
    console.error(e)
    m.reply('❌ Ocurrió un error al recargar los plugins.')
  }
}

handler.command = ['reload', 'recargar']
handler.rowner = true

export default handler
