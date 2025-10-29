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

    // ✅ Comando: .comidas
    if (text === ".comidas") {
      try {
        await sock.sendMessage(from, { text: "📋 Buscando lista de comidas disponibles..." })

        // Pide lista de comidas por categoría "Beef" como ejemplo (puedes cambiar a Chicken, Dessert, etc.)
        const { data } = await axios.get("https://www.themealdb.com/api/json/v1/1/filter.php?c=Beef")

        if (!data.meals) {
          await sock.sendMessage(from, { text: "❌ No encontré comidas en este momento." })
          return
        }

        // Toma solo los primeros 15 platos para no saturar
        const lista = data.meals.slice(0, 15).map((meal, i) => `${i + 1}. ${meal.strMeal}`).join("\n")

        await sock.sendMessage(from, {
          text: `🍽️ *Lista de Comidas (Beef)*\n\n${lista}\n\n👉 Usa *.comida <nombre>* para ver los detalles de una receta.`
        })
      } catch (err) {
        console.error("❌ Error lista comidas:", err.message)
        await sock.sendMessage(from, { text: "⚠️ Error obteniendo la lista de comidas." })
      }
    }
  })
}

