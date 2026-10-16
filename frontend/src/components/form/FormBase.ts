import {Component, type Ref, type ComponentType} from "react";
import type {EntityRow} from "../../common/types";
import {OperationType} from "../../utils/types";
import {Utils} from "../../utils/Utils";
import {type FieldOnChange, FormField} from "./FormField";
import type {TableFieldOnChange, DetailDataTable, RowTechData} from "../detail-data-table";
import type {FieldErrorMap, FormErrorMap} from "./FormErrors";
import {type Params, UtilsCommon} from "../../common/UtilsCommon";
import type {Entity} from "../../common/EntityMetadata";
import {UtilsMetadataCommon} from "../../common/UtilsMetadataCommon";
import type {FindRowByIdResponse, UnlockRowRequest} from "../../common/lib-api";
import {dateFromModel, datetimeAsUI} from "../../common/UtilsConversions";
import {localeOption} from "../locale/Locale";

export type OnSaveOrCancelProp = (entityRow: EntityRow | null, objectChange: OperationType) => void;

// note - in the assoc button (SearchButton, ToOneAssocButton, SearchButtonColumn) it is possible to set the form name via property assocForm={<BrandForm/>}
// with this notation property id is not set (id is filled in automatically when opening the assoc form via cloning the element)
// that's why we allow id to be undefined
// zombie
export interface FormPropsOld {
    ref?: Ref<FormBase>;
    id?: number;
    loaderData?: object; // object loaded via clientLoader (id should be undefined, initValues is also undefined, in the future it will replace id)
    initValues?: object; // on insert (id is undefined) we can send default values into the form via this property, which are set into the object created in the method this.createNewObject(): EntityRow
    onSaveOrCancel?: OnSaveOrCancelProp; // used when displaying the form in a dialog (e.g. in XAutoCompleteBase) - on onSave it passes the updated/inserted object, on onCancel it passes null,
                                            // it is also used when returning to the browse - in this method reread of the browse is called
    isInDialog?: boolean; // flag, if form is opened in Dialog (usually true)
}

export interface FormProps {
    ref?: Ref<FormBase>;
    entityRow?: EntityRow; // entityRow(row) created/loaded using methods createObject(id undefined)/loadObject (id exists)
                    // "?" is DEPRECATED - if entityRow is undefined then entityRow is loaded in componentDidMount - legacy way of loading
    id?: number; // DEPRECATED - used only if entityRow is undefined (legacy way of loading)
    initValues?: object; // DEPRECATED - used to init entityRow by insert in case of legacy object loading - could/will be replaced with params/entityRow
    onSaveOrCancel?: OnSaveOrCancelProp; // used when displaying the form in a dialog (e.g. in XAutoCompleteBase) - on onSave it passes the updated/inserted object, on onCancel it passes null,
    // it is also used when returning to the browse - in this method reread of the browse is called
    isInDialog?: boolean; // flag, if form is opened in Dialog (usually true) - really needed here?
    params?: Params;
}

export interface FormWithLoaderProps {
    formBaseRef?: Ref<FormBase>; // forwarded to FormProps
    id: number | undefined; // for id === undefined we do insert, for id !== undefined we do update
    initValues?: object; // DEPRECATED (forwarded to FormProps)
    onSaveOrCancel?: OnSaveOrCancelProp; // forwarded to FormProps
    isInDialog?: boolean; // flag, if form is opened in Dialog (usually true), (forwarded to FormProps)
    params?: Params; // various params used in methods createObject/loadObject, (forwarded to FormProps)
}

// type for Form param - either Form is used (Form={CarForm}) or formElement is used (formElement={<CarForm/>})
// if both are undefined or both are defined - invalid state
// export interface FormParam {
//     Form?: ComponentType<FormProps>;
//     formElement?: ReactElement;
// }

// ********** types of static methods used on forms to load objects *********

// type used for method createObject (used by insert)
export type CreateObjectFunction<T> = (params?: Params) => Promise<T>;

// type used for method assocList (used by update, simple alternative to loadObject)
export type AssocListFunction = (params?: Params) => string[];

