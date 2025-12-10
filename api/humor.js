import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') { res.status(200).end(); return; }
    if (req.method !== 'POST') { return res.status(405).json({ error: 'Method Not Allowed' }); }

    try {
        // RECEBENDO OS 5 INDICADORES
        const { minerio, brent, vix, dxy, dolar } = req.body;

        if ([minerio, brent, vix, dxy, dolar].includes(undefined)) {
            return res.status(400).json({ success: false, message: "Dados incompletos." });
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // PROMPT CALIBRADO PARA COMPARAR DXY x REAL
        const prompt = `
        Atue como analista sênior de B3. Analise o "Humor de Abertura" com estes dados:
        
        - Minério de Ferro: ${minerio}%
        - Petróleo Brent: ${brent}%
        - VIX (Medo Global): ${vix}%
        - DXY (Dólar Global): ${dxy}%
        - USD/BRL (Dólar vs Real): ${dolar}%

        **Regras de Interpretação Cruzada:**
        1. **DXY vs USD/BRL:**
           - Se ambos sobem: Pressão externa forte, ruim para a bolsa.
           - Se DXY cai e USD/BRL sobe: Risco fiscal ou ruído interno no Brasil (descolamento negativo).
           - Se DXY sobe e USD/BRL cai: Resiliência do Real, entrada de fluxo (positivo).
        2. **Commodities:** Minério/Brent ditam Vale/Petrobras.

        **Saída:**
        Resumo curto (máx 4 linhas), direto e levemente informal.
        Use HTML simples (<strong>, <span class="text-green-400">, <span class="text-red-400">) para destacar.
        Diga se a abertura tende a ser de Alta, Baixa ou Mista.
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        return res.status(200).json({ success: true, html: responseText });

    } catch (error) {
        console.error("Erro API:", error);
        return res.status(500).json({ success: false, message: "Erro interno." });
    }
}
