import type {Field} from "../common/EntityMetadata";
import {Utils} from "./Utils";
import type {BrowseMeta} from "../modules/administration";
import type {BetweenFilterProp} from "../components/lazy-data-table";
import {UtilsMetadataCommon} from "../common/UtilsMetadataCommon";
import type {BrowseMetaMap} from "../common/types";

// ideal name: UtilsEntityMetadata - but terribly long
// this functionality should go either into classes XEntity, XField or better into some service
// equivalent functionality is also on the server in the service EntityMetadataService.ts (TODO - in the future make a common class/service)
export class UtilsMetadata {
    // cached metadata (set in App.fetchAndSetXMetadata)
    private static xBrowseMetaMap: BrowseMetaMap;

    static async fetchAndSetXEntityMap(): Promise<any> {
        if (UtilsMetadataCommon.getEntityMap() === undefined) {
            UtilsMetadataCommon.setEntityMap(await Utils.fetch("x-get-entity-metadata-map", {dummy: "dummy"}));
        }
    }

    static async fetchAndSetXBrowseMetaMap(): Promise<any> {
        if (UtilsMetadata.xBrowseMetaMap === undefined) {
            UtilsMetadata.xBrowseMetaMap = await Utils.fetch("x-get-browse-meta-map", {dummy: "dummy"});
        }
    }

    // temporarily here, until we have a unified NumberField/TableNumberField
    static getParamsForInputNumber(xField: Field): {useGrouping: boolean; fractionDigits?: number; min?: number; max?: number; size?: number} {
        let useGrouping: boolean = true;
        let scale: number | undefined = undefined;
        let precision: number | undefined = undefined; // total number of digits (before + after decimal point (scale))
        let size: number | undefined = undefined;
        if (xField.type === "decimal") {
            useGrouping = true;
            scale = xField.scale;
            precision = xField.precision;
            if (precision !== undefined) {
                size = precision + Math.floor(precision/3); // approximatly for 123.456.789,12
            }
        }
        else if (xField.type === "number") {
            useGrouping = false;
            scale = 0;
            precision = xField.width; // number uses width
            if (precision === undefined) {
                precision = xField.precision; // let it work this way too...
            }
            size = precision;
        }
        else {
            throw `NumberField: field ${xField.name} has unsupported type ${xField.type}. Supported types are decimal and number.`;
        }

        return UtilsMetadata.getParamsForInputNumberBase(useGrouping, scale, precision, size);
    }

    static getParamsForInputNumberBase(
        useGrouping: boolean,
        scale: number | undefined,
        precision: number | undefined,  // total number of digits (before + after decimal point (scale))
        size: number | undefined
    ): {useGrouping: boolean; fractionDigits?: number; min?: number; max?: number; size?: number} {
        let min: number | undefined = undefined;
        let max: number | undefined = undefined;
        if (precision !== undefined && scale !== undefined) {
            const digits = precision - scale;
            min = -(Math.pow(10, digits) - 1);
            max = Math.pow(10, digits) - 1;
        }

        return {useGrouping: useGrouping, fractionDigits: scale, min: min, max: max, size: size};
    }

    //static CHAR_SIZE: number = 0.57; // 0.57rem (8px)
    static CHAR_SIZE: number = 0.5; // 0.5rem (7px) - we will try

