import {
    IAppAccessors,
    IConfigurationExtend,
    IConfigurationModify,
    IEnvironmentRead,
    IHttp,
    ILogger,
    IRead,
} from '@rocket.chat/apps-engine/definition/accessors';
import { ApiSecurity, ApiVisibility } from '@rocket.chat/apps-engine/definition/api';
import { App } from '@rocket.chat/apps-engine/definition/App';
import { IAppInfo } from '@rocket.chat/apps-engine/definition/metadata';
import { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import { ISetting } from '@rocket.chat/apps-engine/definition/settings';
import { IUser } from '@rocket.chat/apps-engine/definition/users';

import { Birthday } from './actions/Birthday';
import { Anniversary } from './actions/Anniversary';
import { Whosout } from './actions/Whosout';
import { ZohoCommand } from './commands/ZohoCommand';
import { BirthdayEndpoint } from './endpoints/Birthday';
import { AnniversaryEndpoint } from './endpoints/Anniversary';
import { WhosOutEndpoint } from './endpoints/WhosOut';
import { AppSetting, settings } from './settings';

export class ZohoApp extends App {

    /**
     * The bot username alias
     */
    public zohoName: string = 'Zorro';

    /**
     * The bot avatar
     */
    public zohoEmojiAvatar: string = ':fox:';

    /**
     * The bot username who sends the messages
     */
    public botUsername: string;

    /**
     * The bot user sending messages
     */
    public botUser: IUser;

    /**
     * The zoho people token, from settings
     */
    public peopleToken: string;

    /**
     * The list of countries to fetch holidays from, from settings
     */
    public holidayCountries: string;

    /**
     * The room name where to get members from
     */
    public zohoRoomName: string;

    /**
     * The actual room object where to get members from
     */
    public zohoRoom: IRoom;

    /**
     * The whosout mechanism
     */
    public readonly whosout: Whosout;

    /**
     * The birthday mechanism
     */
    public readonly birthday: Birthday;

    /**
     * The anniversary mechanism
     */
    public readonly anniversary: Anniversary;

    constructor(info: IAppInfo, logger: ILogger, accessors: IAppAccessors) {
        super(info, logger, accessors);
        this.whosout = new Whosout(this);
        this.birthday = new Birthday(this);
        this.anniversary = new Anniversary(this);
    }

    /**
     * Loads the room where to get members from
     * Loads the room where to post messages to
     * Loads the user who'll be posting messages as the botUser
     *
     * @param environmentRead
     * @param configModify
     */
    public async onEnable(environmentRead: IEnvironmentRead, configModify: IConfigurationModify): Promise<boolean> {
        this.botUsername = await environmentRead.getSettings().getValueById(AppSetting.BotUsername);
        if (this.botUsername) {
            this.botUser = await this.getAccessors().reader.getUserReader().getByUsername(this.botUsername) as IUser;
        } else {
            return false;
        }

        this.peopleToken = await environmentRead.getSettings().getValueById(AppSetting.PeopleToken);

        this.zohoRoomName = await environmentRead.getSettings().getValueById(AppSetting.ZohoRoom);
        if (this.zohoRoomName) {
            this.zohoRoom = await this.getAccessors().reader.getRoomReader().getByName(this.zohoRoomName) as IRoom;
        } else {
            return false;
        }

        this.holidayCountries = await environmentRead.getSettings().getValueById(AppSetting.HolidayCountries);

        return true;
    }

    /**
     * Updates room ids for members and messages when settings are updated
     *
     * @param setting
     * @param configModify
     * @param read
     * @param http
     */
    public async onSettingUpdated(setting: ISetting, configModify: IConfigurationModify, read: IRead, http: IHttp): Promise<void> {
        switch (setting.id) {
            case AppSetting.BotUsername:
                this.botUsername = setting.value;
                if (this.botUsername) {
                    this.botUser = await this.getAccessors().reader.getUserReader().getByUsername(this.botUsername) as IUser;
                }
                break;
            case AppSetting.PeopleToken:
                this.peopleToken = setting.value;
                break;
            case AppSetting.ZohoRoom:
                this.zohoRoomName = setting.value;
                if (this.zohoRoomName) {
                    this.zohoRoom = await this.getAccessors().reader.getRoomReader().getByName(this.zohoRoomName) as IRoom;
                }
                break;
        }
    }

    protected async extendConfiguration(configuration: IConfigurationExtend): Promise<void> {
        await Promise.all(settings.map((setting) => configuration.settings.provideSetting(setting)));

        // API endpoints
        await configuration.api.provideApi({
            visibility: ApiVisibility.PRIVATE,
            security: ApiSecurity.UNSECURE,
            endpoints: [
                new WhosOutEndpoint(this),
                new BirthdayEndpoint(this),
                new AnniversaryEndpoint(this),
            ],
        });

        // Slash Commands
        await configuration.slashCommands.provideSlashCommand(new ZohoCommand(this));
    }
}
