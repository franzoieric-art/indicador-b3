const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
let fetch; 

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

// ✅ CORREÇÃO FINAL: Usamos o nome de modelo estável gemini-2.5-flash
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

app.post('/api/humor', async (req, res) => {
    if (!fetch) {
        try {
            fetch = (await import('node-fetch')).default;
        } catch (e) {
            console.error("Falha ao carregar node-fetch de forma assíncrona:", e);
            return res.status(500).json({ success: false, message: "Erro de inicialização do módulo de rede no servidor." });
        }
    }
    
    const { minerio, brent, vix, dolar } = req.body;
    
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
        1. Um <h3> com o título "📈 Interpretação do Cenário".
        2. Um <p> com o resultado numérico (Ex: "O Indicador Ponderado de Humor da B3 é +0.3855.")
        3. Um <h3> com o título "Conclusão: [Sentimento]".
        4. Um <p> com a descrição do sentimento (Ex: "Este é um resultado positivo moderado...").
        5. Um <h3> com o título "Fatores de Análise".
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