import React, {Component} from "react";
import {EntityRow} from "../../common/types";
import {OperationType} from "../../utils/types";
import {Utils} from "../../utils/Utils";
import {FieldOnChange, FormComponent} from "./FormComponent";
import {TableFieldOnChange, FormDataTable, RowTechData} from "../form-data-table";
import {FieldErrorMap, FormErrorMap} from "./FormErrors";
import {Params, UtilsCommon} from "../../common/UtilsCommon";
import {Entity} from "../../common/EntityMetadata";
import {UtilsMetadataCommon} from "../../common/UtilsMetadataCommon";
import {FindRowByIdResponse, UnlockRowRequest} from "../../common/lib-api";
import {dateFromModel, datetimeAsUI} from "../../common/UtilsConversions";
import {xLocaleOption} from "../XLocale";

export type OnSaveOrCancelProp = (entityRow: EntityRow | null, objectChange: OperationType) => void;

// poznamka - v assoc button-e (SearchButton, ToOneAssocButton, FormSearchButtonColumn) je mozne zadat nazov formulara cez property assocForm={<BrandForm/>}
// pri tomto zapise sa nezadava property id (id sa doplni automaticky pri otvoreni assoc formularu cez klonovanie elementu)
// preto umoznujeme aby id mohlo byt undefined
// zombie
export interface FormPropsOld {
    ref?: React.Ref<FormBase>;
    id?: number;
    loaderData?: object; // objekt nacitany cez clientLoader (id by malo byt undefined, initValues je tiez undefined, v buducnosti nahradi id)
    initValues?: object; // pri inserte (id je undefined) mozme cez tuto property poslat do formulara default hodnoty ktore sa nastavia do objektu vytvoreneho v metode this.createNewObject(): EntityRow
    onSaveOrCancel?: OnSaveOrCancelProp; // pouziva sa pri zobrazeni formulara v dialogu (napr. v XAutoCompleteBase) - pri onSave odovzdava updatnuty/insertnuty objekt, pri onCancel odovzdava null,
                                            // pouziva sa aj pri navrate do browsu - v tejto metode sa zavola reread browsu
    isInDialog?: boolean; // flag, if form is opened in Dialog (usually true)
}

export interface FormProps {
    ref?: React.Ref<FormBase>;
    entityRow?: EntityRow; // entityRow(row) created/loaded using methods createObject(id undefined)/loadObject (id exists)
                    // "?" is DEPRECATED - if entityRow is undefined then entityRow is loaded in componentDidMount - legacy way of loading
    id?: number; // DEPRECATED - used only if entityRow is undefined (legacy way of loading)
    initValues?: object; // DEPRECATED - used to init entityRow by insert in case of legacy object loading - could/will be replaced with params/entityRow
    onSaveOrCancel?: OnSaveOrCancelProp; // pouziva sa pri zobrazeni formulara v dialogu (napr. v XAutoCompleteBase) - pri onSave odovzdava updatnuty/insertnuty objekt, pri onCancel odovzdava null,
    // pouziva sa aj pri navrate do browsu - v tejto metode sa zavola reread browsu
    isInDialog?: boolean; // flag, if form is opened in Dialog (usually true) - really needed here?
    params?: Params;
}

export interface FormWithLoaderProps {
    formBaseRef?: React.Ref<FormBase>; // forwarded to FormProps
    id: number | undefined; // for id === undefined we do insert, for id !== undefined we do update
    initValues?: object; // DEPRECATED (forwarded to FormProps)
    onSaveOrCancel?: OnSaveOrCancelProp; // forwarded to FormProps
    isInDialog?: boolean; // flag, if form is opened in Dialog (usually true), (forwarded to FormProps)
    params?: Params; // various params used in methods createObject/loadObject, (forwarded to FormProps)
}

// type for Form param - either Form is used (Form={CarForm}) or formElement is used (formElement={<CarForm/>})
// if both are undefined or both are defined - invalid state
// export interface FormParam {
//     Form?: React.ComponentType<FormProps>;
//     formElement?: React.ReactElement;
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


// class decorator ktory nastavuje property entity (dalo by sa to nastavovat v konstruktore ale decorator je menej ukecany)
// ma sa pouzivat len na triedach odvodenych od FormBase - obmedzenie som vsak nevedel nakodit
// property sa nastavi az po zbehnuti konstruktora
// pozor - decorator je vykopirovany do projektoveho suboru XLibItems.ts, lebo ked je umiestneny tu tak nefunguje pre class-y v projekte!
export function Form(entity: string, pessimisticLocking?: boolean) {
    // sem (mozno) moze prist registracia formu-u
    return function <T extends { new(...args: any[]): {} }>(constructor: T) {
        return class extends constructor {
            entity = entity;
            pessimisticLocking = pessimisticLocking ?? false;
        }
    }
}

