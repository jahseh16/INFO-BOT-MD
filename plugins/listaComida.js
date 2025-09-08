import axios from "axios";

export default [{
    command: '.comidas',
    async execute({ sock, m }) {
        const from = m.key.remoteJid;
        try {
            await sock.sendMessage(from, { text: "📋 Buscando lista de comidas disponibles..." }, { quoted: m });

            // Pide lista de comidas por categoría "Beef" como ejemplo
            const { data } = await axios.get("https://www.themealdb.com/api/json/v1/1/filter.php?c=Beef");

            if (!data.meals) {
                return await sock.sendMessage(from, { text: "❌ No encontré comidas en este momento." }, { quoted: m });
            }

            // Toma solo los primeros 15 platos para no saturar
            const lista = data.meals.slice(0, 15).map((meal, i) => `${i + 1}. ${meal.strMeal}`).join("\n");

            await sock.sendMessage(from, {
                text: `🍽️ *Lista de Comidas (Beef)*\n\n${lista}\n\n👉 Usa *.comida <nombre>* para ver los detalles de una receta.`
            }, { quoted: m });
        } catch (err) {
            console.error("❌ Error lista comidas:", err.message);
            await sock.sendMessage(from, { text: "⚠️ Error obteniendo la lista de comidas." }, { quoted: m });
        }
    }
}];
