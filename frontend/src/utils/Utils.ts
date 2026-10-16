import type {AuthSession} from "../components/auth/AuthSession";
import type {Entity, Field} from "../common/EntityMetadata";
import {UtilsMetadata} from "./UtilsMetadata";
import {type Params, UtilsCommon} from "../common/UtilsCommon";
import {
    CsvDecimalFormat,
    CsvEncoding,
    CsvSeparator,
    ExportType,
    ToManyAssocExportType
} from "../common/ExportImportParam";
import {ResponseError} from "./ResponseError";
import type {ReactElement, CSSProperties, RefObject, ComponentType} from "react";
import {EnvVar} from "../components/env-vars/EnvVars";
import type {FieldError, FieldErrorMap} from "../components/form/FormErrors";
import {type FindParam, ResultType, type CustomFilter} from "../common/FindParam";
import type {DataTableSortMeta} from "primereact/datatable";
import type {EntityRow} from "../common/types";
import type {TableFieldReadOnlyProp} from "../components/detail-data-table";
import {UtilsMetadataCommon} from "../common/UtilsMetadataCommon";
import type {SelectItem} from "primereact/selectitem";
import {localeOption} from "../components/locale/Locale";
import type {LazyDataTableRef} from "../components/lazy-data-table";
import type {CreateObjectFunction, OnSaveOrCancelProp} from "../components/form";
import {initMsalConfig} from "../components/auth";
import type {FindRowByIdRequest, FindRowByIdResponse} from "../common/lib-api";
import {OperationType, ViewStatus, type ViewStatusOrBoolean, type StorageType, type GetEnvVarValue, type FilterOrFunction} from "./types";

export class Utils {

    // from technical reasons (using vite), we need to use function from app to read env vars
    static xGetEnvVarValue: GetEnvVarValue | undefined = undefined;

    static dropdownEmptyOptionValue: string = " ";

    static xBackendUrl: string | undefined = undefined;

    // cached AuthSession - in various places we need to know the user
    static authSession: AuthSession | null = null;

    // cached metadata (set in App.fetchAndSetXMetadata)
    private static appFormMap: {[name: string]: any;} = {};

    static exportTypeOptions = [ExportType.Excel, ExportType.Csv, ExportType.Json];

    // the Off option is not implemented for now
    static toManyAssocExportTypeExcelOptions = [ToManyAssocExportType.Singleline, ToManyAssocExportType.Multiline, ToManyAssocExportType.Multirow/*, ToManyAssocExportType.Off*/];
    static toManyAssocExportTypeCsvOptions = [ToManyAssocExportType.Singleline, ToManyAssocExportType.Multirow/*, ToManyAssocExportType.Off*/];

    static csvSeparatorOptions = [CsvSeparator.Semicolon, CsvSeparator.Comma];

    static decimalFormatOptions = [CsvDecimalFormat.Comma, CsvDecimalFormat.Dot];

    static csvEncodingOptions = [CsvEncoding.Utf8, CsvEncoding.Win1250];

    static remSize: number | null = null;

    // constants (for now simply like this)
    static FIELD_LABEL_WIDTH: string = '10.5rem';

    static lastVersionCheckTimestamp: number | null = null;

    static VERSION_CHECK_PERIOD: number = 10 * 60 * 1000; // 10 minutes in milliseconds

    static initLib(xGetEnvVarValue: GetEnvVarValue) {
        // place here all initialization stuff

        Utils.xGetEnvVarValue = xGetEnvVarValue;

        Utils.setXBackendUrl(Utils.getEnvVarValue(EnvVar.VITE_BACKEND_URL));

        initMsalConfig();
    }

    static isMobile(): boolean {
        // extra small displays (according to https://www.w3schools.com/howto/howto_css_media_query_breakpoints.asp)
        // maybe (window.screen.width * window.devicePixelRatio) should be put here
        // it used to be 600 ($sm = 576 (primeflex)) - only if the phone was in portrait, 768 should also be for the phone in landscape
        //return typeof window !== 'undefined' && window.screen.availWidth < 768; // $sm = 576 (primeflex)
        // window.screen.availWidth was misbehaving for me (it returned 1920 in mobile mode in the browser)
        return Utils.getViewWidth() < 768;
    }

