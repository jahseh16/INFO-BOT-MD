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

    // ✅ Comando: .comida
    if (text === ".comida") {
      try {
        await sock.sendMessage(from, { text: "🍴 Buscando una receta deliciosa..." })

        const { data } = await axios.get("https://www.themealdb.com/api/json/v1/1/random.php")
        const meal = data.meals[0]

        const ingredientes = []
        for (let i = 1; i <= 20; i++) {
          const ing = meal[`strIngredient${i}`]
          const measure = meal[`strMeasure${i}`]
          if (ing && ing.trim()) {
            ingredientes.push(`- ${ing} (${measure})`)
          }
        }

        await sock.sendMessage(from, {
          image: { url: meal.strMealThumb },
          caption: `🍽️ *${meal.strMeal}*\n\n` +
                   `🌍 Origen: ${meal.strArea}\n` +
                   `🍴 Categoría: ${meal.strCategory}\n\n` +
                   `📋 Ingredientes:\n${ingredientes.join("\n")}\n\n` +
                   `📖 Instrucciones:\n${meal.strInstructions.slice(0, 400)}...\n\n` +
                   `🔗 Video: ${meal.strYoutube || "N/A"}`
        })
      } catch (err) {
        console.error("❌ Error comida:", err.message)
        await sock.sendMessage(from, { text: "⚠️ No pude traer una receta, intenta otra vez." })
      }
    }

    // ✅ Comando: .comida <nombre>
    if (text.startsWith(".comida ")) {
      const name = text.replace(".comida ", "").trim()
      if (!name) return

      try {
        await sock.sendMessage(from, { text: `🍲 Buscando recetas de *${name}*...` })

        const { data } = await axios.get(`https://www.themealdb.com/api/json/v1/1/search.php?s=${name}`)
        if (!data.meals) {
          await sock.sendMessage(from, { text: "❌ No encontré esa receta." })
          return
        }

        const meal = data.meals[0]
        const ingredientes = []
        for (let i = 1; i <= 20; i++) {
          const ing = meal[`strIngredient${i}`]
          const measure = meal[`strMeasure${i}`]
          if (ing && ing.trim()) {
            ingredientes.push(`- ${ing} (${measure})`)
          }
        }

        await sock.sendMessage(from, {
          image: { url: meal.strMealThumb },
          caption: `🍽️ *${meal.strMeal}*\n\n` +
                   `🌍 Origen: ${meal.strArea}\n` +
                   `🍴 Categoría: ${meal.strCategory}\n\n` +
                   `📋 Ingredientes:\n${ingredientes.join("\n")}\n\n` +
                   `📖 Instrucciones:\n${meal.strInstructions.slice(0, 400)}...\n\n` +
                   `🔗 Video: ${meal.strYoutube || "N/A"}`
        })
      } catch (err) {
        console.error("❌ Error comida:", err.message)
        await sock.sendMessage(from, { text: "⚠️ Error buscando esa receta." })
      }
    }
  })
}

