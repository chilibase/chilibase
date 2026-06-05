import {Utils} from "../utils/Utils.js";

export interface LocaleOptions {
    pessimisticLockFailedLockPresent?: string;
    pessimisticLockFailedLockFinished?: string;
}

export function localeOption(optionKey: string, options?: any[string]) {
    const localeOptions: LocaleOptions = Utils.getLocaleOptions();

    try {
        let optionValue = (localeOptions as any)[optionKey];

        if (optionValue && options) {
            for (const key in options) {
                if (options.hasOwnProperty(key)) {
                    optionValue = optionValue.replace(`{${key}}`, options[key]);
                }
            }
        }

        return optionValue;
    } catch (error) {
        throw new Error(`The ${optionKey} option is not found in the current locale.`);
    }
}
