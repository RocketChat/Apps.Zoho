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
        await this.app.peopleCache.load();

        const appUser = await read.getUserReader().getAppUser(this.app.getID());
        const people = {};
        for (const employee of this.app.peopleCache.employees) {
            people[`${ employee['FirstName'] } ${ employee['LastName']} ${ employee['EmployeeID'] }`] = employee;
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

        const departmentLeaves = {};
        for (const employeeId of Object.keys(this.app.peopleCache.leaves)) {
            const person = people[employeeId];
            for (const leave of this.app.peopleCache.leaves[employeeId]) {
                if (person && (leave.ApprovalStatus === 'Approved' || leave.ApprovalStatus === 'Pending')) {
                    const from = new Date(leave.From);
                    const to = new Date(leave.To);
                    const amount = leave['Daystaken'];
                    const department = person['Department'] || '-';
                    if (!departmentLeaves[department]) {
                        departmentLeaves[department] = { today: [], next: [], holidays: [], birthdays: [] };
                    }

                    let info = `, ${amount.replace('.0', '')} ${leave.Unit.toLowerCase()}${parseInt(amount) > 1 ? 's' : ''}${leave.Unit === 'Hour' ? '' : `, until ${new Date(leave.To).toString().substr(0, 10)}`}`;
                    if (leave.ApprovalStatus === 'Pending') {
                        info += ' _(pending)_';
                    }
                    const who = `${ person['Website_Display_Name'] || person['FirstName'] + ' ' + person['LastName'] }${info}`;

                    if (isDateBetween(today, from, to)) {
                        departmentLeaves[department].today.push(who);
                    } else if (isDateBetween(next, from, to)) {
                        departmentLeaves[department].next.push(who);
                    }
                }
            }
        }

        for (const employeeId of Object.keys(this.app.peopleCache.holidays)) {
            const employee = people[employeeId];
            for (const holiday of this.app.peopleCache.holidays[employeeId]) {
                const holidayName = holiday.Name.substring(holiday.Name.lastIndexOf(':') + 1);
                const department = employee['Department'] || '-';
                if (!departmentLeaves[department]) {
                    departmentLeaves[department] = { today: [], next: [], holidays: [], birthdays: [] };
                }
                departmentLeaves[department].holidays.push(`${ employee['Website_Display_Name'] || employee['FirstName'] + ' ' + employee['LastName'] }, ${holidayName}`)
            }
        }

        for (const employeeId of Object.keys(this.app.peopleCache.birthdays.today)) {
            const employee = people[employeeId];
            const department = employee['Department'] || '-';
            if (!departmentLeaves[department]) {
                departmentLeaves[department] = { today: [], next: [], holidays: [], birthdays: [] };
            }
            departmentLeaves[department].birthdays.push(`${ employee['Website_Display_Name'] || employee['FirstName'] + ' ' + employee['LastName'] }`)
        }

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

        messageBuilder.setText("*Out of Office*");

        const attachments: Array<IMessageAttachment> = [];
        for (const department of Object.keys(departmentLeaves).sort()) {
            const fields: Array<IMessageAttachmentField> = [];
            if (departmentLeaves[department].today.length > 0) {
                fields.push({ title: 'Out Today:\n', value: departmentLeaves[department].today.sort().join('\n') });
            }
            if (departmentLeaves[department].holidays.length > 0) {
                fields.push({ title: 'On a Holiday:\n', value: departmentLeaves[department].holidays.sort().join('\n') });
            }
            if (departmentLeaves[department].birthdays.length > 0) {
                fields.push({ title: 'Birthday:\n', value: departmentLeaves[department].birthdays.sort().join('\n') });
            }
            if (departmentLeaves[department].next.length > 0) {
                fields.push({ title: 'Out Next:\n', value: departmentLeaves[department].next.sort().join('\n') });
            }
            if (fields.length > 0) {
                attachments.push({
                    fields,
                    title: { value: `${department} (${(departmentLeaves[department].today.length) + (departmentLeaves[department].holidays.length) + (departmentLeaves[department].birthdays.length)} today)` },
                    collapsed: true,
                })
            }
        }

        for (const attachment of attachments) {
            messageBuilder.addAttachment(attachment);
        }

        modify.getCreator().finish(messageBuilder);
    }
}
