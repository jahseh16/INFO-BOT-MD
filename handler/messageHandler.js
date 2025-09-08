/**
 * El manejador de mensajes centralizado que procesa todos los comandos de los plugins.
 * @param {import('@whiskeysockets/baileys').WASocket} sock El socket de Baileys.
 * @param {Array<object>} allPluginsCommands La lista de todos los comandos de todos los plugins.
 */
export default function (sock, allPluginsCommands) {
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0];

    if (!m.message || m.key.fromMe) {
      return;
    }

    const from = m.key.remoteJid;
    const text = (
      m.message.conversation ||
      m.message.extendedTextMessage?.text ||
      m.message.imageMessage?.caption ||
      ''
    ).trim();
    const lowerCaseText = text.toLowerCase();

    let commandExecuted = false;

    // 1. Manejar respuestas de botones
    if (m.message.buttonsResponseMessage) {
      const buttonId = m.message.buttonsResponseMessage.selectedButtonId;
      const command = allPluginsCommands.find(cmd => cmd.isButton && cmd.command === buttonId);
      if (command) {
        try {
          await command.execute({ sock, m });
          commandExecuted = true;
        } catch (e) {
          console.error(`Error ejecutando el comando de botón ${buttonId}:`, e);
          await sock.sendMessage(from, { text: '❌ Ocurrió un error al procesar la opción.' }, { quoted: m });
        }
      }
    }

    // 2. Manejar comandos de texto (si no se ejecutó un botón)
    if (!commandExecuted) {
      for (const command of allPluginsCommands) {
        if (command.isButton || command.global) continue; // Ignorar botones y globales aquí

        const commandTriggers = Array.isArray(command.command) ? command.command : [command.command];

        for (const trigger of commandTriggers) {
            const lowerCaseTrigger = trigger.toLowerCase();
            let match = false;
            let commandText = '';

            if (command.startsWith) {
                if (lowerCaseText.startsWith(lowerCaseTrigger + ' ') || lowerCaseText === lowerCaseTrigger) {
                    match = true;
                    commandText = text.substring(trigger.length).trim();
                }
            } else {
                if (lowerCaseText === lowerCaseTrigger) {
                    match = true;
                }
            }

            if (match) {
                try {
                    const args = commandText.split(/ +/).filter(Boolean);
                    await command.execute({ sock, m, text: commandText, args });
                    commandExecuted = true;
                } catch (e) {
                    console.error(`Error ejecutando el comando ${trigger}:`, e);
                    await sock.sendMessage(from, { text: `❌ Ocurrió un error al ejecutar el comando.` }, { quoted: m });
                }
                break;
            }
        }
        if (commandExecuted) break;
      }
    }

    // 3. Ejecutar manejadores globales si ningún comando normal coincidió
    if (!commandExecuted) {
      for (const command of allPluginsCommands) {
        if (command.global) {
          try {
            await command.execute({ sock, m, text, lowerCaseText });
          } catch (e) {
            console.error(`Error en manejador global:`, e);
          }
        }
      }
    }
  });
}
