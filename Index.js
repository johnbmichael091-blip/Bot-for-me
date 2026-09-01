const {
  Client,
  GatewayIntentBits,
  PermissionsBitField
} = require("discord.js");

const TOKEN = process.env.DISCORD_TOKEN;

// ==========================================
// ADD YOUR WORDS / PHRASES HERE
// ==========================================

const TRIGGER_PHRASES = [
  // "word",
  // "another word",
  // "some phrase"
];

// ==========================================
// SETTINGS
// ==========================================

// 1 hour by default
const TIMEOUT_DURATION = 60 * 60 * 1000;

// Optional moderation-log channel.
// Leave "" if you don't want logging.
const LOG_CHANNEL_ID = "";


// ==========================================
// BOT SETUP
// ==========================================

if (!TOKEN) {
  console.error("ERROR: DISCORD_TOKEN is missing.");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});


// ==========================================
// NORMALIZE TEXT
// ==========================================

function normalize(text) {
  return text
    .toLowerCase()
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();
}

const phrases = TRIGGER_PHRASES
  .map(normalize)
  .filter(Boolean);


// ==========================================
// BOT READY
// ==========================================

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
  console.log(`Watching for ${phrases.length} phrase(s).`);
});


// ==========================================
// MESSAGE DETECTION
// ==========================================

client.on("messageCreate", async (message) => {
  try {

    // Ignore DMs
    if (!message.guild) return;

    // Ignore other bots
    if (message.author.bot) return;

    // Nothing configured yet
    if (phrases.length === 0) return;

    const content = normalize(message.content);

    // Find matching phrase
    const matchedPhrase = phrases.find((phrase) =>
      content.includes(phrase)
    );

    if (!matchedPhrase) return;


    // ========================================
    // DELETE MESSAGE
    // ========================================

    await message.delete().catch(() => {});


    // ========================================
    // GET MEMBER
    // ========================================

    const member = message.member;

    if (!member) return;

    const botMember = message.guild.members.me;

    if (!botMember) return;


    // ========================================
    // CHECK MODERATION PERMISSION
    // ========================================

    if (
      !botMember.permissions.has(
        PermissionsBitField.Flags.ModerateMembers
      )
    ) {
      console.error(
        "The bot needs the Moderate Members permission."
      );

      return;
    }


    // ========================================
    // TIMEOUT USER
    // ========================================

    if (!member.moderatable) {

      console.log(
        `Could not timeout ${member.user.tag}. ` +
        `Discord role hierarchy prevents it.`
      );

      return;
    }

    await member.timeout(
      TIMEOUT_DURATION,
      `Automatic moderation: ${matchedPhrase}`
    );


    console.log(
      `Timed out ${member.user.tag} for triggering "${matchedPhrase}".`
    );


    // ========================================
    // OPTIONAL LOG
    // ========================================

    if (LOG_CHANNEL_ID) {

      const logChannel =
        await client.channels
          .fetch(LOG_CHANNEL_ID)
          .catch(() => null);

      if (logChannel && logChannel.isTextBased()) {

        await logChannel.send(
          `🚨 **Automatic Moderation**\n` +
          `**User:** ${member.user.tag} (${member.id})\n` +
          `**Phrase:** \`${matchedPhrase}\`\n` +
          `**Timeout:** ${Math.round(
            TIMEOUT_DURATION / 60000
          )} minutes`
        ).catch(() => {});
      }
    }

  } catch (error) {

    console.error(
      "Moderation error:",
      error
    );

  }
});


// ==========================================
// LOGIN
// ==========================================

client.login(TOKEN);
