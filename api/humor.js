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

    // Responde rápido para verificação do navegador
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // 2. Recebendo os 5 indicadores
        const { minerio, brent, vix, dxy, dolar } = req.body;

        console.log("Recebido:", { minerio, brent, vix, dxy, dolar });

        // Validação: Garante que os dados chegaram (mesmo que sejam 0)
        if (minerio == null || brent == null || vix == null || dxy == null || dolar == null) {
            return res.status(400).json({ 
                success: false, 
                message: "Dados incompletos recebidos pela API." 
            });
        }

        // 3. Inicializando a IA
        if (!process.env.GEMINI_API_KEY) {
            throw new Error("Chave API não configurada.");
        }
        
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

        // --- A SOLUÇÃO ESTÁ AQUI ---
        // Usamos "gemini-pro". Ele redireciona automaticamente para o modelo estável ativo.
        // Isso evita o erro 404 de modelos específicos como flash/1.5/2.5.
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        // 4. Prompt (Cérebro da Análise)
        const prompt = `
        Atue como analista de mercado financeiro (B3).
        Dados pré-mercado:
        - Minério: ${minerio}%
        - Brent: ${brent}%
        - VIX: ${vix}%
        - DXY: ${dxy}%
        - USD/BRL: ${dolar}%

        Regras de Bolso:
        1. DXY sobe + Dolar cai = Fluxo estrangeiro entrando (Bom).
        2. DXY sobe + Dolar sobe = Aversão a risco global (Ruim).
        3. DXY cai + Dolar sobe = Risco Brasil (Fiscal/Político).
        4. Minério dita Vale; Brent dita Petrobras.

        Responda em 4 linhas máx.
        Use HTML (<strong>, <span class="text-green-400">, <span class="text-red-400">) para destacar.
        Finalize: "Viés: [Alta/Baixa/Neutro]".
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        return res.status(200).json({
            success: true,
            html: responseText
        });

    } catch (error) {
        console.error("Erro API:", error);
        // Retorna erro 500 com a mensagem clara
        return res.status(500).json({ 
            success: false, 
            message: "Erro ao gerar análise.",
            details: error.message 
        });
    }
}
