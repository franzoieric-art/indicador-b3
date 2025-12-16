import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
    // 1. Configuração de CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
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
        const { minerio, brent, vix, dxy, dolar, spx } = req.body;

        // Validação básica
        if (!minerio || !brent || !vix || !spx || !dxy || !dolar) {
            return res.status(400).json({ 
                success: false, 
                message: "Dados incompletos." 
            });
        }

        // Inicializa a IA
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Usando Flash que é mais rápido

        // --- A MÁGICA ACONTECE AQUI: O NOVO PROMPT "TRADER" ---
        const prompt = `
        Aja como um Head Trader Sênior de uma mesa de operações focada em Day Trade na B3 (Índice e Dólar).
        
        Seu objetivo: Dar um direcionamento assertivo e rápido para o trader que vai operar a abertura.
        
        Dados de Mercado (Pré-Abertura):
        - S&P 500 Futuro: ${spx}% (O fiel da balança global)
        - Minério de Ferro: ${minerio}% (Direciona Vale/Índice)
        - Petróleo Brent: ${brent}% (Direciona Petrobras)
        - VIX: ${vix}% (Medo/Volatilidade. Acima de 1% positivo é alerta)
        - DXY: ${dxy}% (Força do Dólar Global)
        - USD/BRL: ${dolar}% (Câmbio local)

        Regras de Análise:
        1. S&P Positivo + Commodities Positivas = GAP de Alta (Risk-On).
        2. S&P Negativo + VIX subindo = GAP de Baixa (Risk-Off).
        3. DXY subindo forte geralmente pressiona o Dólar Real para cima.
        4. Minério tem peso duplo no Índice Bovespa (Vale).

        Formato da Resposta (Obrigatório):
        Comece com: "Olá, Trader."
        Parágrafo 1: Resumo executivo do cenário. Conecte os pontos (Ex: "O S&P puxa o otimismo, apoiado pelo Minério..."). Use linguagem de trader (pullback, gap, fluxo, aversão a risco).
        Parágrafo 2 (Conclusão Assertiva): "Cenário Provável: Abertura em [Alta/Baixa/Neutro] com [Alta/Baixa/Média] volatilidade."

        Mantenha curto (máximo 350 caracteres). Seja direto.
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        return res.status(200).json({
            success: true,
            html: responseText
        });

    } catch (error) {
        console.error("Erro API IA:", error);
        return res.status(500).json({ success: false, message: "Erro ao processar análise." });
    }
}