    static mobileCssSuffix(): string {
        return Utils.isMobile() ? '-mobile' : '';
    }

    static toPX(size: string | undefined): number | undefined {
        let sizeInPx: number | undefined;
        if (size !== undefined) {
            if (size.endsWith('px')) {
                sizeInPx = parseFloat(size);
            }
            else if (size.endsWith('rem')) {
                sizeInPx = parseFloat(size) * Utils.getRemSize();
            }
            if (Number.isNaN(sizeInPx)) {
                sizeInPx = undefined;
            }
        }
        return sizeInPx;
    }

    static toPX0(size: string | undefined): number {
        return Utils.toPX(size) ?? 0;
    }

    static getRemSize(): number {
        if (Utils.remSize === null) {
            // font-size of root element (HTML element), e.g. "14px"
            Utils.remSize = parseFloat(window.getComputedStyle(document.documentElement).fontSize);
        }
        return Utils.remSize;
    }

    // alternative to 100vw, if 100vw can not be used because of technical reasons
    static getViewWidth(): number {
        return Math.max(
            document.body.scrollWidth,
            document.documentElement.scrollWidth,
            document.body.offsetWidth,
            document.documentElement.offsetWidth,
            document.documentElement.clientWidth
        );
    }

    // alternative to 100vh, if 100vh can not be used because of technical reasons
    static getViewHeight(): number {
        return Math.max(
            document.body.scrollHeight,
            document.documentElement.scrollHeight,
            document.body.offsetHeight,
            document.documentElement.offsetHeight,
            document.documentElement.clientHeight
        );
    }

    // param example: "3rem md:4rem xl:6rem"
    // (in general: "<exp1> sm:<exp2> md:<exp3> lg:<exp4> xl:<exp5>")
    // according to device width returns "exp(n)"
    static processGridBreakpoints(breakpointExp: string): string | undefined {
        const breakpointList: string[] = breakpointExp.split(' ');
        // we add the prefix xs: if there is no prefix, so that it is easier to work with
        for (const [index, breakpoint] of breakpointList.entries()) {
            if (breakpoint !== '' && breakpoint.indexOf(':') === -1) {
                breakpointList[index] = 'xs:' + breakpoint;
            }
        }
        // TODO - use variables $sm, $md, ...
        let breakpointsToFind: string[];
        let availWidth;
        if (typeof window !== 'undefined') {
            //availWidth = window.screen.availWidth; // we use availWidth, not width, availWidth subtracts e.g. the taskbar
            // window.screen.availWidth was misbehaving for me (it returned 1920 in mobile mode in the browser) - maybe window.outerWidth should be here
            availWidth = Utils.getViewWidth();
            if (availWidth < 576) {
                breakpointsToFind = ['xs:'];
            }
            else if (availWidth < 768) {
                breakpointsToFind = ['sm:', 'xs:'];
            }
            else if (availWidth < 992) {
                breakpointsToFind = ['md:', 'sm:', 'xs:'];
            }
            else if (availWidth < 1200) {
                breakpointsToFind = ['lg:', 'md:', 'sm:', 'xs:'];
            }
            else {
                breakpointsToFind = ['xl:', 'lg:', 'md:', 'sm:', 'xs:'];
            }
        }
        else {
            // desktop screen?
            breakpointsToFind = ['xl:', 'lg:', 'md:', 'sm:', 'xs:'];
        }
        for (const breakpointToFind of breakpointsToFind) {
            for (const breakpoint of breakpointList) {
                if (breakpoint.startsWith(breakpointToFind)) {
                    return breakpoint.substring(breakpointToFind.length);
                }
            }
        }
        // should not happen
        console.log(`Utils.processGridBreakpoints: unexpected error: no breakpoint value found, breakpointExp = ${breakpointExp}, availWidth = ${availWidth}`);
        return undefined;
    }

    static processPropWidth(widthProp: string | undefined) : string | undefined {
        let width: string | undefined;
        if (widthProp !== undefined && widthProp !== null) {
            width = Utils.processGridBreakpoints(widthProp);
            if (width !== undefined) {
                if (!isNaN(Number(width))) { // if width is number
                    width = width + 'rem';
                }
            }
        }
        return width;
    }

