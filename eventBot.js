const Discord = require('discord.js');
const DPSTOPICS = require('./cardData.js');
const TOPICNAMES = Object.keys(DPSTOPICS);

class EventBot extends Discord.Client {
    constructor(prefix) {
        super();
        this.prefix = prefix;
        this.bossTotalHP = 80;
        this.totalDPS = 0;
        this.totalBlock = 0;
        this.attemptsLeft = 5;

        this.raidStatus = false;
        this.raidLocked = false;
        this.relicHolder = null;
        this.previousHolder = null;
        this.relicPassed = false;
        this.relicLocation = null;
        this.catchNumber = 0;

        this.dpsPhase = false;
        this.currentPhaseDPS = 0;
        this.currentPhaseBlock = 0;
        this.dpsArray = [];
        this.phaseDPSArray = [];
        this.defendArray = [];
        this.phaseDefendArray = [];

        this.brawlerChannel = null;
        this.guardianChannel = null;

        this.bestAttempt = {
            total: 0,
            brawlers: {},
            guardians: {}
        }

        this.currentAttempt = {
            total: 0,
            brawlers: {},
            guardians: {}
        }
    }

    getChannels(message) {
        this.brawlerChannel = message.guild.channels.cache.find(channel => channel.name === 'altar-of-shatar');
        this.guardianChannel = message.guild.channels.cache.find(channel => channel.name === 'wardens-cage');
    }

    lockRaid() {
        this.raidLocked = true;
        this.brawlerChannel.send('**Supremus goes dormant. The Raid is now locked for 1 minute.**');
        this.guardianChannel.send('**Supremus goes dormant. The Raid is now locked for 1 minute.**');

        const raidLockTimer = setInterval(() => {
            this.brawlerChannel.send('**Supremus stirs. The Raid is now unlocked.**');
            this.guardianChannel.send('**Supremus stirs. The Raid is now unlocked.**');
            this.raidLocked = false;
            clearInterval(raidLockTimer);
        }, 60000)
    }

    setAttempts(num) {
        this.attemptsLeft = num;
    }

    getBestAttempt() {
        return JSON.stringify(this.bestAttempt);
    }

    startraid(message) {
        if (!this.brawlerChannel || !this.guardianChannel) this.getChannels(message);
        let count = 3;

        const raidCountdown = setInterval(() => {
            if (count === 0) {
                this.raidStatus = true;
                message.channel.send('**The Raid has Begun!** \n**A Shard of Supremus has been dropped into the arena, someone catch it!**');
                clearInterval(raidCountdown);
            } else {
                message.channel.send(`**${count}...**`)
                count--;
            }
            
        }, 1000);
    }

    dropRelic() {
        this.relicLocation = this.brawlerChannel.name;
        this.brawlerChannel.send('**The Shard of Supremus has entered the arena again, you have 3 seconds to catch it!**')
        const relicDropCountdown = setInterval(() => {
            if (this.catchNumber < 1) {
                this.brawlerChannel.send('**Brawlers failed to catch the Shard in time... Supremus has wiped your raid party**');
                this.guardianChannel.send('**Brawlers failed to catch the Shard in time... Supremus has wiped your raid party**');
                this.wipe();
                this.lockRaid();
            }

            clearInterval(relicDropCountdown);
        }, 3000);
    }

    catch(message) {
        const user = message.author;
        this.relicHolder = user;
        this.relicPassed = false;
        this.catchNumber++;

        if (this.catchNumber === 10) {
            this.catchNumber = 0;
            this.relicHolder = null;
            this.enterDPSPhase(message);
        } else {
            this.corruptUser(message);
            message.channel.send(`**${user} has caught the Shard of Supremus and become Corrupted! They have 3 seconds to pass it to the other team!**`);

            const relicCountdown = setInterval(()=> {
                if (this.relicHolder === user) {
                    this.brawlerChannel.send(`**${user} failed to pass the Shard in time... Supremus has wiped your raid party**`);
                    this.guardianChannel.send(`**${user} failed to pass the Shard in time... Supremus has wiped your raid party**`);
                    this.wipe();
                    this.lockRaid();
                }

                clearInterval(relicCountdown);
            }, 3000);
        }

        
    }

