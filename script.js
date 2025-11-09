// script.js

document.addEventListener("DOMContentLoaded", () => {
    
    const form = document.getElementById("humor-form");
    const submitButton = document.getElementById("submit-button");
    const loader = document.getElementById("loader");
    const respostaDiv = document.getElementById("resposta-ia");

    form.addEventListener("submit", async (event) => {
        event.preventDefault(); 

        loader.classList.remove("hidden");
        submitButton.disabled = true;
        respostaDiv.innerHTML = ""; 

        // 1. Coletar dados
        const dados = {
            minerio: document.getElementById("minerio").value,
            brent: document.getElementById("brent").value,
            vix: document.getElementById("vix").value,
            dolar: document.getElementById("dolar").value
        };

        try {
            // 2. Chama o seu servidor local (porta 3000)
            const response = await fetch('/api/humor', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dados)
            });

            const result = await response.json();

            // 3. Processa a resposta do servidor
            if (result.success) {
                respostaDiv.innerHTML = result.html;
            } else {
                respostaDiv.innerHTML = `<p class="error">Falha no servidor: ${result.message}</p>`;
            }

        } catch (error) {
            console.error("Erro na comunicação com o servidor local:", error);
            respostaDiv.innerHTML = `<p class="error">Falha ao calcular. Certifique-se de que o servidor Node.js está rodando.</p>`;
        } finally {
            loader.classList.add("hidden");
            submitButton.disabled = false;
        }
    });

});