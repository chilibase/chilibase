import type {Entity, Field} from "./EntityMetadata";
import {UtilsMetadataCommon} from "./UtilsMetadataCommon";
import {AsUIType, convertValue, dateAsYYYY_MM_DD, dateFormat, datetimeFormat} from "./UtilsConversions";
import type {CustomFilter, CustomFilterItem} from "./FindParam";
import type {DataTableSortMeta} from "primereact/datatable";

// common types for frontend and backend

export interface Params {
    [key: string]: any;
}

// common functions for frontend and backend
export class UtilsCommon {

    static newLine: string = '\n';

    // TODO - we could add a check if the programmer made a typo
    static getValueByPath(object: any, path: string): any {
        const [field, restPath] = UtilsCommon.getFieldAndRestPath(path);
        if (restPath === null) {
            return object[field];
        }
        else {
            const assocObject = object[field];
            // when creating a new row - assocObject is not in the new object even as null (it is undefined)
            if (assocObject !== null && assocObject !== undefined) {
                return UtilsCommon.getValueByPath(assocObject, restPath);
            }
            else {
                return null; // the associated object is null, the attribute value will also be null
            }
        }
    }

    // a more general version that also works for *toMany associations
    // TODO - we could add a check if the programmer made a typo
    static getValueOrValueListByPath(object: any, path: string): any | any[] {
        const [field, restPath] = UtilsCommon.getFieldAndRestPath(path);
        if (restPath === null) {
            return object[field];
        }
        else {
            const assocObject = object[field];
            if (Array.isArray(assocObject)) {
                // we encountered an array (attribute "field" is a *toMany association), we collect the values from the array
                const resultValueList: any[] = [];
                for (const assocObjectItem of assocObject) {
                    if (assocObjectItem !== null && assocObjectItem !== undefined) { // just in case, it should not happen
                        const itemValue: any | any[] = UtilsCommon.getValueOrValueListByPath(assocObjectItem, restPath);
                        if (Array.isArray(itemValue)) {
                            resultValueList.push(...itemValue);
                        }
                        else {
                            resultValueList.push(itemValue);
                        }
                    }
                    else {
                        resultValueList.push(null);
                    }
                }
                return resultValueList;
            }
            else {
                // when creating a new row - assocObject is not in the new object even as null (it is undefined)
                if (assocObject !== null && assocObject !== undefined) {
                    return UtilsCommon.getValueOrValueListByPath(assocObject, restPath);
                }
                else {
                    return null; // the associated object is null, the attribute value will also be null
                }
            }
        }
    }

    static setValueByPath(object: any, path: string, value: any) {
        const [pathToAssoc, field]: [string | null, string] = UtilsCommon.getPathToAssocAndField(path);
        if (pathToAssoc !== null) {
            const assocObject = UtilsCommon.getValueByPath(object, pathToAssoc);
            // if null or undefined or is not object, then error
            if (assocObject === null || assocObject === undefined || typeof assocObject !== 'object') {
                console.log(`UtilsCommon.setValueByPath: could not set value ${value} into object property ${path}. Assoc object not found (found value: ${assocObject}). Main object:`);
                console.log(object);
                throw `setValueByPath: could not set value ${value} into object property ${path}. Assoc object not found. The main object can be seen in log.`;
            }
            object = assocObject;
        }
        object[field] = value;
    }

    static getFieldListForPath(path: string): string[] {
        return path.split('.');
    }

    static getFieldAndRestPath(path: string): [string, string | null] {
        const posDot : number = path.indexOf(".");
        if (posDot === -1) {
            return [path, null];
        }
        else {
            const assocField = path.substring(0, posDot);
            const restPath = path.substring(posDot + 1);
            return [assocField, restPath];
        }
    }

    static getPathToAssoc(path: string): string {
        const posDot : number = path.lastIndexOf(".");
        if (posDot === -1) {
            throw `Path to assoc could not be retrieved. Path ${path} must have at least 2 items.`;
        }
        else {
            return path.substring(0, posDot);
        }
    }