// type used for method fieldList (used by update, simple alternative to loadObject)
// reserved for future use if needed (if we want to list exact fields to load (to avoid overfetching), now the method assocList should be enough)
//export type FieldListFunction = (params?: XParams) => string[];

// type used for method loadObject (used by update)
export type LoadObjectFunction<T> = (id: number, params?: Params) => Promise<T>;


// class decorator that sets property entity (it could be set in the constructor but the decorator is less verbose)
// it should be used only on classes derived from FormBase - I was not able to code that restriction though
// the property is set only after the constructor has run
// warning - the decorator is copied into the project file XLibItems.ts, because when it is placed here it does not work for classes in the project!
export function Form(entity: string, pessimisticLocking?: boolean) {
    // registration of the form can (maybe) come here
    return function <T extends { new(...args: any[]): {} }>(constructor: T) {
        return class extends constructor {
            entity = entity;
            pessimisticLocking = pessimisticLocking ?? false;
        }
    }
}

export abstract class FormBase extends Component<FormProps> {

    entity?: string; // type of the object, e.g. Car, used when reading the object from the DB
    xEntity: Entity | undefined; // found according to this.entity

    formDataChanged: boolean; // true if user changed some attribute of the form - used (only) to create confirm if user clicks cancel

    pessimisticLocking?: boolean; // true if the form uses pessimistic locking (default is optimistic locking if the attribute "version" is available)
    rowLocked: boolean; // used by pessimistic locking, true if row was successfully locked
    readOnly: boolean; // used if the lock was not acquired (other user holds the lock)

    fieldSet: Set<string>; // list of displayed fields (including assoc. objects) - we need it for loading the root object
    state: {entityRow: EntityRow | null; errorMap: FieldErrorMap} | any; // note: we could also put type any here...
    // note 2: we added " | any" so that we can also write non-persistent attributes of the type "this.state.passwordNew" into state

    formFieldList: Array<FormField<any>>; // list of simple components on the form (including Dropdown, SearchButton, ...)
    detailDataTableList: Array<DetailDataTable>; // list of detail tables (they contain a list of further components)
    assocToValidateList: Array<string>; // list of oneToMany associations for which processing of the validation result stored in rowTechData is called (used for special custom validation)
    assocToSortList: Array<{assoc: string; sortField: string;}>; // list of oneToMany associations that we sort by the given field after loading from the DB (usually id)

    // special flag - application can set this flag if the form uses component TabView
    // as a result, the width of components XFormScrollable and DetailDataTable will be proper adjusted (the margin of TabPanel will be subtracted from 100vw)
    // (it is important for mobile display)
    tabViewUsed: boolean;

    // special flag - in the future - legacy object loading (using componentDidMount) is supposed to be removed
    legacyObjectLoading: boolean;

    // param entity can be used to set this.entity (another option is decorator @Form)
    constructor(props: FormProps, entity?: string, pessimisticLocking?: boolean) {
        super(props);
        this.legacyObjectLoading = (props.entityRow === undefined);
        // check (legacy object load)
        if (this.legacyObjectLoading) {
            if (props.id !== undefined && props.initValues !== undefined) {
                throw "Form cannot have both props id and initValues defined. Only one of them can be defined.";
            }
        }
        // this.entity was originally set by decorator @Form
        // using vite I had problem to get decorator to work, so this param entity is another way how to set this.entity
        if (entity) {
            this.entity = entity;
            this.xEntity = UtilsMetadataCommon.getEntity(this.entity);
        }
        //this.entity = props.entity; - it is set via decorator @Form
        // this.pessimisticLocking was originally set by decorator @Form
        this.pessimisticLocking = pessimisticLocking ?? false;
        this.formDataChanged = false; // default
        this.rowLocked = false; // default
        this.readOnly = false; // default
        // let object = null;
        // if (props.id === undefined) {
        //     // add row operation
        //     if (props.object !== undefined) {
        //         object = props.object;
        //     }
        //     else {
        //         object = {}; // empty new object
        //     }
        // }
        this.fieldSet = new Set<string>();
        this.state = {
            entityRow: props.entityRow ?? null, // null is used only for legacy object loading (in componentDidMount)
            errorMap: {}
        };
        this.formFieldList = [];
        this.detailDataTableList = [];
        this.assocToValidateList = [];
        this.assocToSortList = [];
        this.tabViewUsed = false; // default
        this.onClickSave = this.onClickSave.bind(this);
        this.onClickCancel = this.onClickCancel.bind(this);
    }