    static addCssPropIfNotExists(cssProps: CSSProperties, newCssProps: CSSProperties) {
        for (const [cssProp, cssPropValue] of Object.entries(newCssProps)) {
            if (!(cssProp in cssProps)) {
                (cssProps as any)[cssProp] = cssPropValue;
            }
        }
    }

    // unused for now - in the future registries of browses and forms can be created this way, which we will then be able to open only based on the entity
    static registerAppBrowse(elem: any, entity: string, formId?: string): void {
        // console.log("***************** we are in register");
        // console.log(elem);
        // console.log(entity);
    }

    static registerAppForm(elem: any, entity: string, formId?: string): void {
        const formKey = UtilsMetadata.getXBrowseFormMetaKey(entity, formId);
        Utils.appFormMap[formKey] = elem;
    }

    static getAppForm(entity: string, formId?: string): any {
        const formKey = UtilsMetadata.getXBrowseFormMetaKey(entity, formId);
        return Utils.appFormMap[formKey];
    }

    static fetchMany(path: string, value: any): Promise<any[]> {
        return Utils.fetch(path, value);
    }

    // helper method using the lazyDataTable service
    static async fetchRows(entity: string, customFilter?: CustomFilter | undefined, sortField?: string | DataTableSortMeta[] | undefined, fields?: string[]): Promise<any[]> {
        const findParam: FindParam = {resultType: ResultType.AllRows, entity: entity, customFilterItems: UtilsCommon.createCustomFilterItems(customFilter), multiSortMeta: UtilsCommon.createMultiSortMeta(sortField), fields: fields};
        const {rowList}: {rowList: any[];} = await Utils.fetchOne('x-lazy-data-table-find-rows', findParam);
        return rowList;
    }

    // helper method using the lazyDataTable service
    static async fetchRowCount(entity: string, customFilter?: CustomFilter | undefined): Promise<number> {
        const findParam: FindParam = {resultType: ResultType.OnlyRowCount, entity: entity, customFilterItems: UtilsCommon.createCustomFilterItems(customFilter)};
        const {totalRecords}: {totalRecords: number;} = await Utils.fetchOne('x-lazy-data-table-find-rows', findParam);
        return totalRecords;
    }

    static fetchOne(path: string, value: any, useToken: boolean = true): Promise<any> {
        return Utils.fetch(path, value, useToken);
    }

    static async fetchString(path: string, value: any): Promise<string> {
        const valueObj = await Utils.fetch(path, value);
        return valueObj.value;
    }

    static async fetch(path: string, value: any, useToken: boolean = true): Promise<any> {
        const response = await Utils.fetchBasicJson(path, value, useToken);
        return await response.json();
    }

    static post(path: string, value: any): Promise<Response> {
        return Utils.fetchBasicJson(path, value);
    }

    static async openExcelReport(apiPath: string, requestPayload: any, fileName?: string): Promise<boolean> {
        return Utils.downloadFile(apiPath, requestPayload, `${fileName ?? apiPath}.xlsx`);
    }

    // general method for file download
    // returns true if the download finished successfully (often we don´t need this info)
    // it would be nice if the fileName could be taken also from backend, from the service call
    static async downloadFile(apiPath: string, requestPayload: any, fileName: string): Promise<boolean> {
        let response;
        try {
            response = await Utils.fetchBasicJson(apiPath, requestPayload);
        }
        catch (e) {
            Utils.showErrorMessage(localeOption('fileDownloadFailed'), e);  // next info (apiPath, payload) should be in "e"
            return false;
        }
        // let respJson = await response.json(); - converts into a json object
        let respBlob = await response.blob();

        // download of the blob (the download should work asynchronously and in a "streaming" way in cooperation with the server)
        let url = window.URL.createObjectURL(respBlob);
        let a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();

        return true;
    }

    static fetchBasicJson(path: string, value: any, useToken: boolean = true): Promise<Response> {
        return Utils.fetchBasic(path, {'Content-Type': 'application/json'}, UtilsCommon.objectAsJSON(value), useToken);
    }

