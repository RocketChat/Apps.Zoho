import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { IMessageAttachment } from '@rocket.chat/apps-engine/definition/messages';
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
        const urlPeople = `https://people.zoho.com/people/api/forms/P_EmployeeView/records?authtoken=${this.app.peopleToken}`;
        const peopleResult = await http.get(urlPeople);
        const people = {};
        for (const person of peopleResult.data) {
            people[`${ person['First Name'] } ${ person['Last Name']} ${ person['EmployeeID'] }`] = person;
        }
        console.log(Object.keys(people));
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
        const attachments: Array<IMessageAttachment> = [];
        let fields: Array<IMessageAttachmentField> = [];
        const outToday: Array<string> = [];
        const outNext: Array<string> = [];

        const url = `https://people.zoho.com/people/api/forms/P_ApplyLeaveView/records?authtoken=${this.app.peopleToken}`;
        const result = await http.get(url);
        for (const leave of result.data) {
            const person = people[leave['Employee ID']];
            console.log(person);

            if (leave.ApprovalStatus === 'Approved' || leave.ApprovalStatus === 'Pending') {
                const from = new Date(leave.From);
                const to = new Date(leave.To);
                const amount = leave['Days/Hours Taken'];
                let info = `, ${ (person && person['Department']) || '-' }, ${amount.replace('.0', '')} ${leave.Unit.toLowerCase()}${parseInt(amount) > 1 ? 's' : ''}${leave.Unit === 'Hour' ? '' : `, until ${leave.To}`}`;

                if (leave.ApprovalStatus === 'Pending') {
                    info += ' _(pending)_';
                }

                const who = `*${ (person && person['Website Display Name']) || leave.ownerName }*${info}`;
                if (isDateBetween(today, from, to)) {
                    outToday.push(who);
                } else if (isDateBetween(next, from, to)) {
                    outNext.push(who);
                }
            }
        }

        const locations = {};
        for (const employeeId of Object.keys(people)) {
            const person = people[employeeId];
            if (person['Location Name']) {
                const username = `*${ person['Website Display Name'] || person.ownerName }*, ${ person['Department'] || '-' }`;
                if (locations[person['Location Name']]) {
                    locations[person['Location Name']].people.push(username);
                } else {
                    locations[person['Location Name']] = { people: [ username ], holidayToday: [], holidayNext: [], holidayWeekend: [], holidayNextWeekend: [] };
                    const urlHoliday = `https://people.zoho.com/people/api/leave/getHolidays?authtoken=${this.app.peopleToken}&userId=${person.recordId}`;
                    const resultHoliday = await http.get(urlHoliday);
                    if (resultHoliday && resultHoliday.data && resultHoliday.data.response && resultHoliday.data.response.result) {
                        for (const holiday of resultHoliday.data.response.result) {
                            const date = new Date(holiday.fromDate + 'T00:00:00').toISOString();
                            const name = holiday.Name.substring(holiday.Name.lastIndexOf(':') + 1);
                            if (date === today.toISOString()) {
                                locations[person['Location Name']].holidayToday.push(name);
                            } else if (date === next.toISOString()) {
                                locations[person['Location Name']].holidayNext.push(name);
                            } else if (today.getDay() === 1) {
                                const saturday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2).toISOString();
                                const sunday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1).toISOString();
                                if (date === saturday) {
                                    locations[person['Location Name']].holidayWeekend.push(`Saturday, ${ name }`);
                                } else if (date === sunday) {
                                    locations[person['Location Name']].holidayWeekend.push(`Sunday, ${name}`);
                                }
                            } else if (today.getDay() === 5) {
                                const saturday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
                                const sunday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2).toISOString();
                                if (date === saturday) {
                                    locations[person['Location Name']].holidayNextWeekend.push(`Saturday, ${name}`);
                                } else if (date === sunday) {
                                    locations[person['Location Name']].holidayNextWeekend.push(`Sunday, ${name}`);
                                }
                            }
                        }
                    }
                }
            }
        }

        if (Object.keys(locations).length > 0) {
            for (const location of Object.keys(locations)) {
                if (locations[location].holidayToday.length > 0) {
                    // fields.push({
                    //     title: `Holiday today in ${location}:`,
                    //     value: `${locations[location].holidayToday.join('\n')}\n\n*People in ${location}:*\n${locations[location].people.join('\n')}`,
                    //     short: true,
                    // });
                    for (const person of locations[location].people) {
                        outToday.push(`${person}, Holiday, ${ location }`);
                    }
                }

                if (locations[location].holidayNext.length > 0) {
                    // fields.push({
                    //     title: `Holiday ${ monday ? 'on Monday': 'tomorrow' } in ${location}:`,
                    //     value: `${locations[location].holidayNext.join('\n')}\n\n*People in ${location}:*\n${locations[location].people.join('\n')}`,
                    //     short: true,
                    // });
                    for (const person of locations[location].people) {
                        outNext.push(`${person}, Holiday, ${ location }`);
                    }
                }

                // if (fields.length > 0) {
                //     attachments.push({ fields, color: 'orange' });
                //     fields = [];
                // }

                // if (locations[location].holidayWeekend.length > 0) {
                //     fields.push({
                //         title: `Holiday past weekend in ${location}:`,
                //         value: `${locations[location].holidayWeekend.join('\n')}\n\n*People in ${location}:*\n${locations[location].people.join('\n')}`,
                //         short: true,
                //     });
                // }

                // if (locations[location].holidayNextWeekend.length > 0) {
                //     fields.push({
                //         title: `Holiday next weekend in ${location}:`,
                //         value: `${locations[location].holidayNextWeekend.join('\n')}\n\n*People in ${location}:*\n${locations[location].people.join('\n')}`,
                //         short: true,
                //     });
                // }


                // if (fields.length > 0) {
                //     attachments.push({ fields, color: 'orange' });
                //     fields = [];
                // }
            }
        }

        if (outToday.length > 0) {
            fields.push({
                title: `Out today:`,
                value: outToday.join('\n'),
            });
        }

        if (outNext.length > 0) {
            fields.push({
                title: `Out ${monday ? 'on Monday' : 'tomorrow'}:`,
                value: outNext.join('\n'),
            });
        }

        if (fields.length > 0) {
            attachments.push({ fields, color: 'red' });
            fields = [];
        }

        if (attachments.length === 0) {
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

        for (const attachment of attachments) {
            messageBuilder.addAttachment(attachment);
        }
        modify.getCreator().finish(messageBuilder);
    }
}
