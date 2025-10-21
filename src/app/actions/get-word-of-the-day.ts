'use server';

const WORD_API_URL = 'https://palabras-aleatorias-public-api.herokuapp.com/random-by-type?types=sustantivo,verbo,adjetivo';

// Lista de respaldo local en caso de que la API falle
const fallbackWords = [
    { word: 'Educación', definition: 'Proceso de facilitar el aprendizaje o la adquisición de conocimientos, habilidades, valores, creencias y hábitos.' },
    { word: 'Resiliencia', definition: 'Capacidad de adaptación de un ser vivo frente a un agente perturbador o un estado o situación adversos.' },
    { word: 'Conocimiento', definition: 'Facultad del ser humano para comprender por medio de la razón la naturaleza, cualidades y relaciones de las cosas.' },
    { word: 'Creatividad', definition: 'Capacidad de generar nuevas ideas o conceptos, de nuevas asociaciones entre ideas y conceptos conocidos, que habitualmente producen soluciones originales.' },
    { word: 'Futuro', definition: 'Porción del tiempo que todavía no ha sucedido.' }
];

export interface WordOfTheDayResponse {
  word: string;
  definition: string;
}

export async function getWordOfTheDay(): Promise<WordOfTheDayResponse> {
  try {
    const response = await fetch(WORD_API_URL, { signal: AbortSignal.timeout(3000) }); // Timeout de 3 segundos

    if (!response.ok) {
      throw new Error(`La API devolvió un estado ${response.status}`);
    }

    const data = await response.json();
    const wordDetails = data.body;

    if (!wordDetails || !wordDetails.Word || !wordDetails.Definition) {
      throw new Error('La respuesta de la API no tiene el formato esperado.');
    }
    
    return {
      word: wordDetails.Word,
      definition: wordDetails.Definition,
    };

  } catch (error) {
    console.warn('La API externa de palabras falló. Usando una palabra de respaldo local.', error);
    // Si la API falla, usamos una palabra de nuestra lista de respaldo.
    const randomIndex = Math.floor(Math.random() * fallbackWords.length);
    return fallbackWords[randomIndex];
  }
}
