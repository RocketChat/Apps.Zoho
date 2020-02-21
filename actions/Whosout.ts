import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { IMessageAttachmentField } from '@rocket.chat/apps-engine/definition/messages/IMessageAttachmentField';
import { IUser } from '@rocket.chat/apps-engine/definition/users';

import { getDirect, isDateBetween } from '../utils';
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
                .setUsernameAlias(this.app.zohoName)
                .setEmojiAvatar(this.app.zohoEmojiAvatar);

            if (user) {
                const room = await getDirect(this.app, read, modify, user.username);
                if (!room) {
                    return;
                }
                messageBuilder.setRoom(room);
            } else {
                messageBuilder.setRoom(this.app.zohoRoom);
            }

            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            let next;
            let monday = false;
            if (today.getDay() === 5) { // If Friday, next is Monday
                monday = true;
                next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3);
            } else {
                next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            }

            const fields: Array<IMessageAttachmentField> = [];
            const outToday: Array<string> = [];
            const outNext: Array<string> = [];
            for (const leave of result.data) {
                if (leave.ApprovalStatus === 'Approved' || leave.ApprovalStatus === 'Pending') {
                    const from = new Date(leave.From);
                    const to = new Date(leave.To);
                    const amount = parseInt(leave['Days Taken'], 10);
                    let info = '';
                    if (leave['Leave Type'] === 'Half Day' || leave['Leave Type'] === 'Doctor&#39;s Appointment') {
                        info += `, ${amount} hours`;
                    } else if (leave['Days Taken'] > 1) {
                        info += `, ${amount} days, until ${leave.To}`;
                    }

                    if (leave.ApprovalStatus === 'Pending') {
                        info += ' _(pending)_';
                    }

                    const who = `*${leave.ownerName}*${info}`;
                    if (isDateBetween(today, from, to)) {
                        outToday.push(who);
                    } else if (isDateBetween(next, from, to)) {
                        outNext.push(who);
                    }
                }
            }

            if (outToday.length > 0) {
                fields.push({
                    title: `Out today:`,
                    value: outToday.join('\n'),
                    short: true,
                });
            }

            if (outNext.length > 0) {
                fields.push({
                    title: `Out ${monday ? 'on Monday' : 'tomorrow'}:`,
                    value: outNext.join('\n'),
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