    static getPathToAssocAndField(path: string): [string | null, string] {
        const posDot : number = path.lastIndexOf(".");
        if (posDot === -1) {
            return [null, path];
        }
        else {
            return [path.substring(0, posDot), path.substring(posDot + 1)];
        }
    }

    static isSingleField(path: string): boolean {
        return path.indexOf(".") === -1;
    }

    static getPrefixAndField(path: string): [string | null, string] {
        const posDot: number = path.indexOf(":");
        if (posDot === -1) {
            return [null, path];
        }
        else {
            const prefix = path.substring(0, posDot);
            const pathOnly = path.substring(posDot + 1);
            return [prefix, pathOnly];
        }
    }

    static createDisplayValue(object: any, xEntity: Entity | undefined, fields: string[]): string {
        let displayValue: string = "";
        for (const field of fields) {
            const valueStr: string = UtilsCommon.createDisplayValueForField(object, xEntity, field);
            if (valueStr !== "") {
                if (displayValue !== "") {
                    displayValue += " ";
                }
                displayValue += valueStr;
            }
        }
        return displayValue;
    }

    static createDisplayValueForField(object: any, xEntity: Entity | undefined, field: string): string {
        // a similar algorithm is used as in LazyDataTable - the bodyTemplate method
        // (but it is not as complex as in LazyDataTable - it cannot render e.g. html (rich text))
        const [prefix, fieldOnly]: [string | null, string] = UtilsCommon.getPrefixAndField(field);
        let xField: Field | undefined = undefined;
        if (xEntity) {
            xField = UtilsMetadataCommon.getFieldByPath(xEntity, fieldOnly);
        }
        let displayValue: string;
        const valueOrValueList: any | any[] = UtilsCommon.getValueOrValueListByPath(object, fieldOnly);
        if (Array.isArray(valueOrValueList)) {
            // for now the list of OneToMany association values is separated by " ", should the list be put e.g. into brackets [<list>] ?
            displayValue = "";
            for (const value of valueOrValueList) {
                const valueAsUI: string = UtilsCommon.displayValueAsUI(prefix, value, xField);
                if (valueAsUI !== "") {
                    if (displayValue !== "") {
                        displayValue += " ";
                    }
                    displayValue += valueAsUI;
                }
            }
        }
        else {
            displayValue = UtilsCommon.displayValueAsUI(prefix, valueOrValueList, xField);
        }
        return displayValue;
    }

    static displayValueAsUI(prefix: string | null, value: any, xField: Field | undefined): string {
        let displayValue: string;
        if (xField) {
            // converts null values to ""
            displayValue = convertValue(xField, value, true, AsUIType.Text); // Text - boolean is converted to yes/no
        }
        else {
            // we do not have the entity, we cannot convert correctly (but often such a simple conversion is enough for us)
            displayValue = (value !== null && value !== undefined) ? value.toString() : "";
        }

        if (displayValue !== "") {
            if (prefix) {
                displayValue = prefix + displayValue;
            }
        }
        return displayValue;
    }

    static objectAsJSON(value: any): string {

        // some serialization suitable for us needs to be put here
        // for now provisionally done via an antipattern - modification of prototype functions of primitive types
        // TODO - either use some serializer or code our own recursive iteration of objects or use the second parameter in JSON.stringify - the conversion function

        const dateToJSONOriginal = Date.prototype.toJSON;
        Date.prototype.toJSON = function () {
            // TODO - if for datetime we set all time components to 00:00:00, then it formats the value as a date and makes an error when writing to the DB - it writes  1:00:00
            let dateStr: string;
            if (this.getHours() === 0 && this.getMinutes() === 0 && this.getSeconds() === 0) {
                dateStr = dateFormat(this, 'yyyy-MM-dd');
            }
            else {
                // it is a datetime
                dateStr = datetimeFormat(this, 'yyyy-MM-dd HH:mm:ss');
            }
            return dateStr;
        }

        const json: string = JSON.stringify(value);

        // we put back the original function
        Date.prototype.toJSON = dateToJSONOriginal;

        return json;
    }

