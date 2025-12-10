import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
    // Cabeçalhos para evitar erro de CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Responde rápido para requisições de verificação (OPTIONS)
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Aceita apenas POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // 1. RECEBENDO E VERIFICANDO OS DADOS
        const { minerio, brent, vix, dxy, dolar } = req.body;

        // Log para debug no painel da Vercel (ajuda a ver o que chegou)
        console.log("Dados recebidos:", { minerio, brent, vix, dxy, dolar });

        // Verifica se algum dado está faltando (undefined ou null)
        if (minerio == null || brent == null || vix == null || dxy == null || dolar == null) {
            return res.status(400).json({ 
                success: false, 
                message: "Dados incompletos recebidos pela API." 
            });
        }

        // 2. CONFIGURANDO A IA
        if (!process.env.GEMINI_API_KEY) {
            throw new Error("A chave API do Gemini (GEMINI_API_KEY) não está configurada na Vercel.");
        }
        
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // 3. CRIANDO O PROMPT
        const prompt = `
        Atue como um analista de mercado financeiro sênior especializado em B3 (Brasil).
        
        Analise o "Humor de Abertura do Mercado" com base nestes indicadores pré-mercado:
        
        - Minério de Ferro: ${minerio}%
        - Petróleo Brent: ${brent}%
        - VIX (Medo Global): ${vix}%
        - Índice DXY (Dólar Global): ${dxy}%
        - USD/BRL (Dólar vs Real): ${dolar}%

        **Regras de Interpretação Cruzada:**
        1. **DXY vs USD/BRL:**
           - Se ambos sobem: Pressão externa forte, ruim para a bolsa brasileira.
           - Se DXY cai e USD/BRL sobe: Risco fiscal ou ruído interno no Brasil (descolamento negativo).
           - Se DXY sobe e USD/BRL cai: Resiliência do Real, entrada de fluxo (positivo).
        2. **Commodities:** Minério e Brent ditam o ritmo de Vale e Petrobras.
        3. **VIX:** Acima de 2% de alta indica aversão a risco.

        **Sua Tarefa:**
        Gere um resumo curto (máximo 4 linhas), direto e levemente informal.
        Use formatação HTML simples (como <strong> para negrito e cores do Tailwind como <span class="text-green-400"> ou <span class="text-red-400">) para destacar os pontos chaves.
        Conclua com uma viés: Alta, Baixa ou Volatilidade.
        `;

        // 4. GERANDO A RESPOSTA
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        return res.status(200).json({
            success: true,
            html: responseText
        });

    } catch (error) {
        console.error("Erro interno na API:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Erro interno no servidor ao processar IA.",
            details: error.message 
        });
    }
}
