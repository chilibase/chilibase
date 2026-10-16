import {UtilsCommon} from "./UtilsCommon.js";
import type {Assoc, Entity, Field} from "./EntityMetadata.js";
import {UtilsMetadataCommon} from "./UtilsMetadataCommon.js";
import type {IPostgresInterval} from "postgres-interval";

export function stringFromUI(stringValue: string): string | null {
    let value: string | null;
    if (stringValue === '') {
        value = null;
    }
    else {
        value = stringValue;
    }
    return value;
}

export function stringAsUI(value: string | null): string {
    return value !== null ? value : "";
}

// to avoid the sql injection problem - where it is problematic to use classic params
export function stringAsDB(value: string | null): string {
    return value !== null ? `'${value.replaceAll("'", "''")}'` : "NULL";
}

export function intFromUI(stringValue: string): number | null | undefined {
    // convert stringValue (e.g. 1234) into integer number
    // if stringValue is invalid, returns undefined
    let value: number | null | undefined = undefined;
    if (stringValue === '') {
        value = null;
    }
    else {
        if (UtilsCommon.isInt(stringValue)) {
            // 1234xxx returns number 1234, therefore we made the isInt test
            value = parseInt(stringValue, 10);
            if (isNaN(value)) {
                value = undefined;
            }
        }
    }
    return value;
}

export function numberAsUI(value: number | null, fractionDigits?: number): string {
    if (fractionDigits === undefined) {
        fractionDigits = 2; // default
    }
    if (value !== null) {
        return value.toLocaleString('de-DE', {style: 'decimal', minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits});
    }
    else {
        return "";
    }
}

// in the model on the client there should always be a number, now there is sometimes a string (from json from the server) and sometimes a number (from the component)
// provisionally for now this kind of conversion
export function numberFromModel(value: any): number | null {
    let numberValue: number | null = null;
    if (typeof value === 'string') {
        numberValue = parseFloat(value);
    }
    else if (typeof value === 'number') {
        numberValue = value;
    }
    return numberValue;
}

// converts a value e.g. 12.34
export function numberFromString(valueString: string): number | null {
    let numberValue: number | null = parseFloat(valueString);
    if (isNaN(numberValue)) {
        numberValue = null;
    }
    return numberValue;
}

// date type refinement - we use the number type, because we misuse the scale attribute in TypeORM to specify the refinement
export enum DateScale {
    Date = 1, // dd.mm.yyyy (default)
    Month = 2, // mm.yyyy
    Year = 3 // yyyy
}
//export type XDateType = "month" | "year" | "date";

// in the model on the client there should always be a Date, now there is sometimes a string (from json from the server) and sometimes a Date (from the component)
// provisionally for now this kind of conversion
export function dateFromModel(value: any): Date | null {
    let dateValue: Date | null = null;
    if (typeof value === 'string') {
        dateValue = new Date(value);
    }
    else if (typeof value === 'object' && value instanceof Date) {
        dateValue = value;
    }
    return dateValue;
}

