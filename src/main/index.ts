import express from 'express';
import path from 'path';
import { initDatabase } from './database';
import { registerRoutes } from './routes';

const PORT = parseInt(process.env.PORT || '3000');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../../src/renderer')));

// Healthcheck dedicado — responde antes do banco conectar
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Sobe o servidor imediatamente para o healthcheck passar
app.listen(PORT, () => {
  console.log(`🚀 Servidor na porta ${PORT}`);
});

// Conecta ao banco e registra as rotas de API
initDatabase()
  .then(() => {
    registerRoutes(app);
    console.log('✅ Banco conectado — rotas de API ativas');
  })
  .catch(err => {
    console.error('❌ Erro ao conectar ao banco:', err.message);
    // Servidor continua rodando; rotas de API retornam 503
    app.use('/api', (_req, res) => {
      res.status(503).json({ success: false, error: 'Banco de dados indisponível' });
    });
  });
