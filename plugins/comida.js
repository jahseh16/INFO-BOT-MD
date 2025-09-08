import axios from "axios";

async function sendMeal(sock, m, meal) {
    const ingredientes = [];
    for (let i = 1; i <= 20; i++) {
        const ing = meal[`strIngredient${i}`];
        const measure = meal[`strMeasure${i}`];
        if (ing && ing.trim()) {
            ingredientes.push(`- ${ing} (${measure})`);
        }
    }

    await sock.sendMessage(m.key.remoteJid, {
        image: { url: meal.strMealThumb },
        caption: `🍽️ *${meal.strMeal}*\n\n` +
                 `🌍 Origen: ${meal.strArea}\n` +
                 `🍴 Categoría: ${meal.strCategory}\n\n` +
                 `📋 Ingredientes:\n${ingredientes.join("\n")}\n\n` +
                 `📖 Instrucciones:\n${meal.strInstructions.slice(0, 400)}...\n\n` +
                 `🔗 Video: ${meal.strYoutube || "N/A"}`
    }, { quoted: m });
}

export default [{
    command: '.comida',
    startsWith: true,
    async execute({ sock, m, text }) {
        const from = m.key.remoteJid;
        const name = text.trim();

        if (!name) { // .comida (random)
            try {
                await sock.sendMessage(from, { text: "🍴 Buscando una receta deliciosa..." }, { quoted: m });
                const { data } = await axios.get("https://www.themealdb.com/api/json/v1/1/random.php");
                if (data.meals && data.meals[0]) {
                    await sendMeal(sock, m, data.meals[0]);
                } else {
                    await sock.sendMessage(from, { text: "⚠️ No pude encontrar una receta aleatoria." }, { quoted: m });
                }
            } catch (err) {
                console.error("❌ Error comida (random):", err.message);
                await sock.sendMessage(from, { text: "⚠️ No pude traer una receta, intenta otra vez." }, { quoted: m });
            }
        } else { // .comida <nombre>
            try {
                await sock.sendMessage(from, { text: `🍲 Buscando recetas de *${name}*...` }, { quoted: m });
                const { data } = await axios.get(`https://www.themealdb.com/api/json/v1/1/search.php?s=${name}`);
                if (!data.meals) {
                    return await sock.sendMessage(from, { text: "❌ No encontré esa receta." }, { quoted: m });
                }
                await sendMeal(sock, m, data.meals[0]);
            } catch (err) {
                console.error("❌ Error comida (search):", err.message);
                await sock.sendMessage(from, { text: "⚠️ Error buscando esa receta." }, { quoted: m });
            }
        }
    }
}];
