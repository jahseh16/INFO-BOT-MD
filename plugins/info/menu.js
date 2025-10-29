import { generateMenu } from '../../menu.js'

let handler = async (m, { conn }) => {
  const menuText = generateMenu()
  m.reply(menuText)
}

handler.command = ['menu', 'help']
export default handler
