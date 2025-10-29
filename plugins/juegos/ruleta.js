let handler = async (m, { conn }) => {
  const premios = ['5 puntos', '10 puntos', '15 puntos', '20 puntos', '100 puntos']
  const premio = premios[Math.floor(Math.random() * premios.length)]
  m.reply(`🎯 Girando la ruleta...\n\n🎁 Premio: ${premio}`)
}

handler.command = ['ruleta']
export default handler
