// api/humor.js - Serverless Function para Vercel (FINAL E CORRIGIDO)

const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
// Variável fetch declarada, que será carregada de forma assíncrona (solução para ERR_REQUIRE_ESM)
let fetch; 

// Configuração Inicial e Chave de API
dotenv.config(); 
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 

if (!GEMINI_API_KEY) {
    console.error("ERRO: Chave de API GEMINI_API_KEY não encontrada nas variáveis de ambiente. Configure a variável no Vercel.");
}

const app = express();

// Middleware (Permite comunicação e processa JSON)
app.use(bodyParser.json());

// Adiciona cabeçalhos CORS
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*"); 
    res.header("Access-Control-Allow-Headers", "Content-Type");
    next();
});

// URL da API do Gemini 1.5 Flash
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// Rota de API (É o ponto de entrada da Serverless Function)
app.post('/api/humor', async (req, res) => {
    // Carrega node-fetch de forma assíncrona (import() dinâmico)
    if (!fetch) {
        try {
            fetch = (await import('node-fetch')).default;
        } catch (e) {
            console.error("Falha ao carregar node-fetch de forma assíncrona:", e);
            return res.status(500).json({ success: false, message: "Erro de inicialização do módulo de rede no servidor." });
        }
    }
    
    const { minerio, brent, vix, dolar } = req.body;
    
    // O Prompt da IA
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
    
    // Corpo da requisição para a API
    const requestBody = {
        contents: [{
            parts: [{ text: prompt }]
        }],
        // ✅ CORREÇÃO FINAL AQUI: Usa 'generationConfig' em vez de 'config'
        generationConfig: { 
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
            // Retorna a mensagem de erro da API para o frontend
            return res.status(response.status || 500).json({ 
                success: false, 
                message: `Erro na API: ${data.error ? data.error.message : 'Falha Desconhecida'}` 
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

// EXPORTAÇÃO ESSENCIAL PARA O VERCEL
module.exports = app;