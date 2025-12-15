import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
    // --- 1. Configuração de Segurança e Acesso (CORS) ---
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Responde requisições de verificação do navegador
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Bloqueia métodos que não sejam POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // --- 2. Recebimento dos Dados ---
        const { minerio, brent, vix, dxy, dolar } = req.body;

        console.log("Recebido na API:", { minerio, brent, vix, dxy, dolar });

        // Validação: Aceita o número 0, mas rejeita nulo ou vazio
        if (minerio == null || brent == null || vix == null || dxy == null || dolar == null) {
            return res.status(400).json({ 
                success: false, 
                message: "Dados incompletos. Por favor, preencha todos os campos." 
            });
        }

        // --- 3. Configuração da IA (Gemini 2.5 Flash) ---
        if (!process.env.GEMINI_API_KEY) {
            throw new Error("A chave API do Gemini (GEMINI_API_KEY) não está configurada.");
        }
        
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

        // *** IMPLEMENTAÇÃO DO GEMINI 2.5 FLASH ***
        // Usando o modelo solicitado explicitamente.
        // Nota: Se der erro 404, significa que a Google ainda não liberou essa string publicamente na API.
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // --- 4. O Prompt (Instruções) ---
        const prompt = `
        Atue como um analista de mercado financeiro sênior (Especialista em B3).
        
        Analise o sentimento de abertura com base nestes dados:
        - Minério de Ferro: ${minerio}%
        - Petróleo Brent: ${brent}%
        - VIX (Risco Global): ${vix}%
        - DXY (Dólar Global): ${dxy}%
        - USD/BRL (Câmbio Interno): ${dolar}%

        Regras de Correlação:
        1. DXY e USD/BRL subindo juntos = Forte aversão a risco (Risk-off). Negativo para Ibovespa.
        2. DXY caindo e USD/BRL subindo = Estresse local (Risco Fiscal/Político).
        3. DXY subindo e USD/BRL caindo = Entrada de fluxo estrangeiro (Sinal positivo).
        4. Minério e Brent: Impacto direto em Vale e Petrobras.

        Gere um resumo curto (máximo 4 linhas), tom profissional e direto.
        Utilize tags HTML para destacar (ex: <strong>, <span class="text-green-400">, <span class="text-red-400">).
        Termine obrigatoriamente com: "Viés de Abertura: [Alta / Baixa / Volatilidade]".
        `;

        // --- 5. Geração ---
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        return res.status(200).json({
            success: true,
            html: responseText
        });

    } catch (error) {
        console.error("Erro Crítico na API:", error);
        
        // Retorna o erro detalhado para o Front-end (ajuda a saber se o nome do modelo está errado)
        return res.status(500).json({ 
            success: false, 
            message: "Erro ao processar a IA.",
            details: error.message 
        });
    }
}
