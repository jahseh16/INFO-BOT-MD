// lib/pluginLoader.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Lista de plugins a ignorar
const skippedPlugins = [
  'ram.js'     // Este plugin causa problemas y no se puede modificar.
];

/**
 * Carga dinámicamente todos los comandos de los archivos de plugins.
 * @returns {Promise<Array<object>>} Una promesa que se resuelve con una lista de todos los comandos.
 */
export async function loadPlugins() {
  const allCommands = [];
  const pluginsDir = path.join(__dirname, '..', 'plugins');

  if (!fs.existsSync(pluginsDir)) {
    console.warn('El directorio de plugins no existe.');
    return [];
  }

  const files = fs.readdirSync(pluginsDir).filter(file => file.endsWith('.js'));

  for (let file of files) {
    if (skippedPlugins.includes(file)) {
      console.warn(`🟡 Plugin omitido: ${file}`);
      continue;
    }

    try {
      const pluginModule = await import(`file://${path.join(pluginsDir, file)}`);
      const commands = pluginModule.default;

      if (Array.isArray(commands)) {
        allCommands.push(...commands);
        console.log(`🧩 ${commands.length} comandos cargados desde: ${file}`);
      } else if (typeof commands === 'object' && commands !== null) {
        allCommands.push(commands);
        console.log(`🧩 1 comando cargado desde: ${file}`);
      }

    } catch (e) {
      console.error(`❌ Error cargando plugins desde ${file}:`, e);
    }
  }

  return allCommands;
}
