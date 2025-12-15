// api/fetch-quotes.js - VERSÃO OTIMIZADA (1 CHAMADA ÚNICA)

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') { res.status(200).end(); return; }
    if (req.method !== 'GET') { return res.status(405).json({ error: 'Method Not Allowed' }); }

    // 1. Função para pegar o último dia útil (Sexta se for Fim de Semana/Segunda)
    function getLastWeekday() {
        const d = new Date();
        const day = d.getDay(); // 0 = Domingo, 1 = Segunda, ... 6 = Sábado
        
        // Se for Segunda (1), Domingo (0) ou Sábado (6), volta para Sexta-feira
        if (day === 1) d.setDate(d.getDate() - 3); // Segunda -> Sexta
        else if (day === 0) d.setDate(d.getDate() - 2); // Domingo -> Sexta
        else if (day === 6) d.setDate(d.getDate() - 1); // Sábado -> Sexta
        else d.setDate(d.getDate() - 1); // Terça a Sexta -> Dia anterior

        return d.toISOString().split('T')[0]; // Formato YYYY-MM-DD
    }

    const targetDate = getLastWeekday();
    
    // 2. Mapeamento: Qual ticker do usuário corresponde a qual ticker nos EUA
    const TickerMap = {
        "VALE": "minerio", // Vale ADR
        "BNO": "brent",    // Brent Oil Fund
        "VIXY": "vix",     // VIX Short-Term Futures ETF
        "SPY": "spx",      // S&P 500 ETF
        "UUP": "dxy",      // US Dollar Index Bullish Fund
        // "EWZ": "dolar"  // Opcional: EWZ invertido pode servir de proxy se USDBRL falhar
    };

    try {
        const apiKey = process.env.MASSIVE_API_KEY;
        // URL da Massive (Polygon) para "Agrupado Diário" (Grouped Daily)
        // Traz o fechamento de TODO o mercado em 1 requisição.
        const url = `https://api.polygon.io/v2/aggs/grouped/locale/us/market/stocks/${targetDate}?adjusted=true`;

        if (!apiKey) throw new Error("API Key não configurada.");

        // 3. Requisição Única
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });

        if (!response.ok) {
            throw new Error(`Erro Massive: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const quotes = {
            minerio: "0.00", brent: "0.00", vix: "0.00", 
            spx: "0.00", dxy: "0.00", dolar: "0.00"
        };

        // 4. Filtragem: Procura apenas os tickers que nos interessam no meio de milhares
        if (data.results && Array.isArray(data.results)) {
            data.results.forEach(item => {
                // O ticker vem na propriedade 'T' (maiúsculo) neste endpoint
                const tickerSymbol = item.T; 
                
                if (TickerMap[tickerSymbol]) {
                    const fieldName = TickerMap[tickerSymbol];
                    // Cálculo da variação: (Close - Open) / Open
                    // 'c' = Close, 'o' = Open
                    const change = ((item.c - item.o) / item.o) * 100;
                    quotes[fieldName] = change.toFixed(2);
                }
            });
        }

        // Correção manual para o Dólar (USD/BRL)
        // O endpoint de ações não traz moedas. Vamos tentar uma estimativa ou deixar manual.
        // Se quiser tentar buscar BRL separado (seria a 2ª requisição), pode falhar no rate limit.
        // Por segurança, deixamos 0.00 ou usamos um valor fixo de teste.
        
        return res.status(200).json({ success: true, quotes: quotes });

    } catch (error) {
        console.error("Erro Fetch:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
}
