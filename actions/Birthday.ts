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
        await this.app.peopleCache.load();

        const appUser = await read.getUserReader().getAppUser(this.app.getID());
        const birthdays: any = [];
        for (const employeeId of Object.keys(this.app.peopleCache.birthdays.today)) {
            birthdays.push()
            const employee = this.app.peopleCache.birthdays.today[employeeId];
            let username = employee['Open'].split('/');
            username = username[username.length - 1];
            if (!username) {
                username = employee['Email ID'].split('@')[0];
            }
            birthdays.push(username);
        }
        const numBirthdays = birthdays.length;
        let birthdayUsernames = '';
        if (numBirthdays > 0) {
            if (numBirthdays === 1) {
                birthdayUsernames = `@${birthdays[0]}`;
            } else {
                const last = birthdays.pop();
                birthdayUsernames = `@${birthdays.join(', @')} and @${last}`;
            }
            await sendMessage(this.app, read, modify, this.app.zohoRoom, `Let's wish a happy birthday to ${birthdayUsernames} :point_down:`);

            const id = uuid();
            const discussion = await modify.getCreator().startDiscussion()
                .setParentRoom(this.app.zohoRoom)
                .setReply(`Happy Birthday ${birthdayUsernames}`)
                .setDisplayName(`Happy Birthday - ${birthdayUsernames}`)
                .setSlugifiedName(id)
                .setCreator(appUser as IUser);
            await modify.getCreator().finish(discussion);
        }

        if ((user || new Date().getDate() === 1) && Object.keys(this.app.peopleCache.birthdays.month).length > 0) {
            const monthBirthdays: any = [];
            for (const employeeId of Object.keys(this.app.peopleCache.birthdays.month)) {
                const employee = this.app.peopleCache.birthdays.month[employeeId];
                const [month, day] = employee['Date_of_birth'].split('-');
                let username = employee['Open'].split('/');
                username = username[username.length - 1];
                if (!username) {
                    username = employee['Email ID'].split('@')[0];
                }
                monthBirthdays.push({ username, day });
            }

            if (monthBirthdays.length > 0) {
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
                fields.push({
                    title: `Birthdays this month:`,
                    value: '\n' + monthBirthdays.sort((a, b) => { const cmp = parseInt(a.day, 10) - parseInt(b.day, 10); return cmp < 0 ? -1 : (cmp > 0 ? 1 : 0) }).map((birthday) => `@${birthday.username} - ${birthday.day}`).join('\n'),
                    short: true,
                });
                messageBuilder.addAttachment({ fields });
                modify.getCreator().finish(messageBuilder);
            }
        }
    }
}
