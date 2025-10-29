import axios from 'axios'

export default function (sock) {
  const usuariosPendientes = new Map()

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0]
    if (!m.message || m.key.fromMe) return

    const from = m.key.remoteJid

    // 🔹 Sacamos el texto de cualquier tipo de mensaje
    const text =
      m.message.conversation ||
      m.message.extendedTextMessage?.text ||
      m.message.imageMessage?.caption || // por si mandan .xp con foto
      ''

    // ============================
    // 🔹 Comando .xp
    // ============================
    if (text.trim().toLowerCase() === '.xp') {
      usuariosPendientes.set(from, true)
      await sock.sendMessage(from, {
        text: '📸 Por favor envíame tu comprobante (foto del pago).'
      })
      return
    }

    // 👉 Si el usuario estaba pendiente y manda foto
    if (usuariosPendientes.has(from) && m.message.imageMessage) {
      usuariosPendientes.delete(from)
      await sock.sendMessage(from, {
        text: `✅ Gracias por tu compra.\n\n⏳ Por favor espera entre *5 a 10 minutos* mientras validamos tu pago.`
      })
      return
    }

    // ============================
    // 🔹 Comando historia
    // ============================
    if (text.toLowerCase().startsWith('historia ')) {
      const prompt = text.slice(9).trim()
      if (!prompt) {
        await sock.sendMessage(from, { text: '❌ Escribe una idea después de *historia*' })
        return
      }

      // 🕐 Mensaje inicial
      await sock.sendMessage(from, { text: '⏳ *Espera un momento...*\nEstoy generando tu historia con IA 🧠📖' })

      try {
        // ✍️ Generar historia desde Pollinations
        const { data: historia } = await axios.get(`https://text.pollinations.ai/${encodeURIComponent(prompt)}`)

        // 🖼️ Generar imagen relacionada
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`

        // 🔊 Generar audio usando Google Translate TTS
        const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=es&client=tw-ob&q=${encodeURIComponent(historia)}`

        // 📤 Enviar imagen + historia
        await sock.sendMessage(from, {
          image: { url: imageUrl },
          caption: `📚 *Historia Generada por IA de Jahseh:*\n\n${historia}`
        })

        // 📤 Enviar audio narrado (nota de voz)
        await sock.sendMessage(from, {
          audio: { url: ttsUrl },
          mimetype: 'audio/mp4',
          ptt: true
        })

      } catch (err) {
        console.error('❌ Error:', err)
        await sock.sendMessage(from, { text: '⚠️ Error generando la historia o audio' })
      }
    }
  })
}