    async componentDidMount() {
        //console.log("called FormBase.componentDidMount()");
        // old code not used since not using @Form decorator
        // check (must be here, in the constructor the property is not set yet)
        //if (this.entity === undefined || this.pessimisticLocking === undefined) {
        //    throw "FormBase: Property entity is not defined - use decorator @Form.";
        //}
        //if (this.xEntity === undefined) {
        //    // if decorator @Form is not used
        //    this.xEntity = XUtilsMetadataCommon.getXEntity(this.entity);
        //}

        if (!this.legacyObjectLoading) {
            let entityRow: EntityRow = this.state.entityRow;
            const operationType: OperationType.Insert | OperationType.Update = this.isAddRow() ? OperationType.Insert : OperationType.Update;
            // i am not sure if preInitForm (and call in componentDidMount is needed) but unlike legacy version,
            // developer has to call this.setState({entityRow: entityRow}); if changes in this.entityRow have been made and shoud be rendered in form)
            // HINT - maybe this could be made by some other ways (methods)
            this.preInitForm(entityRow, operationType);
        }
        else {
            // legacy version (this.state.entityRow === null, clientLoader not used)
            let entityRow: EntityRow;
            let operationType: OperationType.Insert | OperationType.Update;
            if (this.props.id !== undefined) {
                //console.log('FormBase.componentDidMount is going to load the object');
                //console.log(this.fields);
                //entityRow = await Utils.fetchByIdFieldList(this.entity, Array.from(this.fieldSet), this.props.id);
                entityRow = await this.loadObjectLegacy(this.props.id);
                operationType = OperationType.Update;

                // sorting, so that we don't have to sort in the DB (I don't know which is more efficient)
                for (const assocToSort of this.assocToSortList) {
                    const assocRowList: any[] = entityRow[assocToSort.assoc];
                    if (assocRowList) {
                        entityRow[assocToSort.assoc] = UtilsCommon.arraySort(assocRowList, assocToSort.sortField);
                    }
                }

                //console.log('FormBase.componentDidMount loaded the object:');
                //console.log(entityRow);
                // const price = (entityRow as any).price;
                // console.log(typeof price);
                // console.log(price);
                // const date = (entityRow as any).carDate;
                // console.log(typeof date);
                // console.log(date);
            }
            else {
                // add new row
                entityRow = this.createNewObject();
                // if entityRow is {} then call async version
                if (Object.keys(entityRow).length === 0) {
                    entityRow = await this.createNewObjectAsync();
                }
                // we add possible "init values" that come via prop object (used e.g. when inserting via XAutoComplete to prefill a value)
                if (this.props.initValues !== undefined) {
                    entityRow = {...entityRow, ...this.props.initValues}; // values from this.props.initValues will override values from entityRow (if key is the same)
                }
                operationType = OperationType.Insert;
            }

            this.preInitForm(entityRow, operationType);
            //console.log("called FormBase.componentDidMount() - we are going to set entityRow");
            this.setState({entityRow: entityRow}/*, () => console.log("************** called FormBase.componentDidMount() - callback setState")*/);
        }
    }

    getEntity(): string {
        if (this.entity === undefined) {
            throw "Entity is undefined";
        }
        return this.entity;
    }

    getEntityRow(): EntityRow {
        if (this.state.entityRow === null) {
            throw "FormBase: this.state.entityRow is null";
        }
        return this.state.entityRow;
    }

    getObject(): any {
        return this.getEntityRow() as any;
    }

    setFormDataChanged(formDataChanged: boolean) {
        this.formDataChanged = formDataChanged;
    }

    getId(): number | undefined {
        let id: number | undefined = undefined;
        if (this.state.entityRow && this.xEntity) {
            id = this.state.entityRow[this.xEntity.idField];
        }
        else {
            // deprecated way of object loading
            if (this.legacyObjectLoading) {
                id = this.props.id;
            }
        }
        return id;
    }