export abstract class FormBase extends Component<FormProps> {

    entity?: string; // typ objektu, napr. Car, pouziva sa pri citani objektu z DB
    xEntity: Entity | undefined; // zistene podla this.entity

    formDataChanged: boolean; // true if user changed some attribute of the form - used (only) to create confirm if user clicks cancel

    pessimisticLocking?: boolean; // true if the form uses pessimistic locking (default is optimistic locking if the attribute "version" is available)
    rowLocked: boolean; // used by pessimistic locking, true if row was successfully locked
    readOnly: boolean; // used if the lock was not acquired (other user holds the lock)

    fieldSet: Set<string>; // zoznam zobrazovanych fieldov (vcetne asoc. objektov) - potrebujeme koli nacitavaniu root objektu
    state: {entityRow: EntityRow | null; errorMap: FieldErrorMap} | any; // poznamka: mohli by sme sem dat aj typ any...
    // poznamka 2: " | any" sme pridali aby sme mohli do state zapisovat aj neperzistentne atributy typu "this.state.passwordNew"

    formComponentList: Array<FormComponent<any>>; // zoznam jednoduchych komponentov na formulari (vcetne Dropdown, SearchButton, ...)
    formDataTableList: Array<FormDataTable>; // zoznam detailovych tabuliek (obsahuju zoznam dalsich komponentov)
    assocToValidateList: Array<string>; // zoznam oneToMany asociacii, pre ktore sa zavola spracovanie vysledku validacie ktory je ulozny v rowTechData (pouzivane pre specialnu custom validaciu)
    assocToSortList: Array<{assoc: string; sortField: string;}>; // zoznam oneToMany asociacii, ktore po nacitani z DB zosortujeme podla daneho fieldu (zvycajne id)

