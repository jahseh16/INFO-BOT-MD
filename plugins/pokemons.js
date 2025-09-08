import axios from "axios";

export default [{
    command: '.pokemons',
    startsWith: true,
    async execute({ sock, m, args }) {
        const from = m.key.remoteJid;
        const page = parseInt(args[0]) || 1;
        const limit = 20; // cuantos por página
        const offset = (page - 1) * limit;

        if (page < 1) {
            return await sock.sendMessage(from, { text: "❌ El número de página no es válido." }, { quoted: m });
        }

        try {
            await sock.sendMessage(from, { text: `⏳ Buscando lista de Pokémon (página ${page})...` }, { quoted: m });

            const { data } = await axios.get(
                `https://pokeapi.co/api/v2/pokemon?limit=${limit}&offset=${offset}`
            );

            if (!data.results || data.results.length === 0) {
                return await sock.sendMessage(from, { text: "⚠️ No hay más Pokémon en la lista." }, { quoted: m });
            }

            const list = data.results
                .map((p, i) => `${offset + i + 1}. ${p.name}`)
                .join("\n");

            await sock.sendMessage(from, {
                text: `📜 *Pokémon - Página ${page}*\n\n${list}\n\n👉 Escribe *.pokemons ${page + 1}* para la siguiente página.`
            }, { quoted: m });

        } catch (err) {
            console.error("❌ Error Pokemons:", err.message);
            await sock.sendMessage(from, { text: "⚠️ Error cargando la lista de Pokémon." }, { quoted: m });
        }
    }
}];