export function dateFromUI(valueString: string, dateScale: DateScale = DateScale.Date): Date | null | undefined {
    // converts valueString (e.g. 21.2.2024) into Date
    // if valueString is invalid, returns undefined
    let valueDate: Date | null | undefined = undefined;
    if (valueString === '') {
        valueDate = null;
    }
    else {
        // null means not entered (it is filled in according to the current date), undefined means an incorrect value was entered
        let day: number | null | undefined;
        let month: number | null | undefined = null;
        let year: number | null | undefined = null;

        if (dateScale === DateScale.Date) {
            // format "dd.mm.yyyy"
            const posDot = valueString.indexOf('.');
            if (posDot === -1) {
                day = intFromUI(valueString);
            }
            else {
                day = intFromUI(valueString.substring(0, posDot));
                const rest: string = valueString.substring(posDot + 1);
                const posDot2 = rest.indexOf('.');
                if (posDot2 === -1) {
                    month = intFromUI(rest);
                }
                else {
                    month = intFromUI(rest.substring(0, posDot2));
                    year = intFromUI(rest.substring(posDot2 + 1));
                }
            }
        }
        else if (dateScale === DateScale.Month) {
            // format "mm.yyyy"
            day = 1;
            const posDot = valueString.indexOf('.');
            if (posDot === -1) {
                month = intFromUI(valueString);
            }
            else {
                month = intFromUI(valueString.substring(0, posDot));
                year = intFromUI(valueString.substring(posDot + 1));
            }
        }
        else if (dateScale === DateScale.Year) {
            // format "yyyy"
            day = 1;
            month = 1;
            year = intFromUI(valueString);
        }
        else {
            throw "Unimplemented dateScale = " + dateScale;
        }

        // we fill in the month and year if the user did not enter them (if we have undefined, we deliberately do not fill them in)
        if (month === null) {
            month = UtilsCommon.today().getMonth() + 1; // 1 month more (January is 0)
        }
        if (year === null) {
            year = UtilsCommon.today().getFullYear();
        }

        // if day or month or year remained undefined, then the user entered an incorrect value - we return undefined
        if (day && month && year) {
            let monthStr: string = month.toString();
            if (monthStr.length < 2) {
                monthStr = "0" + monthStr;
            }
            let dayStr: string = day.toString();
            if (dayStr.length < 2) {
                dayStr = "0" + dayStr;
            }
            valueDate = new Date(`${year}-${monthStr}-${dayStr}`);
            if (isNaN(valueDate as any)) {
                // if the date is incorrect (e.g. 2024-13-01)
                valueDate = undefined;
            }
        }
    }
    return valueDate;
}


export function dateAsUI(value: Date | null, dateScale: DateScale = DateScale.Date): string {
    if (value !== null) {
        return dateFormat(value, dateFormatUI(dateScale));
    }
    else {
        return "";
    }
}

// special function - converts Date to string YYYY-MM-DD
export function dateAsYYYY_MM_DD(date: Date): string {
    return dateFormat(date, 'yyyy-MM-dd');
}

export function dateAsDB(date: Date | null): string {
    return date !== null ? `'${dateAsYYYY_MM_DD(date)}'::DATE` : "NULL::DATE";
}

// the same like function format(this, 'yyyy-MM-dd');
export function dateFormat(date: Date, format: string): string {
    const pad = (num: number): string => num.toString().padStart(2, '0');

    const year: number = date.getFullYear();
    const month: string = pad(date.getMonth() + 1); // Months are zero-based
    const day: string = pad(date.getDate());

    let value: string = format;
    value = value.replace('yyyy', `${year}`);
    value = value.replace('MM', month);
    value = value.replace('dd', day);

    return value;
}

export function datetimeAsUI(value: Date | null): string {
    if (value !== null) {
        return datetimeFormat(value, datetimeFormatUI());
    }
    else {
        return "";
    }
}

// the same like function format(this, 'yyyy-MM-dd HH:mm:ss');
export function datetimeFormat(date: Date, format: string): string {
    const pad = (num: number): string => num.toString().padStart(2, '0');

    const year: number = date.getFullYear();
    const month: string = pad(date.getMonth() + 1); // Months are zero-based
    const day: string = pad(date.getDate());

    const hours: string = pad(date.getHours());
    const minutes: string = pad(date.getMinutes());
    const seconds: string = pad(date.getSeconds());

    let value: string = format;
    value = value.replace('yyyy', `${year}`);
    value = value.replace('MM', month);
    value = value.replace('dd', day);

    value = value.replace('HH', hours);
    value = value.replace('mm', minutes);
    value = value.replace('ss', seconds);

    return value;
}

