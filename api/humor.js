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

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        
        // Mantendo o modelo 2.5 conforme solicitado
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
        Aja como um Head Trader Institucional da B3. Seja direto, técnico e cirúrgico.
        
        Dados do Pré-Mercado:
        - S&P 500 Futuro: ${spx}%
        - Minério (SGX): ${minerio}%
        - Brent: ${brent}%
        - VIX: ${vix}%
        - DXY: ${dxy}%
        - USD/BRL: ${dolar}%

        Gere um HTML puro (sem crases de markdown) com esta estrutura visual:
        
        <div class="space-y-4">
            <div class="bg-gray-800/50 p-3 rounded-lg border border-gray-700">
                <p class="text-gray-300 text-sm leading-relaxed">
                    <strong class="text-blue-400 uppercase text-xs tracking-wider block mb-1">Morning Call IA</strong>
                    [Sua análise de 2 linhas aqui. Ex: O S&P renova máximas ignorando o petróleo, o que projeta abertura positiva, mas o VIX exige cautela com stops curtos.]
                </p>
            </div>

            <div class="grid grid-cols-2 gap-3">
                <div class="bg-gray-900 p-3 rounded border-l-4 border-blue-500 flex flex-col items-center justify-center shadow-lg">
                    <span class="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Índice Futuro</span>
                    <span class="font-black text-xl text-white tracking-tight">[ALTA / BAIXA]</span>
                </div>
                <div class="bg-gray-900 p-3 rounded border-l-4 border-green-500 flex flex-col items-center justify-center shadow-lg">
                    <span class="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Dólar Futuro</span>
                    <span class="font-black text-xl text-white tracking-tight">[ALTA / BAIXA]</span>
                </div>
            </div>
            
            <div class="flex items-center justify-between text-xs text-gray-500 border-t border-gray-800 pt-2 mt-2">
                <span>Volatilidade: <strong class="text-white">[ALTA/MÉDIA]</strong></span>
                <span>Driver: <strong class="text-blue-400">[Fator Principal]</strong></span>
            </div>
        </div>
        `;

        const result = await model.generateContent(prompt);
        let responseText = result.response.text();

        // --- A MÁGICA DA LIMPEZA ---
        // Remove as crases (```html e ```) que causavam a "quebrinha" no layout
        responseText = responseText.replace(/```html/g, '').replace(/```/g, '');

        return res.status(200).json({
            success: true,
            html: responseText
        });

    } catch (error) {
        console.error("Erro API IA:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Erro no processamento.",
            details: error.message 
        });
    }
}