    static arrayCreateMap<ID, T>(array: T[], idField: string): Map<ID, T> {

        const idRowMap: Map<ID, T> = new Map<ID, T>();
        for (const row of array) {
            if (row) {
                idRowMap.set((row as any)[idField], row);
            }
        }

        return idRowMap;
    }

    static arrayMoveElement(array: any[], position: number, offset: number) {
        const element = array[position];
        array.splice(position, 1);
        let positionNew = position + offset;
        if (positionNew > array.length) {
            positionNew = positionNew - array.length - 1; // element goes to the begin
        }
        else if (positionNew < 0) {
            positionNew = array.length + positionNew + 1; // element goes to the end
        }
        if (positionNew >= 0 && positionNew <= array.length) {
            array.splice(positionNew, 0, element);
        }
    }

    static arraySort(array: any[], fieldOrValueFunction: string | ((item: any) => any)): any[] {

        let valueFunction: ((item: any) => string);
        if (typeof fieldOrValueFunction === 'string') {
            valueFunction = (item: any) => item[fieldOrValueFunction];
        }
        else {
            valueFunction = fieldOrValueFunction;
        }

        return array.sort((suggestion1: any, suggestion2: any) => {
            const value1 = valueFunction(suggestion1);
            const value2 = valueFunction(suggestion2);

            if (value1 > value2) {
                return 1;
            }
            else if (value1 < value2) {
                return -1;
            }
            else {
                return 0;
            }
        });
    }

    /**
     * returns true, if param item is member of the array
     * remark: null/undefined items in array are ignored, item = null/undefined is ignored
     *
     * @param array
     * @param item
     * @param idField
     */
    static arrayIncludes<T>(array: T[], item: T, idField: string): boolean {
        return item && array.some((arrayItem: T) => arrayItem && (arrayItem as any)[idField] === (item as any)[idField]);
    }

    /**
     * returns intersection of 2 row lists
     * remark: null/undefined items in both array1 and array2 are ignored
     *
     * @param array1
     * @param array2
     * @param idField
     */
    static arrayIntersect<T>(array1: T[], array2: T[], idField: string): T[] {

        const array2IdSet = new Set<any>();
        for (const item of array2) {
            if (item) {
                array2IdSet.add((item as any)[idField]);
            }
        }

        return array1.filter((item: T) => item && array2IdSet.has((item as any)[idField]));
    }

    // returns ids that are in idListA or in idListB but not in both lists
    static numberArraySymmetricDiff(idListA: number[], idListB: number[]): number[] {
        const setA = new Set(idListA);
        const setB = new Set(idListB);

        const result: number[] = [];

        for (const id of setA) {
            if (!setB.has(id)) {
                result.push(id);
            }
        }

        for (const id of setB) {
            if (!setA.has(id)) {
                result.push(id);
            }
        }

        return result;
    }

    static numberArrayUnion(idListA: number[], idListB: number[]): number[] {
        return Array.from(new Set([...idListA, ...idListB])); // new Set(...) removes duplicates automatically
    }

    // ************* CustomFilter/CustomFilterItem/DataTableSortMeta **************

    // helper method - so that we do not have to write {where: <filter>, params: {}} in the code
    static createCustomFilter(filter: string | undefined | null): CustomFilterItem | undefined {
        let customFilterItem: CustomFilterItem | undefined = undefined;
        if (filter) {
            customFilterItem = {where: filter, params: {}};
        }
        return customFilterItem;
    }

    // helper method - converts CustomFilter -> CustomFilterItem[]
    static createCustomFilterItems(customFilter: CustomFilter | undefined): CustomFilterItem[] | undefined {
        let customFilterItems: CustomFilterItem[] | undefined = undefined;
        if (customFilter) {
            if (Array.isArray(customFilter)) {
                customFilterItems = customFilter;
            } else {
                customFilterItems = [customFilter];
            }
        }
        return customFilterItems;
    }

