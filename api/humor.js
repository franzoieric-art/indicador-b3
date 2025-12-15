import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
    // 1. Configuração de CORS (Permissões de acesso)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // 2. Recebendo os 6 indicadores (incluindo SPX)
        const { minerio, brent, vix, dxy, dolar, spx } = req.body;

        console.log("Recebido:", { minerio, brent, vix, dxy, dolar, spx });

        // Validação: Garante que todos os 6 campos vieram
        if (minerio == null || brent == null || vix == null || dxy == null || dolar == null || spx == null) {
            return res.status(400).json({ 
                success: false, 
                message: "Dados incompletos. Por favor, preencha todos os 6 indicadores." 
            });
        }

        // 3. Inicializando a IA
        if (!process.env.GEMINI_API_KEY) {
            throw new Error("Chave API não configurada.");
        }
        
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

        // Usando o modelo solicitado (Gemini 2.5 Flash)
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); 

        // 4. Prompt com o novo indicador S&P Futuro
        const prompt = `
        Atue como um analista de mercado financeiro sênior (Especialista em B3).
        
        Analise o sentimento de abertura com base nestes 6 dados:
        - Minério de Ferro: ${minerio}%
        - Petróleo Brent: ${brent}%
        - VIX (Risco Global): ${vix}%
        - S&P 500 Futuro: ${spx}% <--- NOVO
        - DXY (Dólar Global): ${dxy}%
        - USD/BRL (Câmbio Interno): ${dolar}%

        Regras de Correlação:
        1. S&P Futuro: É o principal termômetro de humor de Wall Street antes da abertura. S&P Futuro subindo é um forte indicador de Risk-On global (positivo).
        2. DXY e USD/BRL: Analise a correlação para identificar se o risco é global ou local.
        3. Commodities: Minério e Brent dão a direção para Vale e Petrobras.

        Gere um resumo curto (máximo 4 linhas), tom profissional e direto.
        Utilize tags HTML para destacar (ex: <strong>, <span class="text-green-400">, <span class="text-red-400">).
        Termine obrigatoriamente com: "Viés de Abertura: [Alta / Baixa / Volatilidade]".
        `;

        // 5. Geração
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        return res.status(200).json({
            success: true,
            html: responseText
        });

    } catch (error) {
        console.error("Erro Crítico na API:", error);
        
        return res.status(500).json({ 
            success: false, 
            message: "Erro ao processar a IA. (Verifique o nome do modelo/chave API).",
            details: error.message 
        });
    }
}