    static computeColumnWidth(xField: Field, betweenFilter: BetweenFilterProp, filterMenuInFilterRow: boolean, formColumnType: string | undefined, header: string | undefined, sortableButtonInHeader: boolean, filterButtonInHeader: boolean): string | undefined {
        let width: number | undefined;
        if (formColumnType === undefined) {
            // lazy datatable (no inputs, no buttons, only text and padding)
            if (xField.type === "string") {
                width = UtilsMetadata.computeColumnWidthBase(xField.length, 0.5 + 0.5); // padding 7px + 7px
            }
            else if (xField.type === "decimal" || xField.type === "number") {
                const {size} = UtilsMetadata.getParamsForInputNumber(xField);
                width = UtilsMetadata.computeColumnWidthBase(size, 0.5 + 0.5);
            }
            else if (xField.type === "date") {
                width = UtilsMetadata.computeColumnWidthBase(11, 0.25 + 1.25 + 0.25); // e.g. 31.12.2021 (note: I used 11 because the whole date was not visible in the filter), 1.25 rem date picker button
            }
            else if (xField.type === "datetime") {
                width = UtilsMetadata.computeColumnWidthBase(10 + 9, 0.25 + 1.25 + 0.25); // e.g. 31.12.2021 03:03:00
            }
            else if (xField.type === "boolean") {
                width = 1.43 + 0.5 + 0.5; // checkbox has a width of 20px
            }
            else {
                throw `Field ${xField.name}: unknown xField.type = ${xField.type}`;
            }
            if (betweenFilter === "row" && width) {
                width *= 2;
            }
        }
        else {
            // form datatable (formColumnType is defined)
            if (formColumnType === "inputSimple" || formColumnType === "textarea") {
                const padding = 0.21 + 0.07 + 0.5; // padding is 2.94px + 1px border + 7px padding in input
                if (xField.type === "string") {
                    width = UtilsMetadata.computeColumnWidthBase(xField.length, padding + padding); // padding left + right
                }
                else if (xField.type === "decimal" || xField.type === "number") {
                    const {size} = UtilsMetadata.getParamsForInputNumber(xField);
                    width = UtilsMetadata.computeColumnWidthBase(size, padding + padding);
                    if (betweenFilter === "row" && width) {
                        width *= 2; // not tested, only estimation
                    }
                }
                else if (xField.type === "date") {
                    if (betweenFilter === "row") {
                        width = (0.21 + 6 + 1.25 + 0.21) * 2; // not tested, only estimation
                    }
                    else {
                        width = 0.21 + 6 + 2.36 + 0.21; // padding + input (also in App.css defined) + button + padding
                    }
                }
                else if (xField.type === "datetime") {
                    if (betweenFilter === "row") {
                        width = (0.21 + 10 + 1.25 + 0.21) * 2; // not tested, only estimation
                    }
                    else {
                        width = 0.21 + 10 + 2.36 + 0.21; // padding + input (also in App.css defined) + button + padding
                    }
                }
                else if (xField.type === "boolean") {
                    width = 1.43 + 0.5 + 0.5; // checkbox has a width of 20px
                }
                else {
                    throw `Field ${xField.name}: unknown xField.type = ${xField.type}`;
                }
            }
            else if (formColumnType === "dropdown" || formColumnType === "autoComplete" || formColumnType === "searchButton") {
                // we compute the width of the input
                const padding = 0.21 + 0.07 + 0.5; // padding is 2.94px + 1px border + 7px padding in input
                if (xField.type === "string") {
                    width = UtilsMetadata.computeColumnWidthBase(xField.length, padding + padding); // padding left + right
                }
                else if (xField.type === "decimal" || xField.type === "number") {
                    const {size} = UtilsMetadata.getParamsForInputNumber(xField);
                    width = UtilsMetadata.computeColumnWidthBase(size, padding + padding);
                }
                else if (xField.type === "date") {
                    width = UtilsMetadata.computeColumnWidthBase(10, padding + padding); // e.g. 31.12.2021
                }
                else if (xField.type === "datetime") {
                    width = UtilsMetadata.computeColumnWidthBase(10 + 9, padding + padding); // e.g. 31.12.2021 03:03:00
                }
                else {
                    throw `Field ${xField.name}: xField.type = ${xField.type} not implemented for dropdown/autoComplete/searchButton`;
                }
                // we add the width of the button
                if (formColumnType === "dropdown") {
                    if (width !== undefined) {
                        width += 2; // button for dropdown
                    }
                }
                else if (formColumnType === "autoComplete") {
                    if (width !== undefined) {
                        width += 1.56; // button for auto complete
                    }
                }
                else if (formColumnType === "searchButton") {
                    if (width !== undefined) {
                        width += 2.18; // button for search button
                    }
                }
            }
            else {
                throw "Unknown prop type = " + formColumnType;
            }
        }
        if (filterMenuInFilterRow) {
            // if the column has width of 25 characters or more, then the input field can be shorter
            if (width !== undefined && width < 25 * UtilsMetadata.CHAR_SIZE) {
                width += 1.25; // filter menu icon
            }
        }
        // if the label is longer than the column width, the column width will follow the label
        if (header !== undefined) {
            let widthHeader = UtilsMetadata.computeColumnWidthBase(header.length, 0.5); // padding (7px)
            if (sortableButtonInHeader && widthHeader !== undefined) {
                widthHeader += 0.5 + 1.28; // sort icon (25px = 7px (space/margin) + 18px (icon body))
            }
            if (filterButtonInHeader && widthHeader !== undefined) {
                widthHeader += 1.5; // filter icon (21px = 14px (icon body) + 7px (right padding))
            }
            if (widthHeader !== undefined) {
                if (width === undefined || widthHeader > width) {
                    width = widthHeader;
                }
            }
        }

        return width !== undefined ? width.toString() + 'rem' : undefined;
    }

    static computeColumnWidthBase(charSize?: number, paddingAndOther?: number): number | undefined {
        let width: number | undefined;
        if (charSize !== undefined) {
            width = charSize * UtilsMetadata.CHAR_SIZE; // character size (8px)
        }
        if (width !== undefined && paddingAndOther !== undefined) {
            width += paddingAndOther;
        }
        return width;
    }

    static getXBrowseMeta(entity: string, browseId?: string): BrowseMeta {
        const key = UtilsMetadata.getXBrowseFormMetaKey(entity, browseId);
        const xBrowseMeta: BrowseMeta = UtilsMetadata.xBrowseMetaMap[key];
        return xBrowseMeta;
    }

    static setXBrowseMeta(entity: string, browseId: string | undefined, xBrowseMeta: BrowseMeta) {
        const key = UtilsMetadata.getXBrowseFormMetaKey(entity, browseId);
        UtilsMetadata.xBrowseMetaMap[key] = xBrowseMeta;
    }

    static getXBrowseFormMetaKey(entity: string, browseId?: string): string {
        let key = entity;
        if (browseId !== undefined) {
            key = key + '_' + browseId;
        }
        return key;
    }
}
