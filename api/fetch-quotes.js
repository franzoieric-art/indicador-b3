// api/fetch-quotes.js - CÓDIGO DE TESTE DE CONEXÃO E CHAVE API

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') { res.status(200).end(); return; }
    if (req.method !== 'GET') { return res.status(405).json({ error: 'Method Not Allowed' }); }

    // 1. Definição do Ticker de TESTE
    const TickersMap = {
        minerio: "AAPL" // Usamos APPL apenas para testar a conexão com o endpoint de Dividends
    };
    
    const symbols = Object.values(TickersMap).join(','); 
    // Usamos o endpoint de DIVIDENDS, que vimos na sua documentação, para forçar a conexão
    let urlEndpoint = '/v3/reference/dividends'; 

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

        // 2. Chamada
        const apiResponse = await fetch(url, options);
        const data = await apiResponse.json();

        if (!apiResponse.ok) {
            console.error("Erro na API Externa:", data);
            throw new Error(`Erro ${apiResponse.status} - Falha na API. Sua chave está inválida ou o endpoint não existe.`);
        }

        // 3. Verifica se a busca foi bem-sucedida (O QUE NOS INTERESSA)
        if (data.results && data.results.length > 0) {
            // Se chegou aqui, a CHAVE API e o ENDPOINT ESTÃO CORRETOS.
            // Retornamos um sucesso fictício para que o Front-end não quebre.
             return res.status(200).json({ 
                 success: true, 
                 quotes: { 
                     minerio: "99.99", brent: "0.00", vix: "0.00", 
                     spx: "0.00", dxy: "0.00", dolar: "0.00" 
                 },
                 message: "Conexão OK! O problema agora é o NOME DO MODELO de cotação."
             });
        }
        
        throw new Error("Resposta da API OK, mas nenhum dado retornado (Ticker ou período incorreto).");

    } catch (error) {
        console.error("Erro ao buscar cotações:", error);
        return res.status(500).json({ 
            success: false, 
            message: `Falha na busca: ${error.message}`
        });
    }
}
