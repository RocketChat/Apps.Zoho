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
        const room = await read.getRoomReader().getDirectByUsernames(usernames);

        if (room) {
            return room;
        } else if (app.botUser) {
            // Create direct room between botUser and username
            const newRoom = modify.getCreator().startRoom()
                .setType(RoomType.DIRECT_MESSAGE)
                .setCreator(app.botUser)
                .setUsernames(usernames);
            const roomId = await modify.getCreator().finish(newRoom);
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
export async function sendMessage(app: ZohoApp, modify: IModify, room: IRoom, message: string, attachments?: Array<IMessageAttachment>, discussionRoom?: IRoom): Promise<void> {
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
    await modify.getCreator().finish(msg);
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

    await modify.getNotifier().notifyUser(user, msg);
}

export function monthName(month) {
    switch (month) {
        case '01':
            return 'January';
        case '02':
            return 'February';
        case '03':
            return 'March';
        case '04':
            return 'April';
        case '05':
            return 'May';
        case '06':
            return 'June';
        case '07':
            return 'July';
        case '08':
            return 'August';
        case '09':
            return 'September';
        case '10':
            return 'October';
        case '11':
            return 'November';
        case '12':
            return 'December';
        default:
            return '';
    }
}

export function uuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Copied from underscore
 *
 * @param min
 * @param max
 */
export function random(min: number, max: number): number {
    if (max == null) {
        max = min;
        min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
}
