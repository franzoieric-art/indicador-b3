const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
// Não é mais necessário importar fetch de forma dinâmica, o Vercel oferece nativamente.

dotenv.config(); 
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 

if (!GEMINI_API_KEY) {
    console.error("ERRO: Chave de API GEMINI_API_KEY não encontrada nas variáveis de ambiente.");
}

const app = express();
app.use(bodyParser.json());

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*"); 
    res.header("Access-Control-Allow-Headers", "Content-Type");
    next();
});

// Modelo estável e recomendado
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

app.post('/api/humor', async (req, res) => {
    // O fetch global é usado aqui diretamente, eliminando o erro de importação.
    
    const { minerio, brent, vix, dolar } = req.body;
    
    // ATUALIZAÇÃO DO PROMPT: Pede para a IA adicionar classes CSS de cor no H3 da Conclusão
    const prompt = `
        Você é um assistente de Day Trade. Sua tarefa é calcular o "Indicador Ponderado de Humor da B3" e fornecer uma análise.

        Use esta fórmula exata:
        Humor B3 = (0.35 * ΔMinério) + (0.30 * ΔBrent) - (0.15 * ΔVIX) - (0.20 * ΔDólar/Real)

        Dados de entrada:
        Minério: ${minerio}%
        Brent: ${brent}%
        VIX: ${vix}%
        Dólar/Real: ${dolar}%

        Sua resposta deve ser APENAS o código HTML para ser injetado em uma <div>.
        A resposta deve seguir exatamente esta estrutura:
        1. Um <h3 class="result-title"> com o título "📈 Interpretação do Cenário".
        2. Um <p> com o resultado numérico (Ex: "O Indicador Ponderado de Humor da B3 é +0.3855.")
        3. Um <h3 class="result-title"> com o título "Conclusão: [Sentimento]"
           - A classe CSS no H3 da Conclusão deve ser:
           - text-green-400 (se muito POSITIVO)
           - text-green-500 (se POSITIVO)
           - text-yellow-400 (se NEUTRO/MISTO)
           - text-red-500 (se NEGATIVO)
           - text-red-400 (se muito NEGATIVO)
           (Ex: <h3 class="result-title text-green-500">Conclusão: Sentimento Positivo Moderado</h3>)
        4. Um <p> com a descrição do sentimento (Ex: "Este é um resultado positivo moderado...").
        5. Um <h3 class="result-title"> com o título "Fatores de Análise".
        6. Parágrafos <p> descrevendo os fatores de suporte e pressão.

        Não inclua '<html>', '<body>' ou '´´´html´´´'. Apenas os elementos HTML (h3, p, etc.).
        Seja direto e profissional.
    `;
    
    const requestBody = {
        contents: [{
            parts: [{ text: prompt }]
        }],
        generationConfig: { 
            temperature: 0.3
        }
    };

    try {
        const response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();
        
        if (!response.ok || data.error) {
            console.error("Erro da API Gemini:", data.error || data);
            return res.status(response.status || 500).json({ 
                success: false, 
                message: `Erro na API: ${data.error ? data.error.message : 'Falha Desconhecida'}` 
            });
        }
        
        const htmlResponse = data.candidates[0].content.parts[0].text;
        
        res.json({ success: true, html: htmlResponse });
        
    } catch (error) {
        console.error("Erro na comunicação com a API:", error);
        res.status(500).json({ success: false, message: "Erro interno do servidor ao chamar a API." });
    }
});

module.exports = app;
