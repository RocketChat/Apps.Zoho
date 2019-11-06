import { IModify, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { IMessageAttachment } from '@rocket.chat/apps-engine/definition/messages';
import { IRoom, RoomType } from '@rocket.chat/apps-engine/definition/rooms';
import { IUser } from '@rocket.chat/apps-engine/definition/users';
import { ZohoApp } from '../ZohoApp';

/**
 * Gets a direct message room between bot and another user, creating if it doesn't exist
 *
 * @param app ZohoApp
 * @param read
 * @param modify
 * @param username the username to create a direct with bot
 * @returns the room or undefined if botUser or botUsername is not set
 */
export async function getDirect(app: ZohoApp, read: IRead, modify: IModify, username: string): Promise <IRoom | undefined > {
    if (app.botUsername) {
        const usernames = [app.botUsername, username];
        let room;
        try {
            room = await read.getRoomReader().getDirectByUsernames(usernames);
        } catch (error) {
            app.getLogger().log(error);
            return;
        }

        if (room) {
            return room;
        } else if (app.botUser) {
            let roomId;

            // Create direct room between botUser and username
            const newRoom = modify.getCreator().startRoom()
                .setType(RoomType.DIRECT_MESSAGE)
                .setCreator(app.botUser)
                .setUsernames(usernames);
            roomId = await modify.getCreator().finish(newRoom);
            return await read.getRoomReader().getById(roomId);
        }
    }
    return;
}

/**
 * Sends a message using bot
 *
 * @param app
 * @param modify
 * @param room Where to send message to
 * @param message What to send
 * @param attachments (optional) Message attachments (such as action buttons)
 */
export async function sendMessage(app: ZohoApp, modify: IModify, room: IRoom, message: string, attachments?: Array<IMessageAttachment>): Promise<void> {
    const msg = modify.getCreator().startMessage()
        .setGroupable(false)
        .setSender(app.botUser)
        .setUsernameAlias(app.zohoName)
        .setEmojiAvatar(app.zohoEmojiAvatar)
        .setText(message)
        .setRoom(room);
    if (attachments && attachments.length > 0) {
        msg.setAttachments(attachments);
    }
    try {
        await modify.getCreator().finish(msg);
    } catch (error) {
        app.getLogger().log(error);
    }
}

/**
 * Notifies user using bot
 *
 * @param app
 * @param modify
 * @param user Who to notify
 * @param message What to send
 * @param attachments (optional) Message attachments (such as action buttons)
 */
export async function notifyUser(app: ZohoApp, modify: IModify, room: IRoom, user: IUser, message: string, attachments?: Array<IMessageAttachment>): Promise<void> {
    const msg = modify.getCreator().startMessage()
        .setSender(app.botUser)
        .setUsernameAlias(app.zohoName)
        .setEmojiAvatar(app.zohoEmojiAvatar)
        .setText(message)
        .setRoom(room)
        .getMessage();
    try {
        await modify.getNotifier().notifyUser(user, msg);
    } catch (error) {
        app.getLogger().log(error);
    }
}