    static async fetchFile(path: string, jsonFieldValue: any, fileToPost: any): Promise<any> {
        const formData = new FormData();
        formData.append(
            "jsonField",
            UtilsCommon.objectAsJSON(jsonFieldValue)
        );
        formData.append(
            "fileField",
            fileToPost,
            fileToPost.name
        );
        // note: the fetch method automatically adds 'Content-Type': 'multipart/form-data' into headers, including the boundary
        const response = await Utils.fetchBasic(path, {}, formData);
        return await response.json();
    }

/*
    // unused old Basic authentication
    static async fetchBasicAuthBasic(path: string, headers: any, body: any, usePublicToken?: boolean | XToken): Promise<Response> {
        let xToken: XToken | null;
        if (typeof usePublicToken === 'object') {
            xToken = usePublicToken;
        }
        else if (usePublicToken) {
            xToken = Utils.xTokenPublic; // public token always
        }
        else {
            xToken = Utils.getXToken();
            if (xToken === null) {
                xToken = Utils.xTokenPublic; // if nobody is logged in, we send the public token
            }
        }
        headers = {...headers,
            'Authorization': `Basic ${Buffer.from(xToken.username + ':' + xToken.password).toString('base64')}`
        };
        const response = await fetch(Utils.getXBackendUrl() + path, {
            method: 'POST',
            headers: headers,
            body: body
        });
        if (!response.ok) {
            const responseBody = await response.json();
            throw new ResponseError(path, response.status, response.statusText, responseBody);
        }
        return response;
    }
*/

    static async fetchBasic(path: string, headers: any, body: any, useToken: boolean = true): Promise<Response> {
        if (useToken) {
            const accessToken: string = await Utils.getAccessToken();
            headers = {...headers,
                'Authorization': `Bearer ${accessToken}`
            };
        }
        const response = await fetch(Utils.getXBackendUrl() + path, {
                                    method: 'POST',
                                    headers: headers,
                                    body: body
                                });
        if (!response.ok) {
            const responseBody = await response.json();
            throw new ResponseError(path, response.status, response.statusText, responseBody);
        }
        return response;
    }

    static async fetchById(entity: string, assocList: string[], id: number): Promise<any> {
        // little quick fix - we create fieldList (adding id), better would be to have param assocList in api
        const fieldList: string[] = assocList.map<string>(assoc => assoc + ".id");
        const response: FindRowByIdResponse = await Utils.fetchByIdWithLock(entity, fieldList, id, false);
        return response.row;
    }

    // version with fieldList (used by old projects), preferred is fetchById, maybe in the future will be used to avoid overfetching
    static async fetchByIdFieldList(entity: string, fieldList: string[], id: number): Promise<any> {
        const response: FindRowByIdResponse = await Utils.fetchByIdWithLock(entity, fieldList, id, false);
        return response.row;
    }

    // more general function - can also lock the row
    static fetchByIdWithLock(entity: string, fields: string[], id: number, lockRow: boolean, overwriteLock?: boolean): Promise<FindRowByIdResponse> {
        return Utils.fetchByIdWithLockBase('x-find-row-by-id', entity, fields, id, lockRow, overwriteLock);
    }

    static fetchByIdWithLockBase(path: string, entity: string, fields: string[], id: number, lockRow: boolean, overwriteLock?: boolean): Promise<FindRowByIdResponse> {
        let request: FindRowByIdRequest = {entity: entity, fields: fields, id: id};
        if (lockRow) {
            request = {...request, lockDate: new Date(), lockUser: Utils.getAuthSession()?.user, overwriteLock: overwriteLock ?? false};
        }
        return Utils.fetchOne(path, request);
    }

    static setAuthSession(authSession: AuthSession | null) {
        Utils.authSession = authSession;
    }

    static getAuthSession(): AuthSession | null {
        return Utils.authSession;
    }

    static async getAccessToken(): Promise<string> {
        const authSession: AuthSession | null = Utils.getAuthSession();
        if (authSession === null) {
            throw "Unexpected error - Utils.authSession is null (no user signed in)";
        }
        let accessToken: string;
        if (typeof authSession.accessToken === 'function') {
            accessToken = await authSession.accessToken(); // we obtain the access token by calling getAccessTokenSilently (or something similar)
        }
        else if (authSession.accessToken !== undefined) {
            accessToken = authSession.accessToken; // we have the access token directly
        }
        else {
            throw "Unexpected error - Utils.authSession.accessToken is undefined";
        }
        return accessToken;
    }

