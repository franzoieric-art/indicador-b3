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

        // Inicializa a IA com a Chave
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        
        // --- CORREÇÃO DEFINITIVA: MODELO 2.5 FLASH ---
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // Prompt "Head Trader" (Mantido)
        const prompt = `
        Aja como um Head Trader Sênior de uma mesa de operações de alta frequência na B3.
        Seu cliente é um Day Trader que precisa de viés imediato para abertura (Índice e Dólar).
        
        Dados do Pré-Mercado:
        - S&P 500 Futuro: ${spx}% (Termômetro Global)
        - Minério de Ferro (Singapura): ${minerio}% (Vale/Índice)
        - Petróleo Brent: ${brent}% (Petrobras)
        - VIX: ${vix}% (Medo/Volatilidade)
        - DXY: ${dxy}% (Dólar Global)
        - USD/BRL: ${dolar}% (Câmbio Local)

        Regras de Bolso:
        1. S&P e Minério positivos juntos = Forte chance de GAP de Alta no Índice.
        2. VIX subindo forte (>1%) = Aversão a risco (Venda Índice / Compra Dólar).
        3. DXY puxa o Dólar Real. Se DXY sobe, Dólar tende a abrir em alta.
        4. Petróleo impacta Petrobras, mas Minério manda mais no Índice geral.

        Sua Resposta (Formato HTML Limpo):
        <div class="text-left space-y-2">
            <p class="text-gray-300"><strong class="text-blue-400">Análise Flash:</strong> [Uma frase direta conectando o driver principal do dia. Ex: "O otimismo externo do S&P ignora a queda do petróleo..."]</p>
            
            <div class="grid grid-cols-2 gap-4 mt-2">
                <div class="bg-gray-800 p-2 rounded border-l-4 border-blue-500">
                    <span class="block text-xs text-gray-500 uppercase">Viés Índice</span>
                    <span class="font-bold text-lg text-white">[ALTA / BAIXA / NEUTRO]</span>
                </div>
                <div class="bg-gray-800 p-2 rounded border-l-4 border-green-500">
                    <span class="block text-xs text-gray-500 uppercase">Viés Dólar</span>
                    <span class="font-bold text-lg text-white">[ALTA / BAIXA / NEUTRO]</span>
                </div>
            </div>
            
            <p class="text-xs text-gray-500 mt-1">⚠️ Volatilidade esperada: <span class="text-white font-bold">[ALTA / MÉDIA / BAIXA]</span>. Opere com stop.</p>
        </div>
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        return res.status(200).json({
            success: true,
            html: responseText
        });

    } catch (error) {
        console.error("Erro CRÍTICO na API IA:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Erro no servidor (Modelo IA). Verifique logs.",
            details: error.message 
        });
    }
}
