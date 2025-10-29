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

    // ✅ Comando: .pokemons (página opcional)
    if (text.startsWith(".pokemons")) {
      const parts = text.split(" ")
      const page = parseInt(parts[1]) || 1
      const limit = 20 // cuantos por página
      const offset = (page - 1) * limit

      try {
        await sock.sendMessage(from, { text: `⏳ Buscando lista de Pokémon (página ${page})...` })

        const { data } = await axios.get(
          `https://pokeapi.co/api/v2/pokemon?limit=${limit}&offset=${offset}`
        )

        const list = data.results
          .map((p, i) => `${offset + i + 1}. ${p.name}`)
          .join("\n")

        await sock.sendMessage(from, {
          text: `📜 *Pokémon - Página ${page}*\n\n${list}\n\n👉 Escribe *.pokemons ${page + 1}* para la siguiente página.`
        })
      } catch (err) {
        console.error("❌ Error Pokemons:", err.message)
        await sock.sendMessage(from, { text: "⚠️ Error cargando la lista de Pokémon." })
      }
    }
  })
}

