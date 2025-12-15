// api/fetch-quotes.js - CÓDIGO FINAL COM ENDPOINT DE COTAÇÃO

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') { res.status(200).end(); return; }
    if (req.method !== 'GET') { return res.status(405).json({ error: 'Method Not Allowed' }); }

    // 1. Mapeamento de Tickers (Ajuste esses tickers se a Massive Docs usar outros códigos!)
    const TickersMap = {
        minerio: "VALE3.SA", // Proxy (Ajuste se houver ticker de Minério Futuro)
        brent: "BZ=F",       
        vix: "^VIX",         
        spx: "ES=F",         // Futuro S&P
        dxy: "DX-Y.NYB",     // Índice DXY
        dolar: "BRL=X"       // Dólar vs Real
    };
    
    const symbols = Object.values(TickersMap).join(','); 
    
    // *** ENDPOINT DE COTAÇÃO EM TEMPO REAL ***
    // Tenta o endpoint de cotações em tempo real (quotes/latest trade).
    // Se este falhar, a Massive Docs usa outro nome (ex: /trades/latest ou /market/realtime)
    let urlEndpoint = '/v3/reference/quotes/latest'; 

    try {
        const apiKey = process.env.MASSIVE_API_KEY;
        const apiUrl = process.env.MASSIVE_API_URL || 'https://api.massive.com';
        
        if (!apiKey) {
            throw new Error("MASSIVE_API_KEY não configurada.");
        }

        const url = `${apiUrl}${urlEndpoint}?symbols=${symbols}`;
        
        const options = {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`, 
                'Host': new URL(apiUrl).host
            }
        };

        // 2. Chamada e Tratamento de Erros
        const apiResponse = await fetch(url, options);
        const data = await apiResponse.json();

        if (!apiResponse.ok) {
            console.error("Erro na API Externa:", data);
            throw new Error(`Erro ${apiResponse.status}: Falha ao buscar cotações. ENDPOINT: ${urlEndpoint}`);
        }

        const quotes = {};
        
        // 3. Extração dos Dados
        // Assume que a resposta tem um array 'results'
        if (data.results && Array.isArray(data.results)) {
            data.results.forEach(item => {
                const ticker = item.ticker; 
                
                // Assume que o campo de variação percentual é 'percent_change'
                // Se isso falhar, você precisa descobrir o nome exato na documentação!
                const changePercent = item.percent_change ? (item.percent_change * 100).toFixed(2) : "0.00"; 
                
                const fieldName = Object.keys(TickersMap).find(key => TickersMap[key] === ticker);
                
                if (fieldName) {
                    quotes[fieldName] = changePercent;
                }
            });
        }
        
        // 4. Se encontrou todos, retorna sucesso.
        if (Object.keys(quotes).length === Object.keys(TickersMap).length) {
             return res.status(200).json({ success: true, quotes: quotes });
        }
        
        // Se a chamada foi 200 OK, mas os dados vieram vazios (erro de ticker/período)
        throw new Error(`Dados incompletos retornados. Tickers inválidos para ${urlEndpoint}?`);

    } catch (error) {
        console.error("Erro ao buscar cotações:", error);
        return res.status(500).json({ 
            success: false, 
            message: `Falha na busca (Código ${error.message.includes('404') ? '404' : '500'}).`
        });
    }
}
