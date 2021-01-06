import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { IUser } from '@rocket.chat/apps-engine/definition/users';

import { getDirect, sendMessage, random } from '../lib/helpers';
import { IAnniversary } from '../lib/IAnniversary';
import { ZohoApp } from '../ZohoApp';

export class Anniversary {

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
            const messages = [
                '@{username} {is_are} completing {years} {_years} in Rocket.Chat today, let\'s celebrate so many more may come!',
                'Today is @{username} {years} {_years} Rocket.Anniversary, let\'s celebrate together!',
                'Today marks @{username} {years}-year anniversary as a Rocketeer, congratulations!!'
            ];

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

            const users = {};
            for (const person of result.data) {
                if (person['Date of joining']) {
                    const [month, day, year] = person['Date of joining'].split('-');
                    const name = person.ownerName;
                    let username = person['Open'].split('/');
                    username = username[username.length - 1];
                    if (!username) {
                        username = person['Email ID'].split('@')[0];
                    }
                    const anniversary: IAnniversary = { name, username, day: parseInt(day, 10), month: parseInt(month, 10), years: new Date().getFullYear() - parseInt(year, 10) };
                    if (anniversary.month === new Date().getMonth() + 1 && anniversary.day === new Date().getDate()) {
                        if (!users[anniversary.years]) {
                            users[anniversary.years] = [];
                        }
                        users[anniversary.years].push(anniversary);
                    }
                }
            }

            if (Object.keys(users).length > 0) {
                for (const years of Object.keys(users).sort((a, b) => parseInt(b, 10) - parseInt(a, 10))) {
                    let usernames;
                    if (users[years].length === 1) {
                        usernames = users[years][0].username;
                    } else {
                        const last = users[years].pop() as IAnniversary;
                        usernames = users[years].map((anniversary) => anniversary.username).join(', @') + ` and @${last.username}`;
                    }

                    const message = messages[random(0, messages.length - 1)]
                        .replace('{username}', usernames)
                        .replace('{is_are}', users[years].length > 1 ? 'are' : 'is')
                        .replace('{years}', years)
                        .replace('{_years}', parseInt(years, 10) > 1 ? 'years' : 'years');

                    await sendMessage(this.app, modify, this.app.zohoRoom, message);
                }
            }
        }
    }
}