    static getUsername(): string | undefined {
        return Utils.getAuthSession()?.user?.username;
    }

    static getXBackendUrl(): string {
        if (Utils.xBackendUrl === undefined) {
            throw "Utils.xBackendUrl is undefined";
        }
        return Utils.xBackendUrl;
    }

    static setXBackendUrl(xBackendUrl: string) {
        if (!xBackendUrl.endsWith('/')) {
            xBackendUrl += '/';
        }
        Utils.xBackendUrl = xBackendUrl;
    }

    /**
     * returns value of environment variable from configuration file .env
     * @param envVar
     */
    static getEnvVarValue(envVarEnum: EnvVar): string {
        return Utils.getEnvVarValueBase(envVarEnum);
    }

    static getEnvVarValueBase(envVarEnum: string): string {
        // HEY import.meta.env does not work here in package
        //const value: string | undefined = import.meta.env[envVarEnum];
        // const value: string | undefined = process.env[envVarEnum];
        // if (value === undefined) {
        //     throw `Environment variable ${envVarEnum} - value not found. Check configuration file .env*`;
        // }

        if (!Utils.xGetEnvVarValue) {
            //const err = new Error();
            //console.log(err.stack);
            throw `Unexpected error - Utils.xGetEnvVarValue is undefined, call Utils.initLib first`;
        }
        return Utils.xGetEnvVarValue(envVarEnum);
    }

    static getEnvVarValueBoolean(envVarEnum: EnvVar): boolean {
        const value: string = Utils.getEnvVarValue(envVarEnum);
        return value === "true";
    }

    // functionality that would be good to put into services

    static async removeRow(entity: string, row: any) {
        const xEntity: Entity = UtilsMetadataCommon.getEntity(entity);
        const id = row[xEntity.idField];
        await Utils.post('x-remove-row', {entity: entity, id: id});
    }

    // helper
    static isReadOnly(path: string, readOnlyInit?: boolean): boolean {
        // if we have a path of length 2 or more, the field is always readOnly
        let readOnly: boolean;
        if (!UtilsCommon.isSingleField(path)) {
            readOnly = true;
        }
        else {
            readOnly = readOnlyInit ?? false;
        }
        return readOnly;
    }

    // temporary function, until TableFormField and its isReadOnly() are used everywhere
    static isReadOnlyTableField(path: string | undefined, readOnly: TableFieldReadOnlyProp | undefined, entityRow: EntityRow | null, tableRow: any): boolean {

        let isReadOnly: boolean;

        if (path && !UtilsCommon.isSingleField(path)) {
            // if the length of field is 2 or more, then readOnly
            isReadOnly = true;
        }
            // formReadOnlyBase is called on the level DetailDataTable and XFormPanelList
            // the reason is (probably) that in DetailDataTable and XFormPanelList we know the assoc name whereas here in component we know only field name
            // (assoc name is param of formReadOnlyBase)
            // else if (this.props.form.formReadOnlyBase("xxx")) {
            //     isReadOnly = true;
        // }
        else if (typeof readOnly === 'boolean') {
            isReadOnly = readOnly;
        }
        else if (typeof readOnly === 'function') {
            // TODO - hard to say whether entityRow === null will ever happen (probably yes, see the method getFilterBase)
            if (entityRow) {
                isReadOnly = readOnly(entityRow, tableRow);
            }
            else {
                isReadOnly = true;
            }
        }
        else {
            // readOnly is undefined
            isReadOnly = false;
        }

        return isReadOnly;
    }

    static markNotNull(label: string): string {
        return label + ' *';
    }

