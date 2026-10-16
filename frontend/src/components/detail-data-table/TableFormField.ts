import {FormBase} from "../form";
import {Component, type CSSProperties} from "react";
import type {EntityRow} from "../../common/types";
import {UtilsCommon} from "../../common/UtilsCommon";
import {OperationType} from "../../utils/types";
import {Utils} from "../../utils/Utils";
import type {FieldError} from "../form/FormErrors";
import type {CustomFilter} from "../../common/FindParam";
import type {TableFieldFilterProp, TableFieldOnChange, TableFieldReadOnlyProp} from "./DetailDataTable";

export interface TableFormFieldProps {
    form: FormBase;
    entity: string;
    rowData: any;
    readOnly?: TableFieldReadOnlyProp;
    onChange?: TableFieldOnChange;
    placeholder?: string; // note: placeholder can also be set via property desc (if we use e.g. XFormPanelList)

    // props used if we create a component with a label (we are not in DetailDataTable, but we use e.g. XFormPanelList)
    label?: string;
    tooltip?: string;
    desc?: string; // special prop used as placeholder and tooltip for the label at once (so that we don't have to duplicate placeholder and tooltip for the label) - created for depaul
    labelStyle?: CSSProperties;
}

export abstract class TableFormField<P extends TableFormFieldProps> extends Component<P> {

    private valueChanged: boolean; // flag whether the user changed the value in the input (see the note in FormField)

    protected constructor(props: P) {
        super(props);

        this.valueChanged = false;

        FormBase.getRowTechData(props.rowData).tableFormFieldList.push(this);
    }

    // name of the field under which the value is stored into the object this.props.rowData
    // for simple inputs the field name (props.field), for association inputs the association name (props.assocField)
    // it is also used as the field id for errorMap during validation (form.state.errorMap) - TODO - sort this out
    // must be overridden
    abstract getField(): string;

    // ******** read and write from/into this.props.rowData ***********

    // reads value from this.props.rowData
    // can be overridden, but this should work for every component
    getValueFromRowData(): any {
        let rowDataValue: any = null;
        // the test for undefined is here because of inserting a new row
        if (this.props.rowData !== undefined && this.props.rowData !== null) {
            rowDataValue = UtilsCommon.getValueByPath(this.props.rowData, this.getField());
            //  just to be sure we set it to null, null is the standard
            if (rowDataValue === undefined) {
                rowDataValue = null;
            }
        }
        return rowDataValue;
    }

    // writes value into form.state.object
    onValueChangeBase(value: any, onChange?: TableFieldOnChange, assocObjectChange?: OperationType) {
        const error: string | undefined = this.validateOnChange(value);
        this.props.form.onTableFieldChange(this.props.rowData, this.getField(), value, error, onChange, assocObjectChange);
        this.valueChanged = true;
    }

    // ******** properties (not only) for rendering ***********

    // must be overridden
    abstract isNotNull(): boolean;

    isReadOnly(): boolean {

        let readOnly: boolean;
        if (!UtilsCommon.isSingleField(this.getField())) {
            // if the length of field is 2 or more, then readOnly
            readOnly = true;
        }
        // formReadOnlyBase is called on the level DetailDataTable and XFormPanelList
        // the reason is (probably) that in DetailDataTable and XFormPanelList we know the assoc name whereas here in component we know only field name
        // (assoc name is param of formReadOnlyBase)
        // else if (this.props.form.formReadOnlyBase("xxx")) {
        //     readOnly = true;
        // }
        else if (typeof this.props.readOnly === 'boolean') {
            readOnly = this.props.readOnly;
        }
        else if (typeof this.props.readOnly === 'function') {
            // TODO - hard to say whether entityRow === null will ever happen (probably yes, see method getFilterBase)
            const entityRow: EntityRow = this.props.form.state.entityRow;
            if (entityRow) {
                readOnly = this.props.readOnly(this.props.form.getEntityRow(), this.props.rowData);
            }
            else {
                readOnly = true;
            }
        }
        else {
            // readOnly is undefined
            readOnly = false;
        }

        return readOnly;
    }

