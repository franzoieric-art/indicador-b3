// api/fetch-quotes.js

export default async function handler(req, res) {
    // 1. Configurações de Segurança
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') { res.status(200).end(); return; }

    // 2. Mapeamento Inteligente (USANDO PROXIES DOS EUA)
    const TickersMap = {
        minerio: "VALE",   // ADR da Vale (NYSE)
        brent: "BNO",      // United States Brent Oil Fund
        vix: "VIXY",       // ProShares VIX Short-Term Futures
        spx: "SPY",        // SPDR S&P 500 ETF Trust
        dxy: "UUP",        // Invesco DB US Dollar Index Bullish
        dolar: "C:USDBRL"  // Par de Moeda Forex (Se falhar, o código trata)
    };
    
    const apiKey = process.env.MASSIVE_API_KEY;
    // A Massive usa a base api.polygon.io ou api.massive.com
    const apiUrl = 'https://api.polygon.io'; 

    if (!apiKey) {
        return res.status(500).json({ success: false, message: "API Key ausente." });
    }

    const quotes = {};

    try {
        // 3. Busca Individual para cada Ativo (Mais seguro para evitar falha em bloco)
        for (const [key, ticker] of Object.entries(TickersMap)) {
            
            // Endpoint: Previous Close (Fechamento do dia anterior)
            // É o mais confiável para contas gratuitas.
            const url = `${apiUrl}/v2/aggs/ticker/${ticker}/prev?adjusted=true&apiKey=${apiKey}`;
            
            try {
                const response = await fetch(url);
                const data = await response.json();

                if (data.results && data.results.length > 0) {
                    const result = data.results[0];
                    const close = result.c; // Fechamento
                    const open = result.o;  // Abertura do dia anterior
                    
                    // Calculamos a variação do dia anterior como referência de humor
                    const change = ((close - open) / open) * 100;
                    quotes[key] = change.toFixed(2);
                } else {
                    console.warn(`Sem dados para ${ticker}`);
                    quotes[key] = "0.00";
                }
            } catch (innerError) {
                console.error(`Erro ao buscar ${ticker}:`, innerError.message);
                quotes[key] = "0.00";
            }
        }

        return res.status(200).json({ success: true, quotes: quotes });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}
