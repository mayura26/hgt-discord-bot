require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

const config = require('./src/config');
const commands = [];

const commandsPath = path.join(__dirname, 'src', 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if ('data' in command && 'execute' in command) {
    commands.push(command.data.toJSON());
  } else {
    console.warn(`[WARNING] ${file} missing "data" or "execute".`);
  }
}

const rest = new REST().setToken(config.token);

(async () => {
  try {
    console.log(`Deploying ${commands.length} commands to guild ${config.guildId}...`);

    const data = await rest.put(
      Routes.applicationGuildCommands(config.clientId, config.guildId),
      { body: commands },
    );

    console.log(`Successfully registered ${data.length} commands.`);
  } catch (error) {
    console.error('Failed to deploy commands:', error);
  }
})();
