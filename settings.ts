import { ISetting, SettingType } from '@rocket.chat/apps-engine/definition/settings';

export enum AppSetting {
    BotUsername = 'bot_username',
    PeopleToken = 'people_token',
    WhosoutRoom = 'whosout_room',
}

export const settings: Array<ISetting> = [
    {
        id: 'bot_username',
        type: SettingType.STRING,
        packageValue: 'rocket.cat',
        required: true,
        public: false,
        i18nLabel: 'Zoho_Bot_Username',
        i18nDescription: 'Zoho_Bot_Username_Description',
    },
    {
        id: AppSetting.PeopleToken,
        type: SettingType.STRING,
        packageValue: '',
        required: true,
        public: true,
        i18nLabel: 'people_token',
        i18nDescription: 'people_token_description',
    },
    {
        id: AppSetting.WhosoutRoom,
        type: SettingType.STRING,
        packageValue: '',
        required: true,
        public: true,
        i18nLabel: 'whosout_room',
        i18nDescription: 'whosout_room_description',
    },
];
