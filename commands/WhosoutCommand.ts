import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import { ZohoApp } from '../ZohoApp';

// tslint:disable-next-line:max-line-length
export async function processWhosoutCommand(app: ZohoApp, context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persistence: IPersistence, params?: Array<string>): Promise<void> {
    const sender = context.getSender();
    await app.whosout.run(read, modify, http, persistence, sender, params);
}
