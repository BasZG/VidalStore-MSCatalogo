import * as fs from 'node:fs';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';

// ─────────────────────────────────────────────────────────────
// Modelo destino (equivalente al Juego del micro)
// ─────────────────────────────────────────────────────────────
interface Juego {
  id: string;
  titulo: string;
  descripcion: string;
  imagen: string;
  precio: number;
  genero: string;
  fechaPublicacion: string;
}

// ─────────────────────────────────────────────────────────────
// Forma de la respuesta de FreeToGame (solo lo que usamos)
// ─────────────────────────────────────────────────────────────
interface FreeToGameJuego {
  id: number;
  title: string;
  thumbnail: string;
  short_description: string;
  genre: string;
  release_date: string;
}

// ─────────────────────────────────────────────────────────────
// Transforma un juego de FreeToGame al modelo propio
// Precio determinista: mismo id → mismo precio siempre
// ─────────────────────────────────────────────────────────────
function transformar(f: FreeToGameJuego): Juego {
  return {
    id: randomUUID(),
    titulo: f.title,
    descripcion: f.short_description,
    imagen: f.thumbnail,
    genero: f.genre,
    fechaPublicacion: f.release_date,
    precio: Number((5 + ((f.id * 37) % 2500) / 100).toFixed(2)),
  };
}

// ─────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  console.log(' Iniciando seed desde FreeToGame...');

  const respuesta = await fetch('https://www.freetogame.com/api/games', {
    headers: { 'User-Agent': 'VidalStore-Seed/1.0' },
  });

  if (!respuesta.ok) {
    throw new Error(`FreeToGame respondió ${respuesta.status}`);
  }

  const crudos = (await respuesta.json()) as FreeToGameJuego[];
  console.log(` Recibidos ${crudos.length} juegos de FreeToGame`);

  const juegos = crudos.map(transformar);

  const rutaDestino = path.join(process.cwd(), 'data', 'juegos.json');
  fs.writeFileSync(rutaDestino, JSON.stringify(juegos, null, 2), 'utf-8');

  console.log(`Escritos ${juegos.length} juegos en ${rutaDestino}`);
}

main().catch((err) => {
  console.error(' Error en el seed:', err);
  process.exit(1);
});