    isAddRow(): boolean {
        // original code (still legacy object load)
        //return this.props.id === undefined;
        // so that we can change insert to update (e.g. if after checking id fields we find that the record exists), we get the id from this.state.entityRow
        return this.getId() === undefined;
    }

    // helper method
    isInDialog(): boolean {
        return this.props.isInDialog ?? false;
    }

    // helper method
    isTabViewUsed(): boolean {
        return this.tabViewUsed;
    }

    setTabViewUsed(tabViewUsed: boolean) {
        this.tabViewUsed = tabViewUsed;
    }

    onFieldChange(field: string, value: any, error?: string | undefined, onChange?: FieldOnChange, assocObjectChange?: OperationType) {

        // the field can also be on an associated object (field length > 1, e.g.: <assocX>.<fieldY>)
        // in that case the whole field <assocX>.<fieldY> is written into errorMap as the key
        // (a more complicated solution would be to write errors into a special technical attribute of the associated object but for now we leave it simply like this)

        const entityRow: EntityRow = this.getEntityRow();
        UtilsCommon.setValueByPath(entityRow, field, value);

        const errorMap: FieldErrorMap = this.state.errorMap;
        errorMap[field] = {...errorMap[field], onChange: error};

        // here we call onChange of the component - entityRow already has the changed value written, onChange then changes further values and then setState is called
        if (onChange) {
            onChange({entityRow: entityRow, assocObjectChange: assocObjectChange});
        }

        this.setState({entityRow: entityRow, errorMap: errorMap});

        this.setFormDataChanged(true);
    }

    onTableFieldChange(rowData: any, field: string, value: any, error?: string | undefined, onChange?: TableFieldOnChange, assocObjectChange?: OperationType) {

        const entityRow: EntityRow = this.getEntityRow();
        rowData[field] = value;

        // we set the error into rowData into the tech field
        const errorMap: FieldErrorMap = FormBase.getRowTechData(rowData).errorMap;
        errorMap[field] = {...errorMap[field], onChange: error};

        // here we call onChange of the component - entityRow already has the changed value written, onChange then changes further values and then setState is called
        if (onChange) {
            onChange({entityRow: entityRow, tableRow: rowData, assocObjectChange: assocObjectChange});
        }

        this.setState({entityRow: entityRow/*, errorMap: errorMap*/});

        this.setFormDataChanged(true);
    }

    /**
     * @deprecated - onTableFieldChange should be used
     */
    onObjectDataChange(row?: any, onChange?: TableFieldOnChange) {
        const entityRow: EntityRow | null = this.state.entityRow;

        // here we call onChange of the component - entityRow already has the changed value written, onChange then changes further values and then setState is called
        if (onChange) {
            // TODO - implement assocObjectChange
            onChange({entityRow: entityRow, tableRow: row, assocObjectChange: undefined});
        }

        this.setState({entityRow: entityRow});
    }

    // a better name than onObjectDataChange
    // if someone changed this.state.entityRow or this.state.errorMap, the change shows up in the form
    // we use it e.g. after calling onChange on XInputText
    // the callback is called when the form update finishes (we can use it for a further form update that needs all components to be created)
    setStateForm(callback?: () => void) {
        // TODO - is it ok that we change entityRow like this?
        this.setState({entityRow: this.state.entityRow, errorMap: this.state.errorMap}, callback);
    }

    /**
     * @deprecated
     */
    setStateXForm(callback?: () => void) {
        this.setStateForm(callback);
    }