    // special flag - application can set this flag if the form uses component TabView
    // as a result, the width of components XFormScrollable and FormDataTable will be proper adjusted (the margin of TabPanel will be subtracted from 100vw)
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
        //this.entity = props.entity; - nastavuje sa cez decorator @Form
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
        this.formComponentList = [];
        this.formDataTableList = [];
        this.assocToValidateList = [];
        this.assocToSortList = [];
        this.tabViewUsed = false; // default
        this.onClickSave = this.onClickSave.bind(this);
        this.onClickCancel = this.onClickCancel.bind(this);
    }

    async componentDidMount() {
        //console.log("volany FormBase.componentDidMount()");
        // old code not used since not using @Form decorator
        // kontrola (musi byt tu, v konstruktore este property nie je nastavena)
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
                //console.log('FormBase.componentDidMount ide nacitat objekt');
                //console.log(this.fields);
                //entityRow = await Utils.fetchByIdFieldList(this.entity, Array.from(this.fieldSet), this.props.id);
                entityRow = await this.loadObjectLegacy(this.props.id);
                operationType = OperationType.Update;

                // sortovanie, aby sme nemuseli sortovat v DB (neviem co je efektivnejsie)
                for (const assocToSort of this.assocToSortList) {
                    const assocRowList: any[] = entityRow[assocToSort.assoc];
                    if (assocRowList) {
                        entityRow[assocToSort.assoc] = UtilsCommon.arraySort(assocRowList, assocToSort.sortField);
                    }
                }

                //console.log('FormBase.componentDidMount nacital objekt:');
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
                // pridame pripadne "init values", ktore pridu cez prop object (pouziva sa napr. pri insertovani cez XAutoComplete na predplnenie hodnoty)
                if (this.props.initValues !== undefined) {
                    entityRow = {...entityRow, ...this.props.initValues}; // values from this.props.initValues will override values from entityRow (if key is the same)
                }
                operationType = OperationType.Insert;
            }

            this.preInitForm(entityRow, operationType);
            //console.log("volany FormBase.componentDidMount() - ideme setnut entityRow");
            this.setState({entityRow: entityRow}/*, () => console.log("************** volany FormBase.componentDidMount() - callback setState")*/);
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
        // povodny kod (este legacy object load)
        //return this.props.id === undefined;
        // aby sme mohli zmenit insert na update (napr. ak po kontrole id fieldov zistime ze zaznam existuje), tak zistujeme id-cko z this.state.entityRow
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

        // field moze byt aj na asociovanom objekte (field length > 1, napr.: <assocX>.<fieldY>)
        // v takom pripade sa do errorMap zapise ako key cely field <assocX>.<fieldY>
        // (zlozitejsie riesenie by bolo zapisovat errors do specialneho technickeho atributu asociovaneho objektu ale zatial to nechame takto jednoducho)

        const entityRow: EntityRow = this.getEntityRow();
        UtilsCommon.setValueByPath(entityRow, field, value);

        const errorMap: FieldErrorMap = this.state.errorMap;
        errorMap[field] = {...errorMap[field], onChange: error};

        // tu zavolame onChange komponentu - entityRow uz ma zapisanu zmenenu hodnotu, onChange nasledne zmeni dalsie hodnoty a nasledne sa zavola setState
        if (onChange) {
            onChange({entityRow: entityRow, assocObjectChange: assocObjectChange});
        }

        this.setState({entityRow: entityRow, errorMap: errorMap});

        this.setFormDataChanged(true);
    }

    onTableFieldChange(rowData: any, field: string, value: any, error?: string | undefined, onChange?: TableFieldOnChange, assocObjectChange?: OperationType) {

        const entityRow: EntityRow = this.getEntityRow();
        rowData[field] = value;

        // nastavime error do rowData do tech fieldu
        const errorMap: FieldErrorMap = FormBase.getRowTechData(rowData).errorMap;
        errorMap[field] = {...errorMap[field], onChange: error};

        // tu zavolame onChange komponentu - entityRow uz ma zapisanu zmenenu hodnotu, onChange nasledne zmeni dalsie hodnoty a nasledne sa zavola setState
        if (onChange) {
            onChange({entityRow: entityRow, tableRow: rowData, assocObjectChange: assocObjectChange});
        }

        this.setState({entityRow: entityRow/*, errorMap: errorMap*/});

        this.setFormDataChanged(true);
    }

    /**
     * @deprecated - mal by sa pouzivat onTableFieldChange
     */
    onObjectDataChange(row?: any, onChange?: TableFieldOnChange) {
        const entityRow: EntityRow | null = this.state.entityRow;

        // tu zavolame onChange komponentu - entityRow uz ma zapisanu zmenenu hodnotu, onChange nasledne zmeni dalsie hodnoty a nasledne sa zavola setState
        if (onChange) {
            // TODO - assocObjectChange dorobit
            onChange({entityRow: entityRow, tableRow: row, assocObjectChange: undefined});
        }

        this.setState({entityRow: entityRow});
    }

    // lepsi nazov ako onObjectDataChange
    // ak niekto zmenil this.state.entityRow alebo this.state.errorMap, zmena sa prejavi vo formulari
    // pouzivame napr. po zavolani onChange na XInputText
    // callback je zavolany, ked dobehne update formulara (mozme pouzit na dalsi update formulara, ktory potrebuje aby boli vsetky komponenty vytvorene)
    setStateForm(callback?: () => void) {
        // TODO - je to ok ze entityRow menime takto?
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
        // ak vieme id-cko a id-cko nie je vyplnene, tak ho vygenerujeme (predpokladame ze id-cko je vzdy number)
        // id-cka potrebujeme, lebo by nam bez nich nekorektne fungovala tabulka
        // asi cistejsie by bolo citat id-cka zo sekvencie z DB, ale MySql nema sekvencie na styl Oracle
        if (dataKey !== undefined) {
            const newRowId = newRow[dataKey];
            if (newRowId === undefined || newRowId === null) {
                newRow[dataKey] = FormBase.getNextRowId(rowList, dataKey);
                newRow.__x_generatedRowId = true; // specialny priznak, ze sme vygenerovali id-cko - pred insertom do DB toto id-cko vynullujeme aby sa vygenerovalo realne id-cko
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
            rowList.push(newRow); // na koniec
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
        // poznamka: indexOf pri vyhladavani pouziva strict equality (===), 2 objekty su rovnake len ak porovnavame 2 smerniky na totozny objekt
        const index = rowList.indexOf(row);
        if (index === -1) {
            throw "Unexpected error - element 'row' not found in 'rowList'";
        }
        rowList.splice(index, 1);

        this.setState({entityRow: entityRow});

        this.setFormDataChanged(true);
    }

    static getRowTechData(row: any): RowTechData {
        // ak este nemame rowTechData, tak ho vytvorime
        if (row.__x_rowTechData === undefined) {
            // field '__x_rowTechData' vytvorime takymto specialnym sposobom, aby mal "enumerable: false", tympadom ho JSON.stringify nezaserializuje
            // pri posielani objektu formulara na backend (pozor, zaroven sa neda tento field iterovat cez in operator a pod.)
            const rowTechData: RowTechData = {formComponentDTList: [], errorMap: {}};
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

    addFormComponent(formComponent: FormComponent<any>) {
        this.formComponentList.push(formComponent);
    }

    findFormComponent(field: string): FormComponent<any> | undefined {
        // TODO - vytvorit mapu (field, ref(formComponent)), bude to rychlejsie
        // vytvorit len mapu (a list zrusit) je problem - mozme mat pre jeden field viacero (napr. asociacnych) componentov
        for (const formComponent of this.formComponentList) {
            if (formComponent.getField() === field) {
                return formComponent;
            }
        }
        return undefined;
    }

    addFormDataTable(formDataTable: FormDataTable) {
        this.formDataTableList.push(formDataTable);
    }

    addAssocToValidate(oneToManyAssoc: string) {
        this.assocToValidateList.push(oneToManyAssoc);
    }

    addAssocToSort(oneToManyAssoc: string, sortField: string) {
        this.assocToSortList.push({assoc: oneToManyAssoc, sortField: sortField});
    }

    formReadOnlyBase(field: string): boolean {
        // TODO - bude this.state.entityRow vzdycky !== undefined?
        return this.formReadOnly(this.state.entityRow, field);
    }

    async onClickSave() {

        if (!await this.validateSave()) {
            return;
        }

        // docasne na testovanie
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
            Utils.showErrorMessage("Save row failed.", e);
            return; // zostavame vo formulari
        }

        if (this.props.onSaveOrCancel !== undefined) {
            // formular je zobrazeny v dialogu
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
        // standardny rezim
        // openForm pridavame automaticky v FormNavigator pri renderovani komponentu
        // null - vrati sa do predchadzajuceho formularu, z ktoreho bol otvoreny
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
            if (!window.confirm(xLocaleOption('cancelEditConfirm'))) {
                return false; // stops canceling editing, the form stays open (because this.props.onSaveOrCancel is not called)
            }
        }

        this.unlockRow();

        if (this.props.onSaveOrCancel !== undefined) {
            this.props.onSaveOrCancel(null, OperationType.None); // formular je zobrazeny v dialogu
        }
        else {
            this.openFormNull();
        }

        return true;
    }

    async validateSave(): Promise<boolean> {

        const fieldErrorMap: FieldErrorMap = await this.validateForm();

        // zatial takto jednoducho
        let msg: string = Utils.getErrorMessages(fieldErrorMap);

        // este spracujeme editovatelne tabulky
        for (const formDataTable of this.formDataTableList) {
            //msg += formDataTable.getErrorMessages();
            msg += this.getErrorMessagesForAssoc(formDataTable.props.assocField);
        }

        // este spracujeme oneToMany asociacie, ktore boli explicitne uvedene, ze ich treba validovat
        // (validaciu treba nakodit vo formulari, zavolat z metody validate() a ukoncit zavolanim FormBase.saveErrorsIntoRowTechData)
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
                // skusime zistit label
                const formComponent: FormComponent<any> | undefined = this.findFormComponent(field);
                const fieldLabel: string | undefined = formComponent ? formComponent.getLabel() : undefined;
                fieldErrorMap[field] = {...fieldErrorMap[field], form: error, fieldLabel: fieldLabel};
            }
        }

        // TODO - optimalizacia - netreba setovat stav ak by sme sli prec z formulara (ak by zbehla validacia aj save a isli by sme naspet do browsu)
        // setujeme aj this.state.entityRow, lebo mohli pribudnut/odbudnut chyby na rowData v editovatelnych tabulkach
        this.setState({entityRow: this.state.entityRow, errorMap: fieldErrorMap});
        return fieldErrorMap;
    }

    fieldValidation(): FieldErrorMap {
        const fieldErrorMap: FieldErrorMap = {};
        for (const formComponent of this.formComponentList) {
            const errorItem = formComponent.validate();
            if (errorItem) {
                //console.log("Mame field = " + errorItem.field);
                fieldErrorMap[errorItem.field] = errorItem.fieldError;
            }
        }
        for (const formDataTable of this.formDataTableList) {
            formDataTable.validate();
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
                if (window.confirm(xLocaleOption('pessimisticLockNotAcquired', {lockUser: object.lockUser?.name, lockDate: datetimeAsUI(dateFromModel(object.lockDate))}))) {
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

    // this method can be overriden in subclass if needed (to use another service then default 'saveRow')
    async saveRow(): Promise<any> {
        return Utils.fetch('saveRow', {entity: this.getEntity(), object: this.state.entityRow, reload: this.props.onSaveOrCancel !== undefined});
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

