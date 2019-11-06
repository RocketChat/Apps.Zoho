import { IModify, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import { SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import { getDirect, sendMessage } from '../lib/helpers';
import { ZohoApp } from '../ZohoApp';

export async function processHelpCommand(app: ZohoApp, context: SlashCommandContext, read: IRead, modify: IModify): Promise<void> {
    const sender = context.getSender();
    const room = await getDirect(app, read, modify, sender.username) as IRoom;
    const message = `These are the commands I can understand:
        \`/zoho whosout\` Shows people out today, tomorrow and holidays
        \`/zoho help\` Shows this message`;

    await sendMessage(app, modify, room, message);
}
