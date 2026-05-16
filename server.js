import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Token oficial fornecido por você
const MEU_TOKEN = 'wMAjqHMw3_Oc5STzl5TJuQ';

app.use(express.json());
// Servir arquivos estáticos da pasta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Rota para processar a busca (individual ou lote)
app.post('/api/consultar-eans', async (expressReq, expressRes) => {
    const { eans } = expressReq.body;

    if (!eans || !Array.isArray(eans) || eans.length === 0) {
        return expressRes.status(400).json({ error: 'Nenhum EAN foi enviado.' });
    }

    const resultados = [];

    // Processa cada EAN enviado
    for (const gtin of eans) {
        const limpoGtin = gtin.trim();
        if (!limpoGtin) continue;

        const url = `https://api.cosmos.bluesoft.com.br/gtins/${limpoGtin}.json`;

        try {
            const respostaCosmos = await fetch(url, {
                method: 'GET',
                headers: {
                    'X-Cosmos-Token': MEU_TOKEN,
                    'User-Agent': 'Cosmos-API-Request',
                    'Content-Type': 'application/json'
                }
            });

            if (!respostaCosmos.ok) {
                resultados.push({
                    gtin: limpoGtin,
                    status: 'Erro',
                    descricao: `Erro na API (Status ${respostaCosmos.status})`,
                    cest: '-',
                    unidade: '-',
                    marca: '-',
                    ncm: '-'
                });
                continue;
            }

            const dados = await respostaCosmos.json();

            // Tratamento do CEST
            let cestExibicao = 'Não associado';
            if (dados.cest) {
                cestExibicao = typeof dados.cest === 'object' ? (dados.cest.code || 'Não associado') : dados.cest;
            } else if (dados.ncm && dados.ncm.cest) {
                cestExibicao = typeof dados.ncm.cest === 'object' ? (dados.ncm.cest.code || 'Não associado') : dados.ncm.cest;
            }

            // Tratamento da Unidade Comercial
            let unidadeComercial = dados.commercial_unit || (dados.gtin_row && dados.gtin_row.commercial_unit);
            if (!unidadeComercial) {
                if (dados.net_weight && dados.net_weight > 0) {
                    const pesoKg = dados.net_weight / 1000;
                    unidadeComercial = pesoKg >= 1 ? `${pesoKg} KG` : `${dados.net_weight}g`;
                } else {
                    unidadeComercial = 'UN';
                }
            }

            resultados.push({
                gtin: dados.gtin,
                status: 'Sucesso',
                descricao: dados.description || 'Sem descrição',
                cest: cestExibicao,
                unidade: unidadeComercial,
                marca: dados.brand ? dados.brand.name : 'Não informada',
                ncm: dados.ncm ? `${dados.ncm.code}` : '-'
            });

        } catch (erro) {
            resultados.push({
                gtin: limpoGtin,
                status: 'Erro',
                descricao: 'Falha de conexão com o servidor',
                cest: '-',
                unidade: '-',
                marca: '-',
                ncm: '-'
            });
        }
    }

    expressRes.json(resultados);
});

app.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(` Servidor rodando em http://localhost:${PORT}`);
    console.log(`==================================================\n`);
});