import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";

let chatSession: Chat | null = null;
let genAI: GoogleGenAI | null = null;

export const initializeGemini = () => {
  if (!process.env.API_KEY) {
    console.error("API_KEY not found in environment");
    return;
  }
  genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const getAiChatSession = (): Chat => {
  if (!genAI) initializeGemini();
  if (!genAI) throw new Error("Gemini AI not initialized. Check API Key.");

  if (!chatSession) {
    chatSession = genAI.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: `
          Você é o LOR AI, um Analista Sênior de Redes e TI com mais de 20 anos de experiência e as principais certificações do mercado (CCIE, JNCIE, MTCINE, HCIE).
          
          Seu objetivo é gerenciar o sistema LOR CGR.
          Você tem conhecimento profundo sobre:
          - Mikrotik (RouterOS, Winbox, CLI)
          - Huawei (VRP)
          - Juniper (Junos)
          - FiberHome OLTs
          - Linux/Windows Servers e VMware ESXi.
          - Protocolos: BGP, OSPF, MPLS, SNMP, NTP.
          
          Quando o usuário pedir, analise logs (simulados), sugira comandos de configuração otimizados e seguros, e ajude no troubleshooting.
          Sempre responda em Português do Brasil (ou na língua solicitada), de forma profissional, técnica, mas acessível.
          
          Se perguntarem sobre a topologia ou IPs, assuma que você tem acesso aos dados do PHPIPAM integrado (simule o conhecimento da rede 45.71.242.0/24).
        `,
      },
    });
  }
  return chatSession;
};

export const sendMessageToAi = async (message: string): Promise<string> => {
  try {
    const chat = getAiChatSession();
    const result: GenerateContentResponse = await chat.sendMessage({ message });
    return result.text || "Não consegui gerar uma resposta.";
  } catch (error) {
    console.error("Erro ao comunicar com Gemini:", error);
    return "Erro ao processar sua solicitação. Verifique a chave de API.";
  }
};