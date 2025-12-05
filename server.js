import app from './src/server/app.js';
import { PORT } from './src/server/config.js';
import { migrate } from './src/server/db/migrate.js';
migrate().then(() => {
  app.listen(PORT, () => console.log('listening on', PORT));
});