    pass(message) {
        const currentChannel = message.channel;
        const oppositeTeamChannel = currentChannel.name === 'altar-of-shatar' ? this.guardianChannel : this.brawlerChannel;
        const currentTeamName = currentChannel.name === 'altar-of-shatar' ? 'Brawlers': 'Guardians';
        const oppositeTeamName = currentTeamName === 'Brawlers' ? 'Guardians': 'Brawlers';

        this.relicPassed = true;
        this.previousHolder = this.relicHolder;

        currentChannel.send(`**${this.relicHolder} has passed the Shard of Supremus!**`);
        oppositeTeamChannel.send(`**${this.relicHolder} has passed the Shard of Supremus! You have 3 seconds to catch it!**`);
        this.relicHolder = null;

        const prevCatchNum = this.catchNumber;

        const confirmPass = setInterval(() => {
            if (!this.dpsPhase && this.catchNumber <= prevCatchNum) {
                this.brawlerChannel.send(`**${oppositeTeamName} failed to catch the Shard in time... Supremus has wiped your raid party**`);
                this.guardianChannel.send(`**${oppositeTeamName} failed to catch the Shard in time... Supremus has wiped your raid party**`);
                this.wipe();
                this.lockRaid();
            }

            clearInterval(confirmPass);
        }, 3000);
    }

    dps(message, cardName) {
        const card = cardName.toLowerCase();
        if (this.dpsArray.includes(card) && !this.phaseDPSArray.includes(card)) {
            this.currentPhaseDPS++;
            this.currentAttempt.total++;

            const username = message.author.username;
            this.currentAttempt.brawlers[username] ? this.currentAttempt.brawlers[username]++ : this.currentAttempt.brawlers[username] = 1;

            this.phaseDPSArray.push(card);
            message.channel.send(`**${message.author} has done 1 damage to Supremus!**`);
        }
    }

    block(message, cardName) {
        const card = cardName.toLowerCase();
        if (this.defendArray.includes(card) && !this.phaseDefendArray.includes(card)) {
            this.currentPhaseBlock++;
            this.currentAttempt.total++;

            const username = message.author.username;
            this.currentAttempt.guardians[username] ? this.currentAttempt.guardians[username]++ : this.currentAttempt.guardians[username] = 1;

            this.phaseDefendArray.push(card);
            message.channel.send(`**${message.author} has blocked 1 damage from the Boss!**`);
        }
    }

    chooseDPSPhaseTopics(message) {
        const topicIndex1 = Math.floor(Math.random() * TOPICNAMES.length);
        const topicIndex2 = Math.floor(Math.random() * TOPICNAMES.length);
        this.dpsArray = DPSTOPICS[TOPICNAMES[topicIndex1]];
        this.defendArray = DPSTOPICS[TOPICNAMES[topicIndex2]]

        const brawlerChannel = message.guild.channels.cache.find(channel => channel.name === 'altar-of-shatar');
        const guardianChannel = message.guild.channels.cache.find(channel => channel.name === 'wardens-cage');

        brawlerChannel.send(`\n**You discharge the energy from the Shard. Supremus is now weak to ${TOPICNAMES[topicIndex1].split('_').join(' ')}! (STANDARD, PRE-ROTATION ONLY)**\n`);
        guardianChannel.send(`\n**Supremus readies his Molten Fist. Block his attacks with ${TOPICNAMES[topicIndex2].split('_').join(' ')}! (STANDARD, PRE-ROTATION ONLY)**\n`);
    }

