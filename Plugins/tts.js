export default function (sock) {
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const m = messages[0]
    if (!m.message || m.key.fromMe) return

    const from = m.key.remoteJid
    const text = m.message.conversation || m.message.extendedTextMessage?.text || ""

    // ✅ Comando: .tts <texto>
    if (text.startsWith(".tts ")) {
      const say = text.slice(5).trim()
      if (!say) {
        await sock.sendMessage(from, { text: "❌ Escribe un texto después de *.tts*" })
        return
      }

      try {
        // 🔊 URL de Google Translate TTS (español)
        const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=es&client=tw-ob&q=${encodeURIComponent(say)}`

        await sock.sendMessage(from, {
          audio: { url: ttsUrl },
          mimetype: "audio/mp4",
          ptt: true // 👈 para que llegue como nota de voz
        })

        console.log(`✅ TTS enviado a ${from}`)
      } catch (e) {
        console.error("❌ Error en TTS:", e)
        await sock.sendMessage(from, { text: "⚠️ Error generando el audio." })
      }
    }
  })
}