    // helper method - converts sortField -> DataTableSortMeta[]
    static createMultiSortMeta(sortField: string | DataTableSortMeta[] | undefined): DataTableSortMeta[] | undefined {
        let multiSortMeta: DataTableSortMeta[] | undefined = undefined;
        if (sortField) {
            if (Array.isArray(sortField)) {
                multiSortMeta = sortField;
            }
            else {
                // default order is asc, supported is also value in form "<column name> desc"
                let order: 1 | -1 = 1;
                const fieldAndOrder: string[] = sortField.split(' ');
                if (fieldAndOrder.length === 2) {
                    sortField = fieldAndOrder[0];
                    if (fieldAndOrder[1].toLowerCase() === "desc") {
                        order = -1;
                    }
                }
                multiSortMeta = [{field: sortField, order: order}];
            }
        }
        return multiSortMeta;
    }

    // helper method
    static filterAnd(...filters: (CustomFilter | undefined)[]): CustomFilterItem[] | undefined {
        let customFilterItemsResult: CustomFilterItem[] | undefined = undefined;
        if (filters.length > 0) {
            customFilterItemsResult = [];
            for (const filter of filters) {
                const customFilterItems: CustomFilterItem[] | undefined = UtilsCommon.createCustomFilterItems(filter);
                if (customFilterItems) {
                    customFilterItemsResult.push(...customFilterItems);
                }
            }
        }
        return customFilterItemsResult;
    }

    // helper method
    // if idList is empty, it creates the condition id IN (0) and does not return any records
    static filterIdIn(idField: string, idList: number[]): CustomFilter {
        return {where: `[${idField}] IN (:...idList)`, params: {"idList": idList.length > 0 ? idList : [0]}};
    }

    // helper
    static createPathFieldExp(pathFieldOrPathFieldExp: string): string {
        // if fieldOrPathFieldExp is only pathField (e.g. attrX or assocA.attrB) then make path field expression (enclose field into [])
        if (UtilsCommon.isPathField(pathFieldOrPathFieldExp)) {
            pathFieldOrPathFieldExp = `[${pathFieldOrPathFieldExp}]`;
        }
        return pathFieldOrPathFieldExp;
    }

    // helper
    static isPathField(pathFieldOrPathFieldExp: string): boolean {
        return /^[a-zA-Z0-9_.]+$/.test(pathFieldOrPathFieldExp);
    }

    static getDayName(date: Date | null | undefined): string | undefined {
        const days = ['nedeľa', 'pondelok', 'utorok', 'streda', 'štvrtok', 'piatok', 'sobota'];
        return date ? days[date.getDay()] : undefined;
    }

    static dateAddDays(date: Date | null, days: number): Date | null {
        let result = null;
        if (date !== null) {
            result = new Date(date);
            result.setDate(result.getDate() + days);
        }
        return result;
    }

    static dateAddMonths(date: Date | null, months: number): Date | null {
        let result = null;
        if (date !== null) {
            result = new Date(date);
            result.setMonth(result.getMonth() + months);
        }
        return result;
    }

    // helper method, because date1 === date2 compares pointers, not values (Date is not primitive type like string or number)
    static dateEquals(date1: Date | null, date2: Date | null): boolean {
        let result: boolean = false;
        if (date1 === null && date2 === null) {
            result = true;
        }
        else if (date1 !== null && date2 !== null) {
            // to avoid problems with time part, we use dateCompare
            result = (UtilsCommon.dateCompare(date1, date2) === 0);
            // we had a problem - the function dateFromModel() converted the string "2025-02-04" to Tue Feb 04 2025 01:00:00 GMT+0100 (Central European Standard Time)
            // and XCalendar when clicking a date returned Tue Feb 04 2025 00:00:00 GMT+0100 (Central European Standard Time) -> we fixed XCalendar
            //result = date1.getFullYear() === date2.getFullYear()
            //    && date1.getMonth() === date2.getMonth()
            //    && date1.getDate() === date2.getDate();
        }
        return result;
    }

