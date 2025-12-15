// api/fetch-quotes.js

export default async function handler(req, res) {
    // Configurações de segurança e CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization'); // Adicionado 'Authorization'

    if (req.method === 'OPTIONS') { res.status(200).end(); return; }
    if (req.method !== 'GET') { return res.status(405).json({ error: 'Method Not Allowed' }); }

    // 1. Definição dos Tickers
    // ESTES TICKERS DEVEM SER CORRIGIDOS PARA O FORMATO DA MASSIVE DOCS (Ex: futuros, índices)
    const TickersMap = {
        minerio: "VALE3.SA", // Proxy, ajuste se a Massive tiver um ticker de minério
        brent: "BZ=F",       // Petróleo Brent
        vix: "^VIX",         // VIX Index
        spx: "ES=F",         // E-Mini S&P 500 Futuro
        dxy: "DX-Y.NYB",     // DXY
        dolar: "BRL=X"       // USD/BRL
    };
    
    // Converte os valores (tickers) em uma string para a URL
    const symbols = Object.values(TickersMap).join(','); 

    try {
        const apiKey = process.env.MASSIVE_API_KEY;
        const apiUrl = process.env.MASSIVE_API_URL || 'https://api.massive.com';
        
        if (!apiKey) {
            return res.status(500).json({ 
                success: false, 
                message: "A chave MASSIVE_API_KEY não foi configurada na Vercel." 
            });
        }

        // 2. Montando a Requisição com o Header de Autenticação (Bearer Token)
        // OBS: Você precisará verificar qual é o endpoint exato para COTAÇÕES em tempo real. 
        // Aqui usamos um endpoint genérico de "quotes":
        const url = `${apiUrl}/v3/reference/quotes?symbols=${symbols}`;
        
        const options = {
            method: 'GET',
            headers: {
                // Formato exigido: Authorization: Bearer SUA_CHAVE
                'Authorization': `Bearer ${apiKey}`, 
                'Host': new URL(apiUrl).host
            }
        };

        // 3. Chamada à API e Processamento
        const apiResponse = await fetch(url, options);
        const data = await apiResponse.json();

        // **Atenção:** A estrutura JSON da Massive Docs para quotes é desconhecida.
        // O código abaixo é um EXEMPLO de como extrair. Você pode precisar ajustá-lo!
        
        const quotes = {};
        
        // Simulação de extração: Se a resposta da Massive Docs for parecida com a de cotações comuns.
        if (data.results && Array.isArray(data.results)) {
            data.results.forEach(item => {
                const ticker = item.ticker; // Assume que o campo é 'ticker'
                const changePercent = (item.change_percent * 100).toFixed(2); // Assume que a variação é 'change_percent'
                
                // Mapeia de volta para os nomes dos seus campos
                const fieldName = Object.keys(TickersMap).find(key => TickersMap[key] === ticker);
                
                if (fieldName) {
                    quotes[fieldName] = changePercent;
                }
            });
        }
        
        // 4. Retorna os dados
        if (Object.keys(quotes).length < 5) { // Se não encontrou a maioria dos 6
             throw new Error("Não foi possível buscar as cotações. Verifique o endpoint e os tickers.");
        }

        return res.status(200).json({
            success: true,
            quotes: quotes
        });

    } catch (error) {
        console.error("Erro ao buscar cotações:", error);
        return res.status(500).json({ 
            success: false, 
            message: `Falha na busca de cotações: ${error.message}`
        });
    }
}
