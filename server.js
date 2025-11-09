// server.js (Versão Corrigida com Chamada REST Segura)

const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const fetch = require('node-fetch'); // Precisamos instalar isso!

dotenv.config(); 

// A chave AGORA É LIDA DE FORMA SEGURA do arquivo .env
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 

if (!GEMINI_API_KEY) {
    console.error("ERRO: Chave de API não encontrada. Crie um arquivo .env com GEMINI_API_KEY=SUA_CHAVE");
    process.exit(1);
}

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "http://127.0.0.1:5500"); // Permite apenas o Live Server
    res.header("Access-Control-Allow-Headers", "Content-Type");
    next();
});

// URL da API do Gemini 1.5 Flash (Ajustada para o Endpoint Padrão)
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';


// Rota de API
app.post('/analisar-humor', async (req, res) => {
    const { minerio, brent, vix, dolar } = req.body;
    
    // O mesmo prompt de antes
    const prompt = `
        Você é um assistente de Day Trade. Sua tarefa é calcular o "Indicador Ponderado de Humor da B3" e fornecer uma análise.
        ... [Seu prompt completo aqui, omitido por brevidade] ...
        ... [Certifique-se de incluir as instruções para retornar APENAS HTML] ...
        
        Dados de entrada:
        Minério: ${minerio}%
        Brent: ${brent}%
        VIX: ${vix}%
        Dólar/Real: ${dolar}%
    `;
    
    // Corpo da requisição para a API
    const requestBody = {
        contents: [{
            parts: [{ text: prompt }]
        }],
        config: {
            temperature: 0.3
        }
    };

    try {
        // Fazendo a chamada fetch segura no servidor
        const response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();
        
        // Verifica se a API retornou um erro (ex: 403, 404, 500)
        if (!response.ok || data.error) {
            console.error("Erro da API Gemini:", data.error || data);
            return res.status(response.status || 500).json({ 
                success: false, 
                message: `Erro na API: ${data.error.message || 'Falha Desconhecida'}` 
            });
        }
        
        // Extrai o HTML da resposta
        const htmlResponse = data.candidates[0].content.parts[0].text;
        
        // Envia a resposta HTML de volta para o navegador
        res.json({ success: true, html: htmlResponse });
        
    } catch (error) {
        console.error("Erro na comunicação com a API:", error);
        res.status(500).json({ success: false, message: "Erro interno do servidor ao chamar a API." });
    }
});

// Inicia o Servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});