    onTableAddRow(assocField: string, newRow: any, dataKey?: string, selectedRow?: {}) {
        const entityRow: EntityRow = this.getEntityRow();
        const rowList: any[] = entityRow[assocField];
        // if we know the id and the id is not filled, we generate it (we assume the id is always a number)
        // we need the ids, because without them the table would not work correctly
        // it would probably be cleaner to read the ids from a sequence in the DB, but MySql does not have sequences in the Oracle style
        if (dataKey !== undefined) {
            const newRowId = newRow[dataKey];
            if (newRowId === undefined || newRowId === null) {
                newRow[dataKey] = FormBase.getNextRowId(rowList, dataKey);
                newRow.__x_generatedRowId = true; // special flag that we generated the id - before insert into the DB we null this id so that a real id is generated
            }
        }
        let index: number | undefined = undefined;
        if (selectedRow !== undefined) {
            const selectedRowIndex = rowList.indexOf(selectedRow);
            if (selectedRowIndex > -1) {
                index = selectedRowIndex + 1;
            }
        }
        if (index !== undefined) {
            rowList.splice(index, 0, newRow);
        }
        else {
            rowList.push(newRow); // to the end
        }
        this.setState({entityRow: entityRow});

        this.setFormDataChanged(true);
    }

    static getNextRowId(rowList: any[], dataKey: string): number {
        let maxId: number = 0;
        for (const row of rowList) {
            const id = row[dataKey];
            if (id > maxId) {
                maxId = id;
            }
        }
        return maxId + 1;
    }

    onTableRemoveRow(assocField: string, row: {}) {
        const entityRow: EntityRow = this.getEntityRow();
        const rowList: any[] = entityRow[assocField];
        // note: indexOf uses strict equality (===) when searching, 2 objects are the same only if we compare 2 pointers to the identical object
        const index = rowList.indexOf(row);
        if (index === -1) {
            throw "Unexpected error - element 'row' not found in 'rowList'";
        }
        rowList.splice(index, 1);

        this.setState({entityRow: entityRow});

        this.setFormDataChanged(true);
    }

    static getRowTechData(row: any): RowTechData {
        // if we don't have rowTechData yet, we create it
        if (row.__x_rowTechData === undefined) {
            // we create the field '__x_rowTechData' in this special way so that it has "enumerable: false", therefore JSON.stringify will not serialize it
            // when sending the form object to the backend (warning, at the same time this field cannot be iterated via the in operator and similar)
            const rowTechData: RowTechData = {tableFormFieldList: [], errorMap: {}};
            Object.defineProperty(row, '__x_rowTechData', {
                value: rowTechData,
                writable: false,
                enumerable: false
            });
        }
        return row.__x_rowTechData;
    }

    addField(field: string) {
        this.fieldSet.add(field);
    }

    addFormField(formField: FormField<any>) {
        this.formFieldList.push(formField);
    }

    findFormField(field: string): FormField<any> | undefined {
        // TODO - create a map (field, ref(formField)), it will be faster
        // creating only a map (and removing the list) is a problem - we can have several (e.g. association) components for one field
        for (const formField of this.formFieldList) {
            if (formField.getField() === field) {
                return formField;
            }
        }
        return undefined;
    }

    addDetailDataTable(detailDataTable: DetailDataTable) {
        this.detailDataTableList.push(detailDataTable);
    }

    addAssocToValidate(oneToManyAssoc: string) {
        this.assocToValidateList.push(oneToManyAssoc);
    }

    addAssocToSort(oneToManyAssoc: string, sortField: string) {
        this.assocToSortList.push({assoc: oneToManyAssoc, sortField: sortField});
    }

    formReadOnlyBase(field: string): boolean {
        // TODO - will this.state.entityRow always be !== undefined?
        return this.formReadOnly(this.state.entityRow, field);
    }

    async onClickSave() {

        if (!await this.validateSave()) {
            return;
        }

        // temporarily for testing
        // const entityRow: T | null = this.state.entityRow;
        // if (entityRow !== null) {
        //     const carDate = entityRow['carDatetime'];
        //     if (carDate !== undefined && carDate !== null) {
        //         //(entityRow as EntityRow)['carDate'] = dateFormat(carDate, 'yyyy-mm-dd');
        //         console.log(dateFormat(carDate, 'yyyy-mm-dd HH:MM:ss'))
        //         console.log(carDate.getHours());
        //         console.log(carDate.getMinutes());
        //         console.log(carDate.getSeconds());
        //     }
        // }

        this.preSave(this.state.entityRow);

        const isAddRow = this.isAddRow();

        //console.log(this.state.entityRow);
        let entityRow: EntityRow;
        try {
            entityRow = await this.saveRow();
        }
        catch (e) {
            Utils.showErrorMessage("Save row failed.", e, this.entity);
            return; // we stay in the form
        }

        if (this.props.onSaveOrCancel !== undefined) {
            // the form is displayed in a dialog
            this.props.onSaveOrCancel(entityRow, isAddRow ? OperationType.Insert : OperationType.Update);
        }
        else {
            this.openFormNull();
        }
    }

