// Carrega o .env quando ele existe (máquina local). No GitHub Actions as variáveis vêm dos Secrets.
try {
  process.loadEnvFile();
} catch {
  // sem .env: segue com o ambiente do processo
}
