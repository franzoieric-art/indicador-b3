// api/fetch-quotes.js - CÓDIGO FINAL COM FORMATO DE DATA CORRETO

export default async function handler(req, res) {
    // 1. CORS e Segurança
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') { res.status(200).end(); return; }
    if (req.method !== 'GET') { return res.status(405).json({ error: 'Method Not Allowed' }); }

    // Função para obter a data de HOJE no formato AAAAMMDD (Massive/Polygon)
    function getTodayDateString() {
        const d = new Date();
        const year = d.getFullYear();
        // Mês e Dia precisam de zero à esquerda se for menor que 10
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`; // Ex: 2025-12-15
    }

    // Tickers que serão buscados. Usamos tickers de índices e commodities
    const TickersMap = {
        minerio: "BABA",       // Proxy: Alibaba (ligado à demanda chinesa, mais global que VALE3)
        brent: "BNO",          // ETF de Petróleo Brent
        vix: "^VIX",           // VIX Index
        spx: "SPY",            // Proxy: ETF S&P 500 (Muito negociado, reflete o futuro)
        dxy: "DX-Y.NYB",       // DXY Index (se não funcionar, tente o proxy: "UUP")
        dolar: "BRL=X"         // USD/BRL (forex)
    };
    
    // Configurações
    const apiUrl = process.env.MASSIVE_API_URL || 'https://api.massive.com';
    const apiKey = process.env.MASSIVE_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ success: false, message: "MASSIVE_API_KEY não configurada." });
    }

    const quotes = {};
    const today = getTodayDateString();

    try {
        // 2. Itera sobre cada ticker
        for (const [key, ticker] of Object.entries(TickersMap)) {
            // Endpoint de Agregação Diária (Aggs)
            // Agora usamos a DATA no formato STRING (AAAAMMDD) - Range 1 dia
            const url = `${apiUrl}/v2/aggs/ticker/${ticker}/range/1/day/${today}`; 
            
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
                const dayAgg = aggData.results[0];
                
                const open = dayAgg.o; // Preço de Abertura
                const close = dayAgg.c; // Preço de Fechamento/Atual (Close)

                if (open > 0 && close > 0) {
                    const change = (close - open) / open;
                    quotes[key] = (change * 100).toFixed(2);
                } else {
                    quotes[key] = "0.00";
                }
            } else {
                 quotes[key] = "0.00";
            }
        }
        
        // 4. Retorna sucesso com os 6 dados
        return res.status(200).json({ success: true, quotes: quotes });

    } catch (error) {
        console.error("Erro Crítico no Auto-preenchimento:", error);
        return res.status(500).json({ 
            success: false, 
            message: `Falha crítica ao buscar dados. O endpoint da Massive Docs pode estar incorreto: ${error.message}`,
            details: error.message
        });
    }
}
