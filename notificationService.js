const axios = require('axios');

// This service will read the environment variables thanks to the dotenv setup in server.js
const PUSHOVER_API_TOKEN = process.env.PUSHOVER_API_TOKEN;
const PUSHOVER_USER_KEY = process.env.PUSHOVER_USER_KEY;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

/**
 * Sends a notification to Discord.
 * @param {object} notificationData - The data for the notification.
 * @param {string} notificationData.title - The title of the notification.
 * @param {string} notificationData.message - The main body of the notification.
 */
async function sendDiscordNotification(notificationData) {
    if (!DISCORD_WEBHOOK_URL) {
        console.error('Discord Webhook URL is not configured. Skipping notification.');
        return;
    }

    try {
        await axios.post(DISCORD_WEBHOOK_URL, {
            content: `**${notificationData.title}**\n${notificationData.message}`
        });
        console.log('Discord notification sent successfully!');
    } catch (error) {
        console.error('Error sending Discord notification:', error.response ? error.response.data : error.message);
    }
}

/**
 * Sends a notification via Pushover and Discord.
 * @param {object} notificationData - The data for the notification.
 * @param {string} notificationData.title - The title of the notification.
 * @param {string} notificationData.message - The main body of the notification.
 */
async function sendNotification(notificationData) {
    // Do not attempt to send a notification if the keys are not configured
    if (PUSHOVER_API_TOKEN && PUSHOVER_USER_KEY) {
		try {
			const response = await axios.post('https://api.pushover.net/1/messages.json', {
				token: PUSHOVER_API_TOKEN,
				user: PUSHOVER_USER_KEY,
				title: notificationData.title,
				message: notificationData.message,
				// You can add more options here, like sound, priority, etc.
				// sound: 'pushover'
			});
	
			if (response.data.status === 1) {
				console.log('Pushover notification sent successfully!');
			} else {
				console.error('Failed to send Pushover notification:', response.data.errors);
			}
		} catch (error) {
			console.error('Error sending Pushover notification:', error.response ? error.response.data : error.message);
		}
    } else {
        console.log('Pushover API Token or User Key is not configured. Skipping Pushover notification.');
    }

    await sendDiscordNotification(notificationData);
}

module.exports = { sendNotification, sendDiscordNotification };
