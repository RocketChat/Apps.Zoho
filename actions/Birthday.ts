import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { IMessageAttachmentField } from '@rocket.chat/apps-engine/definition/messages';
import { IUser } from '@rocket.chat/apps-engine/definition/users';

import { getDirect, sendMessage, uuid } from '../lib/helpers';
import { IBirthday } from '../lib/IBirthday';
import { ZohoApp } from '../ZohoApp';

export class Birthday {

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
        const appUser = await read.getUserReader().getAppUser(this.app.getID());
        const messageBuilder = await modify.getCreator().startMessage()
            .setSender(appUser as IUser)
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

        const fields: Array<IMessageAttachmentField> = [];
        const bdToday: Array<IBirthday> = [];
        const bdMonth: Array<IBirthday> = [];
        for (const employeeId of Object.keys(this.app.peopleCache.birthdays)) {
            const employee = this.app.peopleCache.birthdays[employeeId];
            if (employee['Date_of_birth']) {
                const [month, day] = employee['Date_of_birth'].split('-');
                const name = employee['Website_Display_Name'] || `${employee['FirstName']} ${employee['LastName']}`;
                let username = employee['Open'].split('/');
                username = username[username.length - 1];
                if (!username) {
                    username = employee['Email ID'].split('@')[0];
                }
                const birthday: IBirthday = { name, username, day: parseInt(day, 10), month: parseInt(month, 10) };
                if (birthday.month === new Date().getMonth() + 1) {
                    bdMonth.push(birthday);
                    if (birthday.day === new Date().getDate()) {
                        bdToday.push(birthday);
                    }
                }
            }
        }
        bdMonth.sort((a, b) => {
            return a.day - b.day;
        });

        if (user || (new Date().getDate() === 1 && bdMonth.length > 0)) {
            fields.push({
                title: `Birthdays this month:`,
                value: '\n' + bdMonth.map((birthday) => `${birthday.name}, ${birthday.day}`).join('\n'),
                short: true,
            });
            messageBuilder.addAttachment({ fields });
            modify.getCreator().finish(messageBuilder);
        }

        if (!user && bdToday.length > 0) {
            let bdPeople;
            if (bdToday.length === 1) {
                bdPeople = bdToday[0].username;
            } else {
                const last = bdToday.pop() as IBirthday;
                bdPeople = bdToday.map((birthday) => birthday.username).join(', @') + ` and @${last.username}`;
            }

            await sendMessage(this.app, read, modify, this.app.zohoRoom, `Let's wish a happy birthday to @${bdPeople} :point_down:`);

            const id = uuid();
            const discussion = await modify.getCreator().startDiscussion()
                .setParentRoom(this.app.zohoRoom)
                .setReply(`Happy Birthday @${bdPeople}`)
                .setDisplayName(`Happy Birthday - @${bdPeople}`)
                .setSlugifiedName(id)
                .setCreator(appUser as IUser);
            await modify.getCreator().finish(discussion);
        }
    }
}
