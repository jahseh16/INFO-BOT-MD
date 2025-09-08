import axios from "axios"

function getText(m) {
  if (m.message.conversation) return m.message.conversation
  if (m.message.extendedTextMessage) return m.message.extendedTextMessage.text
  if (m.message.imageMessage) return m.message.imageMessage.caption
  if (m.message.videoMessage) return m.message.videoMessage.caption
  return ""
}

export default function (sock) {
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const m = messages[0]
    if (!m.message || m.key.fromMe) return

    const from = m.key.remoteJid
    const text = getText(m)

    // ✅ Comando: .tiktok <url>
    if (text.startsWith(".tiktok ")) {
      const url = text.split(" ")[1]
      if (!url) {
        await sock.sendMessage(from, { text: "❌ Envia un enlace de TikTok.\nEjemplo: *.tiktok https://vm.tiktok.com/XXXXX/*" })
        return
      }

      try {
        await sock.sendMessage(from, { text: "⏳ Descargando tu video de TikTok..." })

        // ⚡ Usamos API gratuita
        const api = `https://tikwm.com/api/?url=${encodeURIComponent(url)}`
        const { data } = await axios.get(api)

        if (!data?.data?.play) {
          throw new Error("No se pudo obtener el video.")
        }

        const videoUrl = data.data.play

        await sock.sendMessage(from, {
          video: { url: videoUrl },
          caption: `🎵 Video descargado de TikTok ✅`
        })
      } catch (err) {
        console.error("❌ Error TikTok:", err.message)
        await sock.sendMessage(from, { text: "⚠️ Error al descargar el video." })
      }
    }
  })
}

