import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
    // 1. Configuração de CORS (Permissões de acesso)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Tratamento da requisição OPTIONS (Pre-flight do navegador)
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Só aceita POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { minerio, brent, vix, dxy, dolar, spx } = req.body;

        // Inicializa a IA com a Chave
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        
        // CORREÇÃO AQUI: Voltamos para o "gemini-pro" que é mais estável
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        // --- O PROMPT "HEAD TRADER" (Mantido) ---
        const prompt = `
        Aja como um Head Trader Sênior de uma mesa de operações focada em Day Trade na B3.
        
        Seu objetivo: Dar um direcionamento curto, grosso e assertivo para o trader operar a abertura.
        
        Dados de Mercado (Pré-Abertura):
        - S&P 500 Futuro: ${spx}%
        - Minério de Ferro: ${minerio}% 
        - Petróleo Brent: ${brent}%
        - VIX: ${vix}%
        - DXY: ${dxy}%
        - USD/BRL: ${dolar}%

        Regras de Correlação:
        1. S&P Positivo + Commodities Positivas = GAP de Alta (Risk-On).
        2. S&P Negativo + VIX subindo = GAP de Baixa (Risk-Off).
        3. DXY forte pressiona o Dólar Real para cima.
        4. Minério direciona a Vale (grande peso no IBOV).

        Formato da Resposta (HTML Simples):
        <p><strong>Cenário:</strong> [Resumo de 1 linha conectando os pontos principais]</p>
        <p><strong>Viés de Abertura:</strong> [Alta / Baixa / Neutro]</p>
        <p><strong>Volatilidade Esperada:</strong> [Alta / Média / Baixa]</p>
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        return res.status(200).json({
            success: true,
            html: responseText
        });

    } catch (error) {
        console.error("Erro CRÍTICO na API IA:", error); // Isso vai pro Log da Vercel
        return res.status(500).json({ 
            success: false, 
            message: "Erro interno no servidor ao processar IA.",
            details: error.message 
        });
    }
}