    static showErrorMessage(message: string, e: unknown, entity?: string) {
        let msg = message + UtilsCommon.newLine;
        if (e instanceof ResponseError) {
            if (e.responseErrorBody.exceptionName === 'AppError') {
                // app error from backend, we show only the error message
                msg += e.responseErrorBody.message;
            }
            else if (e.responseErrorBody.exceptionName === 'OptimisticLockVersionMismatchError') {
                // TODO - better error message for optimistic locking (modifDate + modifUser)
                // for now, we add entity to the message if the entity from the OptimisticLockVersionMismatchError is different from the entity beeing saved
                // (it is rare but it can be very confusing)
                let entityParam: string = ""; // default
                if (entity && e.responseErrorBody.message) {
                    const entityFromError: string = Utils.extractEntity(e.responseErrorBody.message);
                    if (entityFromError !== entity) {
                        entityParam = " " + entityFromError;
                    }
                }
                msg += localeOption('optimisticLockFailed', {entity: entityParam});
            }
            else {
                msg += e.message + UtilsCommon.newLine;
                msg += JSON.stringify(e.responseErrorBody, null, 4);
            }
        }
        else if (e instanceof Error) {
            msg += `${e.name}: ${e.message}`;
        }
        else if (typeof e === 'string' || typeof e === 'number') {
            // error of the type: throw 'something'
            msg += e;
        }
        alert(msg);
    }

    private static extractEntity(msg: string): string {
        const match = msg.match(/The optimistic lock on entity ([A-Za-z0-9_]+) failed/);
        return match ? match[1] : "unknown";
    }

    // used mainly for inputs
    static createTooltipOrErrorProps(error: string | undefined, tooltip?: string | undefined): object {
        // error takes precedence, if we do not have an error, we set the tooltip if we have one
        return error ? {className: "p-invalid", tooltip: error, tooltipOptions: { className: 'pink-tooltip', position: 'bottom' }}
                        : (tooltip ? {tooltip: tooltip, tooltipOptions: {position: 'bottom'}} : {});
    }

    // helper method - adds className into props, if className already exists in props it only appends another value
    // we use it because Utils.createErrorProps was overwriting className for us
    static addClassName(props: {[key: string]: any;}, className: string | undefined): {[key: string]: any;} {
        let propsClassName: string = props.className;
        if (className !== undefined) {
            if (propsClassName !== undefined) {
                propsClassName += " " + className;
            }
            else {
                propsClassName = className;
            }
        }
        props.className = propsClassName;
        return props;
    }

    // helper method
    // if there are no errors in fieldErrorMap, it returns ""
    static getErrorMessages(fieldErrorMap: FieldErrorMap): string {
        let msg: string = "";
        for (const [field, fieldError] of Object.entries(fieldErrorMap)) {
            if (fieldError) {
                const errorMessage: string | undefined = Utils.getErrorMessage(fieldError);
                if (errorMessage) {
                    msg += `${fieldError.fieldLabel ?? field}: ${errorMessage}${UtilsCommon.newLine}`;
                }
            }
        }
        return msg;
    }

    static getErrorMessage(fieldError: FieldError): string | undefined {
        if (fieldError.onChange || fieldError.onBlur || fieldError.form) {
            let message: string = '';
            if (fieldError.onChange) {
                message += fieldError.onChange;
            }
            if (fieldError.onBlur) {
                if (message !== '') {
                    message += ' ';
                }
                message += fieldError.onBlur;
            }
            if (fieldError.form) {
                if (message !== '') {
                    message += ' ';
                }
                message += fieldError.form;
            }
            return message;
        }
        return undefined;
    }

    // helper method used (for now only) for autocomplete to ignore upper/lower case and diacritics
    static normalizeString(value: string): string {
        if (value) {
            // removes all kinds of possible diacritics, for us it is important that it changes "ľščťžýáíéúäňô" to "lsctzyaieuano"
            value = value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        }
        return value;
    }

    // helper method
    static evalFilter(filter: FilterOrFunction | undefined): CustomFilter | undefined {
        let customFilter: CustomFilter | undefined = undefined;
        if (typeof filter === 'object') {
            customFilter = filter;
        }
        if (typeof filter === 'function') {
            customFilter = filter();
        }
        return customFilter;
    }

    // helper method
    static isTableRowInserted(tableRow: any): boolean {
        return tableRow.__x_generatedRowId ?? false; // special flag that we generated the id
    }