    onClickCancel() {
        this.cancelEdit();
    }

    openFormNull() {
        // deprecated functionality used when FormNavigator (deprecated) used
        // standard mode
        // we add openForm automatically in FormNavigator when rendering the component
        // null - returns to the previous form from which it was opened
        if (typeof (this.props as any).openForm === 'function') {
            (this.props as any).openForm(null);
        }
        else {
            // warning
            console.log(`Form has no onSaveOrCancel method declared.`);
        }
    }

    // API function called upon cancel of edit/show of the form
    // also outer components call this function, e.g FormDialog, (legacy XMenu in depaul project)
    // returns false if cancel was stopped (not confirmed) by user
    cancelEdit(): boolean {
        // confirm cancel if data was changed
        if (this.formDataChanged) {
            if (!window.confirm(localeOption('cancelEditConfirm'))) {
                return false; // stops canceling editing, the form stays open (because this.props.onSaveOrCancel is not called)
            }
        }

        this.unlockRow();

        if (this.props.onSaveOrCancel !== undefined) {
            this.props.onSaveOrCancel(null, OperationType.None); // the form is displayed in a dialog
        }
        else {
            this.openFormNull();
        }

        return true;
    }

    async validateSave(): Promise<boolean> {

        const fieldErrorMap: FieldErrorMap = await this.validateForm();

        // for now simply like this
        let msg: string = Utils.getErrorMessages(fieldErrorMap);

        // we also process editable tables
        for (const detailDataTable of this.detailDataTableList) {
            //msg += detailDataTable.getErrorMessages();
            msg += this.getErrorMessagesForAssoc(detailDataTable.props.assocField);
        }

        // we also process oneToMany associations that were explicitly stated as needing to be validated
        // (the validation needs to be coded in the form, called from the method validate() and finished by calling FormBase.saveErrorsIntoRowTechData)
        for (const assocToValidate of this.assocToValidateList) {
            msg += this.getErrorMessagesForAssoc(assocToValidate);
        }

        let ok: boolean = true;
        if (msg !== "") {
            alert(msg);
            ok = false;
        }

        return ok;
    }

    async validateForm(): Promise<FieldErrorMap> {
        const fieldErrorMap: FieldErrorMap = this.fieldValidation();

        // form validation
        const formErrorMap: FormErrorMap = await this.validate(this.getEntityRow());
        for (const [field, error] of Object.entries(formErrorMap)) {
            if (error) {
                // we try to find out the label
                const formField: FormField<any> | undefined = this.findFormField(field);
                const fieldLabel: string | undefined = formField ? formField.getLabel() : undefined;
                fieldErrorMap[field] = {...fieldErrorMap[field], form: error, fieldLabel: fieldLabel};
            }
        }

        // TODO - optimization - no need to set the state if we were leaving the form (if validation and save both passed and we were going back to the browse)
        // we also set this.state.entityRow, because errors on rowData in editable tables may have appeared/disappeared
        this.setState({entityRow: this.state.entityRow, errorMap: fieldErrorMap});
        return fieldErrorMap;
    }

    fieldValidation(): FieldErrorMap {
        const fieldErrorMap: FieldErrorMap = {};
        for (const formField of this.formFieldList) {
            const errorItem = formField.validate();
            if (errorItem) {
                //console.log("We have field = " + errorItem.field);
                fieldErrorMap[errorItem.field] = errorItem.fieldError;
            }
        }
        for (const detailDataTable of this.detailDataTableList) {
            detailDataTable.validate();
        }
        return fieldErrorMap;
    }

