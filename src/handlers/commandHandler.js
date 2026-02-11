const fs = require('node:fs');
const path = require('node:path');

module.exports = function loadCommands(client) {
  const commandsPath = path.join(__dirname, '..', 'commands');
  const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

  for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
    } else {
      console.warn(`[WARNING] Command ${file} missing "data" or "execute".`);
    }
  }

  console.log(`Loaded ${client.commands.size} commands.`);
};
