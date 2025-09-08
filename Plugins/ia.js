import axios from 'axios'

export default function (sock) {
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0];
    if (!m.message || m.key.fromMe) return;

    const from = m.key.remoteJid;
    const text =
      m.message.conversation ||
      m.message.extendedTextMessage?.text ||
      m.message.imageMessage?.caption ||
      '';

    // 📌 Mostrar menú con botones
    if (text.toLowerCase() === '.jk') {
      const buttons = [
        { buttonId: 'btn_ia', buttonText: { displayText: '🤖 Usar IA' }, type: 1 },
        { buttonId: 'btn_img', buttonText: { displayText: '🎨 Generar Imagen' }, type: 1 }
      ]
      await sock.sendMessage(from, {
        text: '📋 *Menú de Opciones IA*',
        buttons: buttons,
        headerType: 1
      }, { quoted: m })
      return
    }

    // 📌 Detectar botón pulsado
    if (m.message.buttonsResponseMessage) {
      const buttonId = m.message.buttonsResponseMessage.selectedButtonId

      if (buttonId === 'btn_ia') {
        const prompt = 'Escribe aquí tu pregunta para la IA'
        const { data } = await axios.get(
          `https://text.pollinations.ai/${encodeURIComponent(prompt)}`
        );
        await sock.sendMessage(from, {
          text: `🤖 *IA de Jahseh responde:*\n\n${data}`,
        });
      }

      if (buttonId === 'btn_img') {
        const prompt = 'Paisaje futurista con robots'
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`;
        await sock.sendMessage(from, {
          image: { url: imageUrl },
          caption: `🎨 Imagen generada para: *${prompt}*`,
        });
      }
    }

    // 🧠 IA de texto (comando manual)
    if (text.toLowerCase().startsWith('ia ')) {
      const prompt = text.slice(3).trim();
      if (!prompt) {
        return sock.sendMessage(from, {
          text: '❌ Escribe un mensaje después de "ia"',
        });
      }

      try {
        const { data } = await axios.get(
          `https://text.pollinations.ai/${encodeURIComponent(prompt)}`
        );
        await sock.sendMessage(from, {
          text: `🤖 *IA de Jahseh responde:*\n\n${data}`,
        });
      } catch (e) {
        await sock.sendMessage(from, {
          text: '❌ Error al generar texto con IA.',
        });
      }
    }

    // 🎨 Imagen con IA (comando manual)
    if (text.toLowerCase().startsWith('img ')) {
      const prompt = text.slice(4).trim();
      if (!prompt) {
        return sock.sendMessage(from, {
          text: '❌ Escribe un mensaje después de "img"',
        });
      }

      try {
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`;
        await sock.sendMessage(from, {
          image: { url: imageUrl },
          caption: `🎨 Imagen generada para: *${prompt}*`,
        });
      } catch (e) {
        await sock.sendMessage(from, {
          text: '❌ Error al generar imagen con IA.',
        });
      }
    }
  });
}