    // *********** label support - used only for non-DT components ************

    // if label is undefined, the label element is not rendered
    getLabel(): string | undefined {
        let label: string | undefined = this.props.label;
        if (label !== undefined) {
            // the readOnly test is here mainly so that we don't have * on the ID attribute, which on insert is generated only when writing to the DB
            if (this.isNotNull() && !this.isReadOnly()) {
                label = Utils.markNotNull(label);
            }
        }
        return label;
    }

    getLabelStyle(): CSSProperties {
        let labelStyle: CSSProperties = this.props.labelStyle ?? {};
        // we don't use this.props.inline, because it is probably a zombie
        Utils.addCssPropIfNotExists(labelStyle, {width: Utils.FIELD_LABEL_WIDTH});
        return labelStyle;
    }

    // *********** validation support ************

    // called after clicking Save
    // returns (field, FieldError) if "field validation" does not pass, if it passes, returns undefined
    validate(): { field: string; fieldError: FieldError } | undefined {
        // TODO - PHILOSOPHICAL QUESTION - call validation even when the field is readOnly (this.isReadOnly() === true)? for now let's say yes...
        const value: any = this.getValueFromRowData();
        // not null validation + custom field validation called on onChange
        let errorOnChange: string | undefined = this.validateOnChange(value);
        // custom field validation called on onBlur (focus lost)
        // TODO - fieldLabel
        if (errorOnChange) {
            return {field: this.getField(), fieldError: {onChange: errorOnChange, fieldLabel: undefined}};
        }
        return undefined;
    }

    validateOnChange(value: any): string | undefined {
        let error: string | undefined = this.validateNotNull(value);
        if (error) {
            return error;
        }
        // custom field validation called on onChange
        // TODO
        return undefined;
    }

    validateNotNull(value: any): string | undefined {
        // validation should match the method getLabel(), where * is added, that's why we also have the test !this.isReadOnly() here - we don't want to test id fields on insert
        // the question is whether not to turn off validation for readOnly fields always (even when e.g. readOnly arises dynamically)
        if (this.isNotNull() && !this.isReadOnly() && value === null) {
            return "Field is required.";
        }
        return undefined;
    }

    // returns the error message from rowData.errorMap
    getError(): string | undefined {
        const error: FieldError = FormBase.getRowTechData(this.props.rowData).errorMap[this.getField()];
        return error ? Utils.getErrorMessage(error) : undefined;
    }

    callOnChangeFromOnBlur() {
        if (this.valueChanged && this.props.onChange) {
            const entityRow: EntityRow = this.props.form.getEntityRow();
            // the developer in onChange sets attributes on entityRow
            this.props.onChange({entityRow: entityRow, tableRow: this.props.rowData, assocObjectChange: undefined});
            // we call form.setState({...}) right away, so that the developer doesn't have to do it
            this.props.form.setStateForm();
            this.valueChanged = false; // we reset it to false (we call the next onChange only when the user changes the value)
        }
    }

    // used only for assoc fields, and not even for all of them
    getFilterBase(filter: TableFieldFilterProp | undefined): CustomFilter | undefined {
        let customFilter: CustomFilter | undefined = undefined;
        if (typeof filter === 'object') {
            customFilter = filter;
        }
        if (typeof filter === 'function') {
            //const entityRow: EntityRow = this.props.form.getEntityRow();
            const entityRow: EntityRow = this.props.form.state.entityRow;
            // for now we comment it out, so that it is called also for XAutoComplete (there we don't have entityRow available for now
            // (componentDidMount for XAutoComplete is called sooner than componentDidMount for XFormBase))
            //if (entityRow) {
            customFilter = filter(entityRow, this.props.rowData);
            //}
        }
        return customFilter;
    }
}