    enterDPSPhase(message) {
        this.dpsPhase = true;
        this.relicHolder = null;
        this.relicPassed = false;
        this.catchNumber = 0;

        this.brawlerChannel.send('\n**Maximum Shard charge achieved! You can now DPS Supremus!**\n');
        this.guardianChannel.send('\n**Maximum Shard charge achieved! You can now DPS Supremus!**\n');

        this.chooseDPSPhaseTopics(message);

        const dpsPhaseTimer = setInterval(() => {
            this.brawlerChannel.send(`**DPS Phase has ended. You inflicted ${this.currentPhaseDPS} points of damage to Supremus.**`);
            this.guardianChannel.send(`**DPS Phase has ended. You blocked ${this.currentPhaseBlock} points of damage from Supremus.**`);

            this.endDPSPhase();

            this.defeatedBossCheck();

            clearInterval(dpsPhaseTimer);
        }, 40000);
    }

    endDPSPhase() {
        this.dpsPhase = false;

        const dpsResult = this.dpsCheck();
        const blockResult = this.defendCheck();

        if (dpsResult || blockResult) this.hardWipe();

        this.totalDPS += this.currentPhaseDPS;
        this.totalBlock += this.currentPhaseBlock;
        this.currentPhaseDPS = 0;
        this.currentPhaseBlock = 0;
    }

    dpsCheck() {
        if (this.currentPhaseDPS < 10) {
            this.brawlerChannel.send('**Brawlers have failed to deal enough damage to Supremus. Wipe Initiated.**');
            this.guardianChannel.send('**Brawlers have failed to deal enough damage to Supremus. Wipe Initiated.**');
            return true;
        }

        return false;
    }

    defendCheck() {
        if (this.currentPhaseBlock < 10) {
            this.brawlerChannel.send('**Guardians have failed to block enough damage from Supremus. Wipe Initiated.**');
            this.guardianChannel.send('**Guardians have failed to block enough damage from Supremus. Wipe Initiated.**');
            return true;
        }

        return false;
    }

    corruptUser(message) {
        const role = message.guild.roles.cache.find(role => role.name === 'Corrupted');
        const member = message.member;
        member.roles.add(role);

        const corruptTimer = setInterval(() => {
            member.roles.remove(role);
            clearInterval(corruptTimer);
        }, 20000);
    }

    corruptCheck(message) {
        const role = message.member.roles.cache.find(role => role.name === 'Corrupted');
        return role ? true : false;
    }

    defeatedBossCheck() {
        if (this.totalDPS >= this.bossTotalHP) {
            this.brawlerChannel.send(`**Congratulations! You have managed to defeat Supremus! \nYour total damage was ${this.totalDPS} \nYour total damage blocked was ${this.totalBlock}**`);
            this.guardianChannel.send(`**Congratulations! You have managed to defeat Supremus! \nYour total damage was ${this.totalDPS} \nYour total damage blocked was ${this.totalBlock}**`);
            this.wipe();
        } else if (this.raidStatus) {
            this.dropRelic();
        }
    }

    wipe() {
        if (this.currentAttempt.total > this.bestAttempt.total) {
            this.bestAttempt = this.currentAttempt;
        }
        
        this.raidStatus = false;
        this.bossTotalHP = 80;
        this.totalDPS = 0;
        this.totalBlock = 0;

        this.relicHolder = null;
        this.relicPassed = false;
        this.relicLocation = null;
        this.catchNumber = 0;

        this.dpsPhase = false;
        this.currentPhaseDPS = 0;
        this.currentPhaseBlock = 0;
        this.dpsArray = [];
        this.phaseDPSArray = [];
        this.defendArray = [];
        this.phaseDefendArray = [];

        this.currentAttempt = {
            total: 0,
            brawlers: {},
            guardians: {}
        };
    }

    hardWipe() {
        this.wipe();
        this.attemptsLeft--;
        this.brawlerChannel.send(`**Supremus drains your energy. You have ${this.attemptsLeft} attempts left to defeat him.**`);
        this.guardianChannel.send(`**Supremus drains your energy. You have ${this.attemptsLeft} attempts left to defeat him.**`);
    }
}

module.exports = EventBot;