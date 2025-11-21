import { GoogleGenAI } from "@google/genai";
import { GameResult, Winner, Gesture } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateCommentary = async (result: GameResult): Promise<string> => {
  try {
    const model = "gemini-2.5-flash";
    
    let prompt = `Eres un comentarista deportivo sarcástico y divertido de un partido de Piedra, Papel o Tijera.
    
    El usuario jugó: ${result.userGesture}
    La CPU jugó: ${result.cpuGesture}
    Resultado: ${result.winner === Winner.User ? "Ganó el Humano" : result.winner === Winner.Cpu ? "Ganó la CPU" : "Empate"}
    
    Genera un comentario muy breve (máximo 15 palabras) en Español reaccionando al resultado. Sé ingenioso.`;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    return response.text || "¡Qué partida tan intensa!";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "";
  }
};