"use strict";
/**
 * Minimal Telegram Bot API wrapper using Node 20 native fetch.
 * All calls are fire-and-forget: errors are logged but never thrown.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMessage = sendMessage;
exports.muteUser = muteUser;
exports.unmuteUser = unmuteUser;
exports.kickUser = kickUser;
exports.banUser = banUser;
exports.unbanUser = unbanUser;
async function call(token, method, body) {
    try {
        const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!res.ok) {
            const err = await res.text();
            console.warn(`[telegram] ${method} failed: ${err}`);
        }
    }
    catch (e) {
        console.error(`[telegram] ${method} error:`, e);
    }
}
/** Send an HTML-formatted message to a chat or user. */
function sendMessage(token, chatId, text) {
    return call(token, 'sendMessage', { chat_id: chatId, text, parse_mode: 'HTML' });
}
/** Remove all send permissions from a user in a Telegram group. */
function muteUser(token, chatId, userId) {
    return call(token, 'restrictChatMember', {
        chat_id: chatId,
        user_id: userId,
        permissions: {
            can_send_messages: false,
            can_send_audios: false,
            can_send_documents: false,
            can_send_photos: false,
            can_send_videos: false,
            can_send_video_notes: false,
            can_send_voice_notes: false,
            can_send_polls: false,
            can_send_other_messages: false,
            can_add_web_page_previews: false,
        },
    });
}
/** Restore full send permissions for a user in a Telegram group. */
function unmuteUser(token, chatId, userId) {
    return call(token, 'restrictChatMember', {
        chat_id: chatId,
        user_id: userId,
        permissions: {
            can_send_messages: true,
            can_send_audios: true,
            can_send_documents: true,
            can_send_photos: true,
            can_send_videos: true,
            can_send_video_notes: true,
            can_send_voice_notes: true,
            can_send_polls: true,
            can_send_other_messages: true,
            can_add_web_page_previews: true,
        },
    });
}
/**
 * Remove a user from a Telegram group, then immediately unban so they
 * can rejoin once their payment is resolved.
 */
async function kickUser(token, chatId, userId) {
    await call(token, 'banChatMember', { chat_id: chatId, user_id: userId });
    await call(token, 'unbanChatMember', { chat_id: chatId, user_id: userId, only_if_banned: true });
}
/** Permanently ban a user — they cannot rejoin until explicitly unbanned. */
function banUser(token, chatId, userId) {
    return call(token, 'banChatMember', { chat_id: chatId, user_id: userId });
}
/** Lift a permanent ban so the user can rejoin via invite link. */
function unbanUser(token, chatId, userId) {
    return call(token, 'unbanChatMember', { chat_id: chatId, user_id: userId, only_if_banned: true });
}
//# sourceMappingURL=telegram.js.map