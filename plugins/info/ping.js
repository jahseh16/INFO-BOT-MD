let handler = async (m, { conn }) => {
  const startTime = new Date()
  await conn.sendMessage(m.chat, { text: 'Pinging...' }, { quoted: m })
  const endTime = new Date()
  const latency = endTime - startTime

  m.reply(`Pong! Latencia: ${latency}ms`)
}

handler.command = ['ping', 'speed']
export default handler
