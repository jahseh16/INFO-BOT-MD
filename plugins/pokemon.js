import axios from "axios";

export default [{
    command: '.pokemon',
    startsWith: true,
    async execute({ sock, m, text }) {
        const from = m.key.remoteJid;
        const name = text.trim().toLowerCase();

        if (!name) {
            return await sock.sendMessage(from, { text: "❌ Escribe un Pokémon.\nEjemplo: *.pokemon pikachu*" }, { quoted: m });
        }

        try {
            await sock.sendMessage(from, { text: `⏳ Buscando a *${name}* en la Pokédex...` }, { quoted: m });

            const { data } = await axios.get(`https://pokeapi.co/api/v2/pokemon/${name}`);

            const abilities = data.abilities.map(a => `- ${a.ability.name}`).join("\n");
            const types = data.types.map(t => t.type.name).join(", ");
            const stats = data.stats.map(s => ` - ${s.stat.name}: ${s.base_stat}`).join("\n");

            await sock.sendMessage(from, {
                image: { url: data.sprites.other["official-artwork"].front_default },
                caption: `⚡ *Pokémon:* ${data.name.toUpperCase()}\n\n` +
                         `📌 *Tipo:* ${types}\n\n` +
                         `💪 *Habilidades:*\n${abilities}\n\n` +
                         `📊 *Stats:*\n${stats}`
            }, { quoted: m });

        } catch (err) {
            console.error("❌ Error Pokémon:", err.message);
            await sock.sendMessage(from, { text: "⚠️ No encontré ese Pokémon. Intenta con otro nombre." }, { quoted: m });
        }
    }
}];