// provisionally for now this kind of conversion
export function timeFromModel(value: any): Date | null {
    let timeValue: Date | null = null;
    if (typeof value === 'string') {
        // if the time comes directly from the database, '19:30:00' arrives
        // if a reloaded object arrives (e.g. via the webservice saveRow), '2021-06-07 19:30:00' arrives
        let rowDataCasStr = value;
        if (rowDataCasStr.length < 10) {
            // we have '19:30:00' -> we add any year so that we convert it to a valid Date
            rowDataCasStr = '1970-01-01 ' + rowDataCasStr;
        }
        // on safari the conversion new Date('2021-06-07 19:30:00') does not work - it returns NaN
        // therefore we change the string to '2021-06-07T19:30:00+01:00'
        // 19:30:00 is a time from the Central Europe timezone (that one is set on nodejs)), therefore we mark this time with this timezone
        // (the correct solution is to always send time via json in the format '2021-06-07T18:30:00Z', datetime attributes also come in this format)
        rowDataCasStr = rowDataCasStr.replace(' ', 'T');
        if (!rowDataCasStr.endsWith('Z') && rowDataCasStr.indexOf('+') === -1) {
            rowDataCasStr += '+01:00'; // Central Europe timezone
        }
        timeValue = new Date(rowDataCasStr);
    }
    else if (typeof value === 'object' && value instanceof Date) {
        timeValue = value;
    }
    return timeValue;
}

export function dateFormatUI(dateScale: DateScale = DateScale.Date): string {
    let format: string;
    if (dateScale === DateScale.Date) {
        format = "dd.MM.yyyy";
    }
    else if (dateScale === DateScale.Month) {
        format = "MM.yyyy";
    }
    else if (dateScale === DateScale.Year) {
        format = "yyyy";
    }
    else {
        throw "Unimplemented dateScale = " + dateScale;
    }
    return format;
}

export function dateFormatCalendar(dateScale: DateScale = DateScale.Date): string {
    let format: string;
    if (dateScale === DateScale.Date) {
        format = "dd.mm.yy";
    }
    else if (dateScale === DateScale.Month) {
        format = "mm.yy";
    }
    else if (dateScale === DateScale.Year) {
        format = "yy";
    }
    else {
        throw "Unimplemented dateScale = " + dateScale;
    }
    return format;
}

export function datetimeFormatUI(): string {
    return "dd.MM.yyyy HH:mm:ss";
}

export function intervalFromUI(valueString: string): IPostgresInterval | null | undefined {
    // convert e.target.value (e.g. 10:29) into IPostgresInterval (e.g. {hours: 10, minutes: 29})
    // if stringValue is invalid, returns undefined
    let valueInterval: IPostgresInterval | null | undefined = undefined;
    if (valueString === '') {
        valueInterval = null;
    }
    else {
        const posColon = valueString.indexOf(':');
        if (posColon === -1) {
            // for depaul project, we use hours as default value - TODO - some param/env value to have both types of init value
            // let minutes: number = parseInt(valueString);
            // if (!isNaN(minutes)) {
            //     const hours = Math.floor(minutes / 60);
            //     minutes = minutes - (hours * 60);
            //     valueInterval = {hours: hours, minutes: minutes} as IPostgresInterval;
            // }
            let hours: number = parseInt(valueString);
            if (!isNaN(hours)) {
                valueInterval = {hours: hours, minutes: 0} as IPostgresInterval;
            }
        }
        else {
            let hours: number = parseInt(valueString.substring(0, posColon));
            let minutes: number = parseInt(valueString.substring(posColon + 1));
            if (!isNaN(hours) && !isNaN(minutes)) {
                if (minutes >= 60) {
                    const hoursFromMinutes = Math.floor(minutes / 60);
                    hours += hoursFromMinutes;
                    minutes = minutes - (hoursFromMinutes * 60);
                }
                valueInterval = {hours: hours, minutes: minutes} as IPostgresInterval;
            }
        }
    }
    return valueInterval;
}

export function intervalAsUI(valueInterval: IPostgresInterval | null): string {
    // conversion e.g. {hours: 10, minutes: 29} => '10:29'
    let valueString: string;
    if (valueInterval !== null) {
        let hours: number = valueInterval.hours ?? 0;
        const minutes: number = valueInterval.minutes ?? 0;
        //const seconds: number = value.seconds ?? 0;
        if (valueInterval.days) {
            hours += valueInterval.days * 24;
        }
        valueString = `${hours.toString()}:${minutes.toString().padStart(2, '0')}`;
    }
    else {
        valueString = ''; // null
    }
    return valueString;
}

