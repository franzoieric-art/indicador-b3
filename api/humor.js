import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
    // Cabeçalhos para evitar erro de CORS (Permite que seu site acesse a API)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Responde rápido para requisições de verificação do navegador (OPTIONS)
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Aceita apenas método POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // 1. RECEBENDO E VERIFICANDO OS DADOS
        const { minerio, brent, vix, dxy, dolar } = req.body;

        // Log para debug no painel da Vercel
        console.log("Dados recebidos:", { minerio, brent, vix, dxy, dolar });

        // Verifica se algum dado está faltando (undefined ou null)
        // Nota: Zero (0) é aceito, mas null/undefined não.
        if (minerio == null || brent == null || vix == null || dxy == null || dolar == null) {
            return res.status(400).json({ 
                success: false, 
                message: "Dados incompletos recebidos pela API." 
            });
        }

        // 2. CONFIGURANDO A IA
        // Certifique-se de que a variável GEMINI_API_KEY está nas configurações da Vercel
        if (!process.env.GEMINI_API_KEY) {
            throw new Error("A chave API do Gemini (GEMINI_API_KEY) não está configurada na Vercel.");
        }
        
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        
        // Usando o modelo Flash (Rápido e barato)
        // Se quiser testar o experimental futuro: "gemini-2.0-flash-exp"
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // 3. CRIANDO O PROMPT (O CÉREBRO DA ANÁLISE)
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
           - Se ambos sobem: Pressão externa forte (Risk-off), péssimo para a bolsa brasileira.
           - Se DXY cai e USD/BRL sobe: Problema interno no Brasil (Risco Fiscal/Ruído Político).
           - Se DXY sobe e USD/BRL cai: Resiliência do Real, entrada de fluxo estrangeiro (Sinal positivo).
           - Se ambos caem: Alívio global, tende a ser bom para ativos de risco.
        2. **Commodities:** Minério e Brent ditam o ritmo de Vale e Petrobras (pesos pesados do índice).
        3. **VIX:** Alta acima de 1-2% indica aversão a risco global.

        **Sua Tarefa:**
        Gere um resumo curto (máximo 4 linhas), direto e levemente informal (estilo morning call).
        Use formatação HTML simples para destacar (ex: <strong>, <span class="text-green-400"> para alta, <span class="text-red-400"> para baixa).
        
        Conclua com o viés para a abertura: Alta, Baixa ou Volatilidade.
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
