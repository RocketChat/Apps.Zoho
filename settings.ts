import { ISetting, SettingType } from '@rocket.chat/apps-engine/definition/settings';

export enum AppSetting {
    PeopleToken = 'people_token',
    ZohoRoom = 'zoho_room',
}

export const settings: Array<ISetting> = [
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
        id: AppSetting.ZohoRoom,
        type: SettingType.STRING,
        packageValue: '',
        required: true,
        public: true,
        i18nLabel: 'zoho_room',
        i18nDescription: 'zoho_room_description',
    },
];
