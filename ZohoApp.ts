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

    constructor(info: IAppInfo, logger: ILogger, accessors: IAppAccessors) {
        super(info, logger, accessors);
        this.zohoPeople = new ZohoPeople(this);
        this.peopleCache = new PeopleCache(this);
        this.whosout = new Whosout(this);
        this.birthday = new Birthday(this);
        this.anniversary = new Anniversary(this);
    }

    /**
     * Loads the room where to get members from
     * Loads the room where to post messages to
     *
     * @param environmentRead
     * @param configModify
     */
    public async onEnable(environmentRead: IEnvironmentRead, configModify: IConfigurationModify): Promise<boolean> {
        this.zohoRoomId = await environmentRead.getSettings().getValueById(AppSetting.ZohoRoom);
        try {
            const departmentRoomsObject: Record<string, IRoom['id']> = JSON.parse(await environmentRead.getSettings().getValueById(AppSetting.DepartmentRoomsJson));
            Object.entries(departmentRoomsObject).forEach(async ([department, roomId]) => {
                const room = await this.getAccessors().reader.getRoomReader().getById(roomId);
                if (!room) {
                    return;
                }
                const members = await this.getAccessors().reader.getRoomReader().getMembers(roomId);
                if (!members.find((member) => member.id === this.getID())) {
                    this.getLogger().debug(`app is not a member of ${room.slugifiedName}, skipping ${department} notifications`);
                    return;
                }
                this.departmentRooms.set(department, room);
            })
        } catch (err) {
            this.getLogger().warn('invalid value for setting', AppSetting.DepartmentRoomsJson);
            this.getLogger().warn('out notifications will only be sent to the main Zoho Room');
        }
        if (this.zohoRoomId) {
            this.zohoRoom = await this.getAccessors().reader.getRoomReader().getById(this.zohoRoomId) as IRoom;
        } else {
            return false;
        }
        await this.peopleCache.load();
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
            case AppSetting.ZohoRoom:
                this.zohoRoomId = setting.value;
                if (this.zohoRoomId) {
                    this.zohoRoom = await this.getAccessors().reader.getRoomReader().getByName(this.zohoRoomId) as IRoom;
                }
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
}