    // helper method
    static xViewStatus(xViewStatusOrBoolean: ViewStatusOrBoolean): ViewStatus {
        let xViewStatus: ViewStatus;
        if (typeof xViewStatusOrBoolean === "boolean") {
            xViewStatus = xViewStatusOrBoolean ? ViewStatus.ReadWrite : ViewStatus.Hidden;
        }
        else {
            xViewStatus = xViewStatusOrBoolean;
        }
        return xViewStatus;
    }

    // plain string does not work in Dropdown, bug in Primereact?
    static options(valueStringList: string[]): SelectItem[] {
        return valueStringList.map<SelectItem>((valueString: string) => {return {value: valueString, label: valueString};});
    }

    static saveValueIntoStorage(xStorageType: StorageType, key: string, value: any) {
        // value can be also string or null or undefined
        // if we don't have object that can be serialised to json, we create special object
        let valueObject: object;
        if (typeof value === 'object') {
            valueObject = value;
        }
        else if (value === undefined) {
            valueObject = {_xValue: "_undefined_"};
        }
        else {
            // value is null or string or boolean or number or Date...
            valueObject = {_xValue: value};
        }
        if (xStorageType === "session") {
            sessionStorage.setItem(key, UtilsCommon.objectAsJSON(valueObject));
        }
        else if (xStorageType === "local") {
            localStorage.setItem(key, UtilsCommon.objectAsJSON(valueObject));
        }
    }

    static getValueFromStorage(xStorageType: StorageType, key: string, initValue: any): any {
        // if the value is not found in storage, initValue is returned
        let value: any;
        let item: string | null = null;
        if (xStorageType === "session") {
            item = sessionStorage.getItem(key);
        }
        else if (xStorageType === "local") {
            item = localStorage.getItem(key);
        }
        if (item !== null) {
            try {
                const valueObject = JSON.parse(item);
                if ('_xValue' in valueObject) {
                    // we have special object with 1 value
                    value = valueObject._xValue;
                    if (value === "_undefined_") {
                        value = undefined;
                    }
                }
                else {
                    // standard object
                    value = valueObject;
                }
            }
            catch (e) {
                // exception should not happen
                console.log(`Utils.getValueFromStorage: Could not parse/process item from storage "${xStorageType}". key = ${key}, item = ${item}. Error: ${e}`);
                value = initValue;
            }
        }
        else {
            value = initValue;
        }
        return value;
    }

    static removeValueFromStorage(xStorageType: StorageType, key: string) {
        if (xStorageType === "session") {
            sessionStorage.removeItem(key);
        }
        else if (xStorageType === "local") {
            localStorage.removeItem(key);
        }
    }

    static clearStorage(xStorageType: StorageType) {
        if (xStorageType === "session") {
            sessionStorage.clear();
        }
        else if (xStorageType === "local") {
            localStorage.clear();
        }
    }

    // hleper method used for items of LazyDataTable (shortcut ldt)
    // static getValueFromStorageLdt(entity: string, stateKeySuffix: XStateKeySuffix, initValue: any): any {
    //     return Utils.getValueFromStorage(`xldt-state-${entity}-${stateKeySuffix}`, initValue);
    // }

    static reloadIfNewVersion() {
        // to save requests, we check for new version only if 10 minutes (or another time period) are passed from the last check
        // we could use method setInterval (timer) and run check exactly 10 minutes but the disadvantage is that then there will be
        // some processing during idle time and that can exhaust battery on mobile phone (mobile phone will not go to sleeping mode) - is it true?
        const currentTimestamp: number = Date.now(); // Current time
        if (Utils.lastVersionCheckTimestamp === null || currentTimestamp - Utils.lastVersionCheckTimestamp > Utils.VERSION_CHECK_PERIOD) {
            Utils.reloadIfNewVersionNow();
            Utils.lastVersionCheckTimestamp = currentTimestamp;
        }
    }

    static async reloadIfNewVersionNow() {
        if (await Utils.isNewVersion()) {
            alert("New version was released. Application will be restarted.");
            Utils.reload();
        }
    }

    static isLocalhost(): boolean {
        return window.location.hostname === 'localhost';
    }

