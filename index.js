const EventBot = require('./eventBot.js');
const { prefix, token } = require('./config.json');

const eventBot = new EventBot(prefix);

eventBot.once('ready', () => {
    console.log('Ready!');
});

eventBot.on('message', message => {
    let commandCall = message.content.substring(prefix.length).split(' ');
    const command = commandCall[0];
    const userCall = commandCall[1];

    const channelCheck = ['altar-of-shatar', 'wardens-cage', 'event-planning', 'bot-testing'].includes(message.channel.name);

    if (channelCheck) {
        switch(command) {
            case 'startraid':
                if (!userCall && !eventBot.raidStatus && !eventBot.raidLocked && eventBot.attemptsLeft > 0) {
                    eventBot.relicLocation = message.channel.name;
                    eventBot.startraid(message);
                }
                
                break;
            
            case 'catch':
                if (!userCall && eventBot.raidStatus && !eventBot.relicHolder && eventBot.relicLocation === message.channel.name && !eventBot.corruptCheck(message) && !eventBot.dpsPhase) {
                    eventBot.catch(message)
                }

                break;
            
            case 'pass':
                if (!userCall && eventBot.raidStatus && eventBot.relicHolder === message.author) {
                    eventBot.relicLocation = eventBot.relicLocation === 'altar-of-shatar' ? eventBot.guardianChannel.name : eventBot.brawlerChannel.name;
                    eventBot.pass(message);
                }

                break;
            
            case 'dps':
                if (userCall && eventBot.dpsPhase && message.channel.name === 'altar-of-shatar') {
                    const cardName = commandCall.slice(1).join(' ');
                    eventBot.dps(message, cardName);
                }

                break;
            
            case 'block':
                if (userCall && eventBot.dpsPhase && message.channel.name === 'wardens-cage') {
                    const cardName = commandCall.slice(1).join(' ');
                    eventBot.block(message, cardName);
                }

                break;
            
            case 'setattempts':
                if (userCall && message.member.roles.cache.find(role => role.name === 'Moderator')) {
                    eventBot.setAttempts(parseInt(userCall));
                    message.channel.send(`Set number of attempts to ${userCall}`);
                }

                break;
            
            case 'bestattempt':
                if (!userCall && message.member.roles.cache.find(role => role.name === 'Moderator')) {
                    const best = eventBot.getBestAttempt();
                    message.channel.send(best);
                }

                break;
        }
    }
});

eventBot.login(token);