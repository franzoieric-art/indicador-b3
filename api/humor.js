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

        console.log("Dados recebidos:", { minerio, brent, vix, dxy, dolar });

        // Verifica se algum dado está faltando
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

        // --- CORREÇÃO AQUI ---
        // Tentando conectar diretamente na versão 2.5 Flash conforme sua indicação.
        // Se este nome exato falhar, tente "gemini-2.0-flash" ou apenas "gemini-pro" como fallback.
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); 

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
        1. **DXY vs USD/
