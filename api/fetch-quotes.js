// api/fetch-quotes.js

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') { res.status(200).end(); return; }

    // 1. Calcula a data do último dia útil (Sexta-feira se for Segunda)
    function getLastWeekday() {
        const d = new Date();
        const day = d.getDay(); // 0=Dom, 1=Seg, ..., 6=Sab
        
        if (day === 1) d.setDate(d.getDate() - 3); // Segunda -> Pega Sexta
        else if (day === 0) d.setDate(d.getDate() - 2); // Domingo -> Pega Sexta
        else if (day === 6) d.setDate(d.getDate() - 1); // Sábado -> Pega Sexta
        else d.setDate(d.getDate() - 1); // Terça a Sexta -> Pega Ontem

        return d.toISOString().split('T')[0]; // YYYY-MM-DD
    }

    const targetDate = getLastWeekday(); // Ex: "2025-12-12"
    
    // 2. Mapeamento: Ticker do ETF (EUA) -> Seu campo no HTML
    const TickerMap = {
        "VALE": "minerio", // Vale ADR
        "BNO": "brent",    // Brent Oil Fund
        "VIXY": "vix",     // VIX Short-Term
        "SPY": "spx",      // S&P 500
        "UUP": "dxy"       // Dólar Index (DXY)
    };

    try {
        const apiKey = process.env.MASSIVE_API_KEY;
        if (!apiKey) throw new Error("MASSIVE_API_KEY não configurada.");

        // 3. Chamada ÚNICA para api.massive.com (Grouped Daily)
        // Traz o fechamento de TODO o mercado de ações dos EUA de uma vez.
        // Isso evita o erro "Too Many Requests" (Limite de 5).
        const url = `https://api.massive.com/v2/aggs/grouped/locale/us/market/stocks/${targetDate}?adjusted=true`;

        const response = await fetch(url, {
            headers: { 
                'Authorization': `Bearer ${apiKey}` 
            }
        });

        if (!response.ok) {
            // Se der erro, tenta ler o motivo
            const errorText = await response.text();
            throw new Error(`Erro Massive (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        const quotes = {
            minerio: "0.00", brent: "0.00", vix: "0.00", 
            spx: "0.00", dxy: "0.00", dolar: "0.00"
        };

        // 4. Garimpa os nossos 5 tickers no meio dos milhares de resultados
        if (data.results && Array.isArray(data.results)) {
            data.results.forEach(item => {
                const ticker = item.T; // 'T' é o símbolo na Massive
                
                if (TickerMap[ticker]) {
                    const fieldName = TickerMap[ticker];
                    // Variação = (Fechamento - Abertura) / Abertura
                    const change = ((item.c - item.o) / item.o) * 100;
                    quotes[fieldName] = change.toFixed(2);
                }
            });
        }

        // Retorna o que conseguiu. (Dólar ficará 0.00, o usuário preenche)
        return res.status(200).json({ success: true, quotes: quotes });

    } catch (error) {
        console.error("Erro Fetch Quotes:", error);
        // Retorna 200 com zeros e mensagem de erro no console, para não quebrar a página
        return res.status(200).json({ 
            success: false, 
            quotes: { minerio: "0.00", brent: "0.00", vix: "0.00", spx: "0.00", dxy: "0.00", dolar: "0.00" },
            message: error.message 
        });
    }
}
