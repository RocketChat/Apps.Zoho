import { IModify, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { IRoom, RoomType } from '@rocket.chat/apps-engine/definition/rooms';

import { ZohoApp } from './ZohoApp';

export function formatDate(date: Date): string {
    return `${ date.getFullYear() }-${ (date.getMonth() < 9 ? '0' : '') + (date.getMonth() + 1) }-${ (date.getDate() < 10 ? '0' : '') + date.getDate() }`;
}

export function getMonthAndDay(date: Date): string {
    return `${ (date.getMonth() < 9 ? '0' : '') + (date.getMonth() + 1) }-${ (date.getDate() < 10 ? '0' : '') + date.getDate() }`;
}

export function isDateBetween(date: Date, from: Date, to: Date): boolean {
    return date.getTime() >= from.getTime() && date.getTime() <= to.getTime();
}

/**
 * Gets a direct message room between bot and another user, creating if it doesn't exist
 *
 * @param app KokoApp
 * @param read
 * @param modify
 * @param username the username to create a direct with bot
 * @returns the room or undefined if botUser or botUsername is not set
 */
export async function getDirect(app: ZohoApp, read: IRead, modify: IModify, username: string): Promise<IRoom | undefined> {
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
