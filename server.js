const express = require('express');
const dotenv = require('dotenv');
const cloudflareService = require('./cloudflareService');

// Function: Uses the `dotenv` module to load environment variables from the `.env` file into `process.env`.
// Returns: None.
const loadEnvVariables = () => {
  dotenv.config();
};

// Function:
// Initializes the Express application.
// Sets up middleware (e.g., parse JSON body, URL-encoded body, serve static files from `/public`).
// Sets up routes (see below).
// Returns: Express app instance.
const setupWebServer = () => {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.static('public'));

  // Routes (example)
  // app.use('/api', require('./routes/api'));

  return app;
};

// Function: Starts the web server, listening on `process.env.APP_PORT`.
// Parameters: `app` (Express app instance).
// Returns: None.
const startServer = (app) => {
  const port = process.env.APP_PORT || 3000;

  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
};



const handleSwitchDnsRequest = async (req, res) => {
  const lineChoice = req.body.line_choice;
  const password = req.body.password;

  if (password !== process.env.PASSWORD) {
    return res.status(401).json({ success: false, message: '密碼錯誤。' });
  }

  let targetIp;
  if (lineChoice === 'main') {
    targetIp = process.env.MAIN_LINE_IP;
  } else if (lineChoice === 'backup') {
    targetIp = process.env.BACKUP_LINE_IP;
  } else {
    return res.status(400).json({ success: false, message: 'Invalid line choice.' });
  }

  if (!targetIp) {
    return res.status(500).json({ success: false, message: 'Target IP not defined.' });
  }

  try {
    const result = await cloudflareService.updateDnsRecord(process.env.DNS_RECORD_NAME, targetIp);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to update DNS record.' });
  }
};


const handleGetCurrentDnsRecordIp = async (req, res) => {
  try {
    const currentIp = await cloudflareService.getCurrentDnsRecordIp(process.env.DNS_RECORD_NAME);
    const mainLineIp = process.env.MAIN_LINE_IP;
    const backupLineIp = process.env.BACKUP_LINE_IP;
    res.json({ success: true, currentIp, mainLineIp, backupLineIp });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to get current DNS record IP.' });
  }
};

// Main function to start the server
const main = () => {
  loadEnvVariables();
  const app = setupWebServer();

  app.post('/api/switch-dns', handleSwitchDnsRequest);
  app.get('/api/current-ip', handleGetCurrentDnsRecordIp);

  startServer(app);
};

main();
