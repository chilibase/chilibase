import PrimeReact, {localeOption as primeLocaleOptionBase, localeOptions, updateLocaleOption} from "primereact/api";
// using json-loader module we import cb-en.json file into variable cbEnJsonObject
import cbEnJsonObject from "./cb-en.json";

// type for cb-locale
export interface LocaleOptions {
    // LazyDataTable
    searchInAllFields?: string;
    filter?: string;
    resetTable?: string;
    addRow?: string;
    editRow?: string;
    removeRow?: string;
    exportRows?: string;
    chooseRow?: string;
    totalRecords?: string;
    pleaseSelectRow?: string;
    removeRowConfirm?: string;
    removeRowFailed?: string;
    // XFormBase, XFormFooter
    save?: string;
    cancel?: string;
    optimisticLockFailed?: string;
    formRemoveRowConfirm?: string;
    xIsNotNull?: string;
    xIsNull?: string;
    xAutoComplete?: string;
    // XExportRowsDialog
    expRowCount?: string;
    expExportType?: string;
    expCreateHeaderLine?: string;
    expCsvSeparator?: string;
    expDecimalFormat?: string;
    expEncoding?: string;
    // XInputFileList
    fileUploadSizeToBig?: string;
    fileUploadFailed?: string;
    fileDownloadFailed?: string;
    // XFieldSet
    fieldSetSaveEditConfirm?: string;
    fieldSetCancelEditConfirm?: string;
    fieldSetRemoveFieldConfirm?: string;
    // statistics
    runStatisticMissingDateField?: string;
    upload?: string;
    yes?: string;
    no?: string;
    dateFrom?: string;
    dateTo?: string;
    year?: string;
    yearForAgeCalculation?: string;
}

// under this key are x-locale saved inside of PrimeReact locale
const cbOptionsKey: string = "cbOptions";

export function addLocale(locale: string, options: LocaleOptions) {
    updateLocaleOption(cbOptionsKey, options, locale);
}

// using this method are cb-locale read
export function localeOption(xOptionKey: string, options?: any[string]) {
    const _locale: string = PrimeReact.locale || 'en';

    try {
        let optionValue = (localeOptions(_locale) as any)[cbOptionsKey][xOptionKey];

        if (optionValue && options) {
            for (const key in options) {
                if (options.hasOwnProperty(key)) {
                    optionValue = optionValue.replace(`{${key}}`, options[key]);
                }
            }
        }

        return optionValue;
    } catch (error) {
        throw new Error(`The ${xOptionKey} option is not found in the current x-locale('${_locale}').`);
    }
}

// localeOption of primereact without locale param (helper)
export function primeLocaleOption(key: string) {
    const _locale: string = PrimeReact.locale || 'en';
    return primeLocaleOptionBase(key, _locale);
}

// add en locale into PrimeReact locale (global variable "locales" declared in file Locale.js)
addLocale('en', cbEnJsonObject.en);
