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
                const amount = leave['Days/Hours Taken'];
                let info = `, ${amount}, until ${leave.To}`;

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

        const holidaysToday: Array<string> = [];
        const holidaysNext: Array<string> = [];
        const holidaysWeekend: Array<string> = [];
        const holidaysNextWeekend: Array<string> = [];
        const countryList = this.app.holidayCountries.split(',');
        for (const country of countryList) {
            const urlHoliday = `https://date.nager.at/api/v2/publicholidays/${ today.getFullYear() }/${ country }`;
            const holidayResult = await http.get(urlHoliday);
            if (holidayResult && holidayResult.content && holidayResult.content.length > 0) {
                for (const holiday of holidayResult.data) {
                    const date = new Date(holiday.date + 'T00:00:00').toISOString();
                    const name = holiday.localName + (holiday.countryCode === 'US' ? '' : ` (${ holiday.name })`);
                    if (date === today.toISOString()) {
                        holidaysToday.push(`${ holiday.countryCode } - ${ name }`);
                    } else if (date === next.toISOString()) {
                        holidaysNext.push(`${holiday.countryCode} - ${name}`);
                    } else if (today.getDay() === 1) {
                        const saturday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2).toISOString();
                        const sunday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1).toISOString();
                        if (date === saturday) {
                            holidaysWeekend.push(`Saturday, ${holiday.countryCode} - ${name}`);
                        } else if (date === sunday) {
                            holidaysWeekend.push(`Sunday, ${holiday.countryCode} - ${name}`);
                        }
                    } else if (today.getDay() === 5) {
                        const saturday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
                        const sunday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2).toISOString();
                        if (date === saturday) {
                            holidaysNextWeekend.push(`Saturday, ${holiday.countryCode} - ${name}`);
                        } else if (date === sunday) {
                            holidaysNextWeekend.push(`Sunday, ${holiday.countryCode} - ${name}`);
                        }
                    }
                }
            }
        }

        if (holidaysToday.length > 0) {
            fields.push({
                title: `Holidays today:`,
                value: holidaysToday.join('\n'),
                short: true,
            });
        }

        if (holidaysWeekend.length > 0) {
            fields.push({
                title: `Holidays past weekend:`,
                value: holidaysWeekend.join('\n'),
                short: true,
            });
        }

        if (holidaysNext.length > 0) {
            fields.push({
                title: `Holidays ${ monday ? 'on Monday' : 'tomorrow' }:`,
                value: holidaysNext.join('\n'),
                short: true,
            });
        }

        if (holidaysNextWeekend.length > 0) {
            fields.push({
                title: `Holidays in the weekend:`,
                value: holidaysNextWeekend.join('\n'),
                short: true,
            });
        }

        if (fields.length === 0) {
            return;
        }

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
        messageBuilder.addAttachment({ fields });
        modify.getCreator().finish(messageBuilder);
    }
}
