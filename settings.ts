import { ISetting, SettingType } from '@rocket.chat/apps-engine/definition/settings';

export enum AppSetting {
    PeopleClientId = 'people_client_id',
    PeopleSecret = 'people_secret',
    PeopleRefreshToken = 'people_refresh_token',
    ZohoRoom = 'zoho_room',
}

export const settings: Array<ISetting> = [
    {
        id: AppSetting.PeopleClientId,
        type: SettingType.STRING,
        packageValue: '',
        required: true,
        public: true,
        i18nLabel: 'people_client_id',
        i18nDescription: 'people_client_id_description',
    },
    {
        id: AppSetting.PeopleSecret,
        type: SettingType.STRING,
        packageValue: '',
        required: true,
        public: true,
        i18nLabel: 'people_secret',
        i18nDescription: 'people_secret_description',
    },
    {
        id: AppSetting.PeopleRefreshToken,
        type: SettingType.STRING,
        packageValue: '',
        required: true,
        public: true,
        i18nLabel: 'people_refresh_token',
        i18nDescription: 'people_refresh_token_description',
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
