// api/fetch-quotes.js

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') { res.status(200).end(); return; }
    if (req.method !== 'GET') { return res.status(405).json({ error: 'Method Not Allowed' }); }

    // 1. Mapeamento de Tickers (Assumindo que estes são os códigos da Massive Docs)
    const TickersMap = {
        minerio: "VALE3.SA", // Proxy. Se a Massive tiver Minério futuro, use o código real.
        brent: "BZ=F",      
        vix: "^VIX",        
        spx: "ES=F",        
        dxy: "DX-Y.NYB",    
        dolar: "BRL=X"      
    };
    
    const symbols = Object.values(TickersMap).join(','); 
    let urlEndpoint = '/v3/reference/trades/latest'; // Tentativa de endpoint de cotação em tempo real.

    try {
        const apiKey = process.env.MASSIVE_API_KEY;
        const apiUrl = process.env.MASSIVE_API_URL || 'https://api.massive.com';
        
        if (!apiKey) {
            return res.status(500).json({ success: false, message: "A chave MASSIVE_API_KEY não está configurada." });
        }

        // 2. Montando a URL e Headers
        const url = `${apiUrl}${urlEndpoint}?symbols=${symbols}`;
        
        const options = {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`, 
                'Host': new URL(apiUrl).host
            }
        };

        // 3. Chamada e Processamento
        const apiResponse = await fetch(url, options);
        const data = await apiResponse.json();

        // **Tratamento de Erros da API**
        if (!apiResponse.ok) {
            console.error("Erro na API Externa:", data);
            throw new Error(`Erro ${apiResponse.status}: Falha ao buscar cotações. (Verifique o endpoint/API Key)`);
        }

        const quotes = {};
        
        // **4. Extração dos Dados (A parte crítica)**
        // A Massive Docs usa "results" para array
        if (data.results && Array.isArray(data.results)) {
            data.results.forEach(item => {
                const ticker = item.ticker; 
                
                // *** ASSUMIMOS QUE O CAMPO É 'percent_change' ***
                // Se isso falhar, você precisa olhar o JSON retornado pela Massive Docs.
                const changePercent = item.percent_change ? (item.percent_change * 100).toFixed(2) : "0.00"; 
                
                const fieldName = Object.keys(TickersMap).find(key => TickersMap[key] === ticker);
                
                if (fieldName) {
                    quotes[fieldName] = changePercent;
                }
            });
        }
        
        // Se não encontrarmos pelo menos 5 tickers válidos, consideramos falha (400 Bad Request)
        if (Object.keys(quotes).length < 5) {
             throw new Error("Não foi possível buscar as variações percentuais. O endpoint está incorreto ou os tickers não são reconhecidos.");
        }

        return res.status(200).json({ success: true, quotes: quotes });

    } catch (error) {
        console.error("Erro ao buscar cotações:", error);
        return res.status(500).json({ 
            success: false, 
            message: `Falha na busca de cotações: ${error.message}`
        });
    }
}