    static dateIntersect(date1From: Date, date1To: Date, date2From: Date, date2To: Date): boolean {
        return UtilsCommon.dateCompare(date1From, date2To) <= 0 && UtilsCommon.dateCompare(date2From, date1To) <= 0;
    }

    // because of time part, the usual compare (using <=) sometimes does not work correct
    static dateCompare(date1: Date, date2: Date): number {
        const dateOnly1: Date = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
        const dateOnly2: Date = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
        if (dateOnly1.getTime() < dateOnly2.getTime()) {
            return -1;
        }
        else if (dateOnly1.getTime() === dateOnly2.getTime()) {
            return 0;
        }
        else {
            // dateOnly1 > dateOnly2
            return 1;
        }
    }

    // solution from internet
    static dateDiffInYears(dateOld: Date | null, dateNew: Date | null): number | null {
        let diff: number | null = null;
        if (dateOld !== null && dateNew !== null) {
            const yearNew: number = dateNew.getFullYear();
            const monthNew: number = dateNew.getMonth();
            const dayNew: number = dateNew.getDate();
            const yearOld: number = dateOld.getFullYear();
            const monthOld: number = dateOld.getMonth();
            const dayOld: number = dateOld.getDate();
            diff = yearNew - yearOld;
            if (monthOld > monthNew) {
                diff--;
            }
            else {
                if (monthOld === monthNew) {
                    if (dayOld > dayNew) {
                        diff--;
                    }
                }
            }
        }
        return diff;
    }

    // returns month diff for 2 dates of type month (YYYY-MM-01) - days are ignored
    static monthDiff(monthOld: Date | null, monthNew: Date | null): number | null {
        let diff: number | null = null;
        if (monthOld !== null && monthNew !== null) {
            const yearCountNew: number = monthNew.getFullYear();
            const monthCountNew: number = monthNew.getMonth();
            const yearCountOld: number = monthOld.getFullYear();
            const monthCountOld: number = monthOld.getMonth();
            diff = (yearCountNew - yearCountOld) * 12 + (monthCountNew - monthCountOld);
        }
        return diff;
    }

    static findFirstMatch(pattern: RegExp, value: string): string | null {
        const match: RegExpExecArray | null = pattern.exec(value);
        return match != null ? match[0] : null;
    }

    // to be used in sql expressions
    static sqlMaxDateIfNull(sqlExp: string): string {
        return `coalesce(${sqlExp}, '9999-12-31'::DATE)`;
    }

    // static today(): Date {
    //     const today = new Date();
    //     // we zero out the time component
    //     // note: Date always also contains a time component. Our conversion functions dateFromModel and dateFromUI use the conversion new Date('YYYY-MM-DD')
    //     // and this conversion creates a date with GMT/UTC/Z time 00:00:00 (Central European 00:01:00 - as if we were entering new Date('YYYY-MM-DDT00:00:00Z'))
    //     //today.setHours(0, 0, 0, 0); // sets the time 00:00:00 in the current timezone (Central European 00:00:00, GMT 23:00:00)
    //     // - then comparison with dates created via the functions dateFromModel and dateFromUI does not work for us
    //     today.setUTCHours(0, 0, 0, 0);
    //     return today;
    // }

    // fix:
    static today(): Date {
        return new Date(dateAsYYYY_MM_DD(new Date()));
    }

    static currentMonth(): Date {
        return UtilsCommon.dateAsMonth(UtilsCommon.today())!;
    }

    static dateAsMonth(date: Date | null): Date | null {
        let month: Date | null = null;
        if (date !== null) {
            month = new Date(date); // create copy not to change "date"
            month.setUTCDate(1); // first day of month
        }
        return month;
    }

    // returns true if the string consists only of digits, it can have + or - at the beginning
    static isInt(stringValue: string): boolean {
        return /^[-+]?\d+$/.test(stringValue);
    }
}

