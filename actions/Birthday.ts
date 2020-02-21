import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { IMessageAttachmentField } from '@rocket.chat/apps-engine/definition/messages/IMessageAttachmentField';
import { RoomType } from '@rocket.chat/apps-engine/definition/rooms';
import { IUser } from '@rocket.chat/apps-engine/definition/users';

import { IBirthday } from '../lib/IBirthday';
import { getDirect } from '../utils';
import { ZohoApp } from '../ZohoApp';
import { sendMessage, uuid } from '../lib/helpers';

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
        const url = `https://people.zoho.com/people/api/forms/P_EmployeeView/records?authtoken=${this.app.peopleToken}`;
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

            const fields: Array<IMessageAttachmentField> = [];
            const bdToday: Array<IBirthday> = [];
            const bdMonth: Array<IBirthday> = [];
            for (const person of result.data) {
                if (person['Birth Date']) {
                    let [month, day] = person['Birth Date'].split('-');
                    const name = person.ownerName;
                    const username = person['Email ID'].split('@')[0];
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

            if (new Date().getDate() === 1 && bdMonth.length > 0) {
                fields.push({
                    title: `Birthdays this month:`,
                    value: '\n' + bdMonth.map((birthday) => `${birthday.name}, ${birthday.day}`).join('\n'),
                    short: true,
                });
                messageBuilder.addAttachment({ fields });
                modify.getCreator().finish(messageBuilder);
            }

            if (bdToday.length > 0) {
                let bdPeople;
                if (bdToday.length === 1) {
                    bdPeople = bdToday[0].username;
                } else {
                    const last = bdToday.pop() as IBirthday;
                    bdPeople = bdToday.map((birthday) => birthday.username).join(', @') + ` and @${last.username}`;
                }
                const msg = `Happy Birthday @${bdPeople}`;
                const newRoom = modify.getCreator().startRoom()
                    .setDisplayName(msg)
                    .setSlugifiedName(uuid())
                    .setType(RoomType.PRIVATE_GROUP)
                    .setParentRoom(this.app.zohoRoom)
                    .setCreator(this.app.botUser);
                const rid = await modify.getCreator().finish(newRoom);
                sendMessage(this.app, modify, this.app.zohoRoom, msg, undefined, await read.getRoomReader().getById(rid));
            }
        }
    }
}