export function booleanAsUIText(value: boolean | null): string {
    if (value !== null) {
        // TODO - localeOption for backend
        //return value ? localeOption('yes') : localeOption('no');
        return value ? 'yes' : 'no';
    }
    else {
        return "";
    }
}

export enum AsUIType {
    Form = 1, // forms - boolean is kept, later it is converted to Checkbox
    Text = 2,  // reports - boolean is converted to yes/no
    Excel = 3  // excel - we do not convert everything into a string, mostly we stay with the types number, Date
}

/**
 * converts values of object
 *
 * @param entity
 * @param object
 * @param fromModel
 * @param asUI
 */
export function convertObject(entity: string, object: any, fromModel: boolean, asUI: AsUIType | undefined) {

    const xEntity: Entity = UtilsMetadataCommon.getEntity(entity);

    for (const [field, value] of Object.entries(object)) {
        const xField: Field | undefined = UtilsMetadataCommon.getFieldBase(xEntity, field);
        if (xField) {
            object[field] = convertValue(xField, value, fromModel, asUI);
        }
        else {
            // we did not find it among the fields, we will try to look for xAssoc
            const xAssoc: Assoc | undefined = UtilsMetadataCommon.getAssocBase(xEntity, field);
            if (xAssoc) {
                if (value) {
                    if (xAssoc.relationType === "many-to-one" || xAssoc.relationType === "one-to-one") {
                        convertObject(xAssoc.entityName, value, fromModel, asUI);
                    }
                    else if (xAssoc.relationType === "one-to-many" || xAssoc.relationType === "many-to-many") {
                        if (!Array.isArray(value)) {
                            throw `Unexpected error: entity ${entity} - field ${field} is expected to be array`;
                        }
                        for (const valueItem of value) {
                            convertObject(xAssoc.entityName, valueItem, fromModel, asUI);
                        }
                    }
                }
            }
        }
    }

}

export function convertValue(xField: Field, value: any, fromModel: boolean, asUI: AsUIType | undefined): any {
    return convertValueBase(xField.type, xField.scale, value, fromModel, asUI);
}

export function convertValueBase(fieldType: string, scale: number | undefined, value: any, fromModel: boolean, asUI: AsUIType | undefined): any {
    if (fieldType === "decimal") {
        if (fromModel) {
            value = numberFromModel(value);
        }
        if (asUI && asUI !== AsUIType.Excel) {
            value = numberAsUI(value, scale);
        }
    }
    else if (fieldType === "date") {
        if (fromModel) {
            value = dateFromModel(value);
        }
        if (asUI && (asUI !== AsUIType.Excel || scale === DateScale.Month || scale === DateScale.Year)) {
            value = dateAsUI(value, scale);
        }
    }
    else if (fieldType === "datetime") {
        if (fromModel) {
            value = dateFromModel(value);
        }
        if (asUI) {
            value = datetimeAsUI(value);
        }
    }
    else if (fieldType === "interval") {
        // conversion from the model (json object) is not needed
        if (asUI) {
            value = intervalAsUI(value);
        }
    }
    else if (fieldType === "boolean") {
        // conversion from the model (json object) is not needed
        // for AsUIType.Form we keep the boolean type (we will process it later)
        if (asUI === AsUIType.Text || asUI === AsUIType.Excel) {
            value = booleanAsUIText(value);
        }
    }
    else if (fieldType === "jsonb") {
        // conversion from the model (json object) is not needed
        if (asUI) {
            value = UtilsCommon.objectAsJSON(value);
        }
    }
    else {
        // everything else
        if (asUI && asUI !== AsUIType.Excel) {
            value = (value !== null && value !== undefined) ? value.toString() : "";
        }
    }
    return value;
}

