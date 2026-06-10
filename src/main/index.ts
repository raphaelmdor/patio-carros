import express from 'express';
import path from 'path';
import { initDatabase } from './database';
import { registerRoutes } from './routes';

const PORT = parseInt(process.env.PORT || '3000');

async function main() {
  await initDatabase();

  const app = express();
  app.use(express.json({ limit: '50mb' }));
  app.use(express.static(path.join(__dirname, '../../src/renderer')));

  registerRoutes(app);

  app.listen(PORT, () => {
    console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
  });
}

main().catch(err => {
  console.error('Erro fatal:', err.message);
  process.exit(1);
});