    static async isNewVersion(): Promise<boolean> {
        // we fetch file index.html and look up the hash "a7e03e2e" in element <script> - example:
        // hash is created during react build and is different for every new version
        // <script defer="defer" src="/static/js/main.a7e03e2e.js">
        try {
            // we don't use Utils.fetchBasic because it creates request to nodejs backend and index.html is provided/located in nginx
            //let response = await fetch("index.html", { method: 'get', mode: 'cors' });
            let response = await fetch("index.html", {method: 'GET', cache: "no-store"});

            let text = await response.text();
            let remoteMainScript: string | null = null;
            let r = /^.*<script.*\/(main.*\.js).*$/gim.exec(text);
            if (r && r.length >= 2) {
                remoteMainScript = r[1];
            }
            if (remoteMainScript === null) {
                if (!Utils.isLocalhost()) {
                    console.log(`Utils.isNewVersion(): Unexpected error - remoteMainScript (e.g. main.9d782ae7.js) not found in index.html from server. Content of index.html:`);
                    console.log(text);
                }
                return false;
            }

            let localMainScript: string | null = null;
            // element script is inside element head
            let scripts = document.head.getElementsByTagName('script');
            for (let script of scripts) {
                let rl = /^.*\/(main.*\.js).*$/gim.exec(script.src);
                if (rl && rl.length >= 2) {
                    localMainScript = rl[1];
                    break;
                }
            }
            if (localMainScript === null) {
                if (!Utils.isLocalhost()) {
                    console.log(`Utils.isNewVersion(): Unexpected error - localMainScript (e.g. main.9d782ae7.js) not found in element <head>...<script src="->here<-"/>...</head>`);
                    console.log(document.head);
                }
                return false;
            }

            return remoteMainScript !== localMainScript;
        } catch (err) {
            console.log(err);
            return false;
        }
    }

    static reload() {
        // data in session may not correspond with new structures in new version
        // e.g. if we add new column to LazyDataTable, filter operator/value for this column new column is missing in data from session and application will crash
        // simple solution is to clear session
        Utils.clearStorage("session");
        Utils.clearStorage("local");
        // page reload (like pressing F5 or Enter on url bar)
        // warning - if user has typed some data in form, the data will be lost
        window.location.reload();
    }

    /**
     * @deprecated returns onSaveOrCancel method used when opening form from browse when using XFormNavigator (deprecated)
     */
    static onSaveOrCancelNavigator(openForm: (newFormElement: ReactElement | null) => void, xLazyDataTableRef: RefObject<LazyDataTableRef>): OnSaveOrCancelProp {
        return (object: any | null, objectChange: OperationType) => {
            // close form and display the previous form (it should be browse)
            openForm(null);
            if (object !== null) {
                // save was pressed, reread from DB
                xLazyDataTableRef.current?.reread();
            }
        }
    }

    // helper
    // static createXFormParam(form?: ComponentType<XFormProps>, formElement?: ReactElement): XFormParam | undefined {
    //     let xFormParam: XFormParam | undefined = undefined;
    //     if (form || formElement) {
    //         xFormParam = {Form: form, formElement};
    //     }
    //     return xFormParam;
    // }

    static getDefaultCreateObject<T>(entity: string): CreateObjectFunction<T> {
        const xEntity: Entity = UtilsMetadataCommon.getEntity(entity);
        const xField: Field = xEntity.fieldMap["version"];
        let entityRow: EntityRow = {};
        if (xField) {
            entityRow = {version: 0};
        }
        return async (params?: Params) => (entityRow as T);
    }

    // from React 19 JSX runtime does not copy function-component defaultProps onto the element.
    // for some child components (columns of LazyDataTable, DetailDataTable) we still use static defaultProps
    // using JavaScript destructuring defaults would be more standard, but it is complicated
    static applyDefaultProps(elementList: ReactElement[]): ReactElement[] {
        return elementList.map(element => {
            const componentType = element.type as { defaultProps?: Record<string, unknown> };
            const defaultProps = componentType?.defaultProps;
            if (defaultProps == null) {
                return element;
            }
            const props: Record<string, unknown> = {...element.props as Record<string, unknown>};
            for (const key of Object.keys(defaultProps)) {
                if (props[key] === undefined) {
                    props[key] = defaultProps[key];
                }
            }
            return {...element, props}
        });
    }
}
