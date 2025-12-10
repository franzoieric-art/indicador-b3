import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
    // --- Configuração de CORS (Essencial para não dar erro no navegador) ---
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Responde rápido para pre-flight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Aceita apenas POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // 1. RECEBENDO DADOS DO FRONT-END
        const { minerio, brent, vix, dxy, dolar } = req.body;

        console.log("Recebido:", { minerio, brent, vix, dxy, dolar });

        // Validação: Garante que nada veio nulo
        if (minerio == null || brent == null || vix == null || dxy == null || dolar == null) {
            return res.status(400).json({ 
                success: false, 
                message: "Dados incompletos. Preencha todos os campos." 
            });
        }

        // 2. INICIALIZANDO O GEMINI
        if (!process.env.GEMINI_API_KEY) {
            throw new Error("API Key não configurada no ambiente Vercel.");
        }
        
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

        // --- AQUI ESTAVA O ERRO ---
        // Usamos a string oficial estável. Com o package.json atualizado, isso VAI funcionar.
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // 3. O PROMPT (CÉREBRO)
        const prompt = `
        Você é um analista de mercado financeiro sênior (Brasil/B3).
        
        Dados de Abertura:
        - Minério de Ferro: ${minerio}%
        - Petróleo Brent: ${brent}%
        - VIX (Medo): ${vix}%
        - DXY (Dólar Global): ${dxy}%
        - USD/BRL (Dólar/Real): ${dolar}%

        Análise Técnica Cruzada:
        1. DXY e USD/BRL subindo juntos = Aversão a risco (Ruim para Ibovespa).
        2. DXY caindo e USD/BRL subindo = Ruído fiscal interno (Ruim).
        3. DXY subindo e USD/BRL caindo = Entrada de fluxo estrangeiro (Bom).
        4. Minério e Brent impactam diretamente Vale e Petrobras.

        Gere um resumo curto (4 linhas), tom direto e profissional.
        Use HTML (<strong>, <span class="text-green-400">, <span class="text-red-400">) para colorir altas e baixas.
        Finalize com: "Viés de Abertura: [Alta/Baixa/Neutro]".
        `;

        // 4. GERANDO
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        return res.status(200).json({
            success: true,
            html: responseText
        });

    } catch (error) {
        console.error("Erro API:", error);
        // Retorna erro 500 com detalhes para facilitar o debug
        return res.status(500).json({ 
            success: false, 
            message: "Erro ao processar IA. Verifique Logs.",
            details: error.message 
        });
    }
}
