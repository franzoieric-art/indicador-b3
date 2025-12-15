// api/fetch-quotes.js - CÓDIGO FINAL COM ENDPOINT MASSIVE (v2)

export default async function handler(req, res) {
    // Configurações de CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') { res.status(200).end(); return; }
    if (req.method !== 'GET') { return res.status(405).json({ error: 'Method Not Allowed' }); }

    // 1. Mapeamento de Tickers
    // Usamos os tickers de FUTUROS e ÍNDICES mais comuns
    const TickersMap = {
        minerio: "VALE3.SA", // Usaremos a variação da VALE como proxy
        brent: "BZ=F",       
        vix: "^VIX",         
        spx: "ES=F",         
        dxy: "DX-Y.NYB",     
        dolar: "BRL=X"       
    };
    
    // O endpoint de Last Trade (última negociação) da Massive Docs é um por ticker
    const apiUrl = process.env.MASSIVE_API_URL || 'https://api.massive.com';
    const apiKey = process.env.MASSIVE_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ success: false, message: "MASSIVE_API_KEY não configurada." });
    }

    const quotes = {};

    try {
        // 2. Itera sobre cada ticker e faz a busca
        for (const [key, ticker] of Object.entries(TickersMap)) {
            // Tentamos o endpoint: /v2/last/trade/AAPL (conforme o README do Go Client)
            const url = `${apiUrl}/v2/last/trade/${ticker}`;
            
            const options = {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`, 
                    'Host': new URL(apiUrl).host
                }
            };
            
            const apiResponse = await fetch(url, options);
            const data = await apiResponse.json();

            if (!apiResponse.ok) {
                console.warn(`Aviso: Falha ao buscar ${ticker}. Status: ${apiResponse.status}`);
                quotes[key] = "0.00"; // Se falhar, assume 0.00 para não quebrar a página
                continue;
            }

            // 3. Extração dos Dados (A parte que mais falha)
            // Assumimos que a resposta tem a variação percentual
            // **IMPORTANTE: A RESPOSTA V2 LAST TRADE SÓ DÁ O PREÇO. VAMOS TENTAR EXTRAIR A VARIAÇÃO DA ÚLTIMA COTAÇÃO**
            
            // Para simplificar, faremos uma busca por agg (variação diária), que é mais robusto
            const aggUrl = `${apiUrl}/v2/aggs/ticker/${ticker}/range/1/day/${new Date().getTime()}`;
            const aggResponse = await fetch(aggUrl, options);
            const aggData = await aggResponse.json();

            if (aggData.results && aggData.results.length > 0) {
                const dayAgg = aggData.results[0];
                // A variação percentual é (Fechamento - Abertura) / Abertura
                const change = (dayAgg.c - dayAgg.o) / dayAgg.o; // 'c' é Close, 'o' é Open (Convenção Polygon/Massive)
                quotes[key] = (change * 100).toFixed(2);
            } else {
                 quotes[key] = "0.00";
            }
        }
        
        // 4. Retorna sucesso
        return res.status(200).json({ success: true, quotes: quotes });

    } catch (error) {
        console.error("Erro Crítico no Auto-preenchimento:", error);
        return res.status(500).json({ 
            success: false, 
            message: `Falha crítica. Tente novamente mais tarde.`,
            details: error.message
        });
    }
}