    getErrorMessagesForAssoc(oneToManyAssoc: string): string {
        let msg: string = "";
        const entityRow: EntityRow = this.getEntityRow();
        const rowList: any[] = entityRow[oneToManyAssoc];
        if (!Array.isArray(rowList)) {
            throw `Array for the assoc ${oneToManyAssoc} not found in the form object`;
        }
        for (const row of rowList) {
            const rowTechData: RowTechData = FormBase.getRowTechData(row);
            msg += Utils.getErrorMessages(rowTechData.errorMap);
        }
        return msg;
    }

    // can be called from AppForm in case of custom validation on oneToMany assoc
    static saveErrorsIntoRowTechData(row: any, formErrorMap: FormErrorMap) {
        const fieldErrorMap: FieldErrorMap = {};
        for (const [field, error] of Object.entries(formErrorMap)) {
            if (error) {
                fieldErrorMap[field] = {form: error};
            }
        }
        const rowTechData: RowTechData = FormBase.getRowTechData(row);
        rowTechData.errorMap = fieldErrorMap;
    }

    // this method can be overriden in subclass if needed
    // (the purpose is to put the whole form to read only mode (maybe with exception a few fields))
    // if returns true for the param "field", then the field is read only, otherwise the property readOnly of the XInput* is processed
    formReadOnly(entityRow: EntityRow, field: string): boolean {
        return this.readOnly;
    }

    // this method can be overriden in subclass if needed (to set some default values for insert)
    createNewObject(): EntityRow {
        return {};
    }

    // this method can be overriden in subclass if needed (to set some default values for insert)
    // if createNewObject() returns empty object {}, then createNewObjectAsync() is called
    async createNewObjectAsync(): Promise<EntityRow> {
        return {};
    }

    // this method can be overriden in subclass if needed (custom load object)
    // legacy way of loading object
    async loadObjectLegacy(id: number): Promise<EntityRow> {
        // in constructor, member pessimisticLocking is still not set, that's why here we add the "lockUser.name"
        if (this.pessimisticLocking) {
            this.addField("lockUser.name");
        }
        const xFindRowByIdResponse: FindRowByIdResponse = await Utils.fetchByIdWithLock(this.entity!, Array.from(this.fieldSet), id, this.pessimisticLocking!);
        let object: any = xFindRowByIdResponse.row;
        if (this.pessimisticLocking) {
            if (!xFindRowByIdResponse.lockAcquired) {
                if (window.confirm(localeOption('pessimisticLockNotAcquired', {lockUser: object.lockUser?.name, lockDate: datetimeAsUI(dateFromModel(object.lockDate))}))) {
                    // overwrite the lock in DB
                    const xFindRowByIdResponse: FindRowByIdResponse = await Utils.fetchByIdWithLock(this.entity!, Array.from(this.fieldSet), id, this.pessimisticLocking, true);
                    object = xFindRowByIdResponse.row;
                    this.rowLocked = true;
                }
                else {
                    // open form in read only mode
                    this.readOnly = true;
                }
            }
            else {
                this.rowLocked = true;
            }
        }
        return object;
    }

    // this method can be overriden in subclass if needed (to modify/save object after read from DB and before set into the form)
    preInitForm(entityRow: EntityRow, operationType: OperationType.Insert | OperationType.Update) {
    }

    // this method can be overriden in subclass if needed (custom validation)
    async validate(entityRow: EntityRow): Promise<FormErrorMap> {
        return {};
    }

    // this method can be overriden in subclass if needed (to modify object before save)
    preSave(entityRow: EntityRow) {
    }

    // this method can be overriden in subclass if needed (to use another service then default 'x-save-row')
    async saveRow(): Promise<any> {
        return Utils.fetch('x-save-row', {entity: this.getEntity(), object: this.state.entityRow, reload: this.props.onSaveOrCancel !== undefined});
    }

    // this method can be overriden in subclass if needed (custom unlock row)
    async unlockRow() {
        if (this.rowLocked) {
            const xUnlockRowRequest: UnlockRowRequest = {
                entity: this.getEntity(),
                id: this.state.entityRow[this.xEntity!.idField],
                lockDate: this.state.entityRow.lockDate,
                lockUser: this.state.entityRow.lockUser
            };
            await Utils.post('x-unlock-row', xUnlockRowRequest);
            this.rowLocked = false;
        }
    }
}

