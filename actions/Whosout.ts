import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { IMessageAttachmentField } from '@rocket.chat/apps-engine/definition/messages/IMessageAttachmentField';
import { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import { IUser } from '@rocket.chat/apps-engine/definition/users';

import { AppSetting } from '../settings';
import { formatDate, isDateBetween } from '../utils';
import { ZohoApp } from '../ZohoApp';

export class Whosout {

    constructor(private readonly app: ZohoApp) { }

    /**
     * Sends a message with the who is out information
     *
     * @param read
     * @param modify
     * @param persistence
     * @param user (optional) sends praise request to single user
     */
    // tslint:disable-next-line:max-line-length
    public async run(read: IRead, modify: IModify, http: IHttp, persistence: IPersistence, user?: IUser, params?: Array<string>) {
        const url = `https://people.zoho.com/people/api/forms/P_ApplyLeaveView/records?authtoken=${this.app.peopleToken}`;
        const result = await http.get(url);
        if (result && result.content && result.content.length > 0) {
            const messageBuilder = await modify.getCreator().startMessage()
                .setSender(this.app.botUser)
                .setRoom(this.app.whosoutRoom)
                .setUsernameAlias(this.app.zohoName)
                .setEmojiAvatar(this.app.zohoEmojiAvatar);

            const today = new Date();
            const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
            const fields: Array<IMessageAttachmentField> = [];

            const outToday: Array<string> = [];
            const outTomorrow: Array<string> = [];
            for (const leave of result.data) {
                const from = new Date(leave.From);
                const to = new Date(leave.To);
                if (isDateBetween(today, from, to)) {
                    outToday.push(leave.ownerName + (leave.ApprovalStatus === 'Pending' ? ' (pending)':  ''));
                }
                if (isDateBetween(tomorrow, from, to)) {
                    outTomorrow.push(leave.ownerName + (leave.ApprovalStatus === 'Pending' ? ' (pending)' : ''));
                }
            }

            if (outToday.length > 0) {
                fields.push({
                    title: `Out today (${formatDate(today)}):`,
                    value: outToday.join('\n'),
                    short: true,
                });
            }

            if (outTomorrow.length > 0) {
                fields.push({
                    title: `Out tomorrow (${formatDate(tomorrow)}):`,
                    value: outTomorrow.join('\n'),
                    short: true,
                });
            }

            if (fields.length === 0) {
                return;
            }

            messageBuilder.addAttachment({ fields });
            modify.getCreator().finish(messageBuilder);
        }
    }
}
