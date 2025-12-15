// api/fetch-quotes.js - CÓDIGO FINAL COM ENDPOINT DE AGREGAÇÕES (AGGS)

export default async function handler(req, res) {
    // 1. CORS e Segurança
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') { res.status(200).end(); return; }
    if (req.method !== 'GET') { return res.status(405).json({ error: 'Method Not Allowed' }); }

    // Tickers que serão buscados. Usamos tickers comuns da B3 e Globais.
    const TickersMap = {
        minerio: "VALE3.SA", // Proxy para Minério (Var. da Vale)
        brent: "BZ=F",       
        vix: "^VIX",         
        spx: "ES=F",         
        dxy: "DX-Y.NYB",     
        dolar: "BRL=X"       
    };
    
    // Configurações
    const apiUrl = process.env.MASSIVE_API_URL || 'https://api.massive.com';
    const apiKey = process.env.MASSIVE_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ success: false, message: "MASSIVE_API_KEY não configurada." });
    }

    const quotes = {};

    try {
        // Data de hoje em milissegundos para o endpoint de Agregações
        const todayMillis = new Date().getTime();

        // 2. Itera sobre cada ticker e busca a agregação diária
        for (const [key, ticker] of Object.entries(TickersMap)) {
            // Endpoint de Agregação Diária (Aggs)
            // Range 1 dia, da abertura de hoje até agora.
            const url = `${apiUrl}/v2/aggs/ticker/${ticker}/range/1/day/${todayMillis}`; 
            
            const options = {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`, 
                    'Host': new URL(apiUrl).host
                }
            };
            
            const apiResponse = await fetch(url, options);
            const aggData = await apiResponse.json();

            // 3. Processamento do Resultado
            if (aggData.results && aggData.results.length > 0) {
                const dayAgg = aggData.results[0]; // Pega a agregação do dia
                
                const open = dayAgg.o; // Preço de Abertura
                const close = dayAgg.c; // Preço de Fechamento/Atual (Close)

                if (open > 0 && close > 0) {
                    const change = (close - open) / open;
                    quotes[key] = (change * 100).toFixed(2);
                } else {
                    quotes[key] = "0.00"; // Se não tiver preço ou for 0, usa 0.00
                }
            } else {
                 quotes[key] = "0.00"; // Se não houver resultado, usa 0.00
            }
        }
        
        // 4. Retorna sucesso com os 6 dados (mesmo que 0.00)
        return res.status(200).json({ success: true, quotes: quotes });

    } catch (error) {
        console.error("Erro Crítico no Auto-preenchimento:", error);
        // Retorna 500 para o Front-end saber que falhou na busca
        return res.status(500).json({ 
            success: false, 
            message: `Falha crítica ao buscar dados (Verifique logs da Vercel).`,
            details: error.message
        });
    }
}
