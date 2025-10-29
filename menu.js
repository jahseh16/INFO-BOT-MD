import { getCommands } from './handler.js'
import { relative, dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const categoryIcons = {
  'juegos': '🎮',
  'rpg': '⚔️',
  'info': '💡',
  'default': '🧩' // Un ícono por defecto
}

export function generateMenu() {
  const commands = getCommands()
  const categorizedCommands = {}

  // 1. Agrupar comandos por categoría (subcarpeta)
  for (const [name, command] of commands.entries()) {
    // Evitar duplicados en el menú (mostrar solo el primer alias)
    if (Array.isArray(command.command) && command.command[0] !== name) {
      continue
    }

    const relativePath = relative(join(__dirname, 'plugins'), command.filePath)
    const category = dirname(relativePath).split('/')[0]

    // Asignar a 'varios' si está en la raíz de plugins
    const categoryKey = category === '.' ? 'varios' : category

    if (!categorizedCommands[categoryKey]) {
      categorizedCommands[categoryKey] = []
    }
    categorizedCommands[categoryKey].push(name)
  }

  // 2. Construir el string del menú
  let menuText = '╭━━━「 📜 MENÚ GLOBAL 」━━━╮\n│\n'

  for (const category in categorizedCommands) {
    const icon = categoryIcons[category.toLowerCase()] || categoryIcons['default']
    menuText += `│ ${icon} ${category.toUpperCase()}\n`

    for (const commandName of categorizedCommands[category]) {
      menuText += `│ • .${commandName}\n`
    }
    menuText += '│\n' // Espacio entre categorías
  }

  // Eliminar el último espacio extra
  if (menuText.endsWith('│\n')) {
      menuText = menuText.slice(0, -2)
  }

  menuText += '╰━━━━━━━━━━━━━━━╯\n🤖 Bot creado por Jahseh'

  return menuText
}
