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
import { ZohoPeople } from './lib/ZohoPeople';

import { Birthday } from './actions/Birthday';
import { Anniversary } from './actions/Anniversary';
import { Whosout } from './actions/Whosout';
import { ZohoCommand } from './commands/ZohoCommand';
import { BirthdayEndpoint } from './endpoints/Birthday';
import { AnniversaryEndpoint } from './endpoints/Anniversary';
import { WhosOutEndpoint } from './endpoints/WhosOut';
import { AppSetting, settings } from './settings/settings';
import { PeopleCache } from './lib/PeopleCache';
import { IUser } from '@rocket.chat/apps-engine/definition/users';

export class ZohoApp extends App {

    /**
     * zoho app user
     */
    public zohoAppUser: IUser

    /**
     * The bot username alias
     */
    public zohoName: string = 'Zorro';

    /**
     * The bot avatar
     */
    public zohoEmojiAvatar: string = ':fox:';

    /**
     * The room name where to get members from
     */
    public zohoRoomId: string;

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

    /**
     * Zoho People API
     */
    public readonly zohoPeople: ZohoPeople;

    /**
     * Cache for Zoho People API results
     */
    public readonly peopleCache: PeopleCache;

    /**
     * Each department should have a default room
     */
    public readonly departmentRooms: Map<string, IRoom> = new Map<string, IRoom>();

    private applogger: ILogger;

    constructor(info: IAppInfo, logger: ILogger, accessors: IAppAccessors) {
        super(info, logger, accessors);
        this.zohoPeople = new ZohoPeople(this);
        this.peopleCache = new PeopleCache(this);
        this.whosout = new Whosout(this);
        this.birthday = new Birthday(this);
        this.anniversary = new Anniversary(this);
        this.applogger = logger;
    }

    /**
     * Loads the room where to get members from
     * Loads the room where to post messages to
     *
     * @param environmentRead
     * @param configModify
     */
    public async onEnable(environmentRead: IEnvironmentRead, configModify: IConfigurationModify): Promise<boolean> {
        this.zohoAppUser = await this.getAccessors().reader.getUserReader().getAppUser(this.getID()) as IUser;
        if (!this.zohoAppUser) {
            this.applogger.error('app user not detected')
            return false;
        }

        const zohoRoomId = await environmentRead.getSettings().getValueById(AppSetting.ZohoRoom);
        const departmentRoomsJson = await environmentRead.getSettings().getValueById(AppSetting.DepartmentRoomsJson);
        await this.verifyZohoDepartmentRooms(departmentRoomsJson);
        await this.peopleCache.load();
        return this.verifyZohoRoomSetting(zohoRoomId);
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
            case AppSetting.ZohoRoom:
                await this.verifyZohoRoomSetting(setting.value);
                break;
            case AppSetting.DepartmentRoomsJson:
                await this.verifyZohoDepartmentRooms(setting.value);
                break;
        }
    }

    protected async extendConfiguration(configuration: IConfigurationExtend): Promise<void> {
        await Promise.all(settings.map((setting) => configuration.settings.provideSetting(setting)));

        // API endpoints
        await configuration.api.provideApi({
            visibility: ApiVisibility.PUBLIC,
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

    private async verifyZohoRoomSetting(zohoRoomId?: IRoom['id']): Promise<boolean> {
        if (!zohoRoomId) {
            this.applogger.error(AppSetting.ZohoRoom, 'setting not found');
            return false;
        }

        this.zohoRoom = await this.getAccessors().reader.getRoomReader().getById(zohoRoomId) as IRoom;
        if (!this.zohoRoom) {
            this.applogger.error(`no room found with roomId: ${zohoRoomId}`);
            return false;
        }

        return true;
    }

    private async verifyZohoDepartmentRooms(departmentRoomsJson: string): Promise<boolean> {
        try {
            const departmentRoomsObject: Record<string, IRoom['id']> = JSON.parse(departmentRoomsJson);
            await Promise.all(Object.entries(departmentRoomsObject).map(async ([department, roomId]) => {
                const room = await this.getAccessors().reader.getRoomReader().getById(roomId);
                if (!room) {
                    return;
                }
                this.departmentRooms.set(department, room);
            }))
        } catch (err) {
            console.error(err);
            this.getLogger().warn('invalid value for setting', AppSetting.DepartmentRoomsJson);
            this.getLogger().warn('out notifications will only be sent to the main Zoho Room');
        }
        return true;
    }
}
