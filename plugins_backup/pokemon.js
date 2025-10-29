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

    // ✅ Comando: .pokemon <nombre>
    if (text.startsWith(".pokemon ")) {
      const name = text.split(" ")[1]?.toLowerCase()
      if (!name) {
        await sock.sendMessage(from, { text: "❌ Escribe un Pokémon.\nEjemplo: *.pokemon pikachu*" })
        return
      }

      try {
        await sock.sendMessage(from, { text: `⏳ Buscando a *${name}* en la Pokédex...` })

        const { data } = await axios.get(`https://pokeapi.co/api/v2/pokemon/${name}`)
        
        const abilities = data.abilities.map(a => `- ${a.ability.name}`).join("\n")
        const types = data.types.map(t => t.type.name).join(", ")
        const stats = data.stats.map(s => `${s.stat.name}: ${s.base_stat}`).join("\n")

        await sock.sendMessage(from, {
          image: { url: data.sprites.other["official-artwork"].front_default },
          caption: `⚡ *Pokémon:* ${data.name.toUpperCase()}\n\n` +
                   `📌 Tipo: ${types}\n\n` +
                   `💪 Habilidades:\n${abilities}\n\n` +
                   `📊 Stats:\n${stats}`
        })

      } catch (err) {
        console.error("❌ Error Pokémon:", err.message)
        await sock.sendMessage(from, { text: "⚠️ No encontré ese Pokémon. Intenta con otro nombre." })
      }
    }
  })
}

