import {Component, type CSSProperties} from "react";
import {FormBase} from "./FormBase";
import type {FieldError} from "./FormErrors";
import type {EntityRow} from "../../common/types";
import {UtilsCommon} from "../../common/UtilsCommon";
import {OperationType} from "../../utils/types";
import {Utils} from "../../utils/Utils";
import type {CustomFilter} from "../../common/FindParam";

// event for onChange methods on form components (XInputText, XAutoComplete, ...)
// we use an event so that in the future we can add further attributes into the event if needed
// assocObjectChange - info whether the selected assoc object was changed in the DB (see XAutoCompleteBase)
// TODO - move OperationType here
export interface FieldChangeEvent<ER = EntityRow> {
    entityRow: ER;
    assocObjectChange?: OperationType
}

// type of the method for onChange - I used FieldChangeEvent<any>, when declaring the onChange method on the component
// it is possible thanks to that to use (e: FieldChangeEvent<Dobrovolnik>) and the compiler does not complain. It is a hack, maybe a nicer solution exists
export type FieldOnChange = (e: FieldChangeEvent<any>) => void;

export type ReadOnlyProp = boolean | ((object: any) => boolean);

// type of the property for adding a filter for selecting associable rows - used on assoc fields (XAutoComplete, Dropdown, ...)
// either CustomFilter is written directly into the property or a function is created that returns CustomFilter (in this case CustomFilter can depend on the currently edited object "object")
// we use (for now) a parameter of type any so that on the form we can use a concrete type (or EntityRow)
export type FilterProp = CustomFilter | ((object: any) => CustomFilter | undefined);

export interface FormFieldProps {
    form: FormBase;
    label?: string;
    labelTooltip?: string; // tooltip for label (not implemented for every form component)
    tooltip?: string; // tooltip for input
    placeholder?: string;
    desc?: string; // special prop used as placeholder and tooltip for the label at once (so that we don't have to duplicate label and tooltip) - created for depaul
    readOnly?: ReadOnlyProp;
    labelStyle?: CSSProperties;
    onChange?: FieldOnChange;
    onlyInput?: boolean; // if true, it renders only the input element (it does not render <div className="field grid"> nor the label)
}

export abstract class FormField<P extends FormFieldProps> extends Component<P> {

    private valueChanged: boolean; // flag whether the user changed the value in the input (whether onChange was called); if there was no change, we don't call the application onChange from onBlur
                                    // we had a problem that the application onChange was called even when the user only clicked into the input and left it

    protected constructor(props: P) {
        super(props);

        this.valueChanged = false;

        props.form.addFormField(this);
    }

    // name of the field under which the value is stored into the object form.state.object
    // for simple inputs the field name (props.field), for association inputs the association name (props.assocField)
    // it is also used as the field id for errorMap during validation (form.state.errorMap)
    // must be overridden
    abstract getField(): string;

    // ******** read and write from/into form.state.object ***********

    // reads value from form.state.object
    // can be overridden, but this should work for every component
    getValueFromObject(): any {
        let objectValue: any = null;
        const entityRow: EntityRow | null = this.props.form.state.entityRow;
        if (entityRow !== null) {
            objectValue = UtilsCommon.getValueByPath(entityRow, this.getField());
            //  just to be sure we set it to null, null is the standard
            if (objectValue === undefined) {
                objectValue = null;
            }
        }
        return objectValue;
    }

    // writes value into form.state.object
    onValueChangeBase(value: any, onChange?: FieldOnChange, assocObjectChange?: OperationType) {
        const error: string | undefined = this.validateOnChange(value);
        this.props.form.onFieldChange(this.getField(), value, error, onChange, assocObjectChange);
        this.valueChanged = true;
    }

    // ******** properties (not only) for rendering ***********

    // must be overridden
    abstract isNotNull(): boolean;

    isReadOnly(): boolean {

        let readOnly: boolean;
        // the purpose of formReadOnly is to put the whole form to read only mode,
        // that's why the formReadOnly has higher prio then property this.props.readOnly
        if (this.props.form.formReadOnlyBase(this.getField())) {
            readOnly = true;
        }
        else if (typeof this.props.readOnly === 'boolean') {
            readOnly = this.props.readOnly;
        }
        else if (typeof this.props.readOnly === 'function') {
            // TODO - hard to say whether entityRow === null will ever happen (probably yes, see method getFilterBase)
            const entityRow: EntityRow = this.props.form.state.entityRow;
            if (entityRow) {
                readOnly = this.props.readOnly(this.props.form.getEntityRow());
            }
            else {
                readOnly = true;
            }
        }
        else {
            // readOnly is undefined
            if (!UtilsCommon.isSingleField(this.getField())) {
                // if the length of field is 2 or more, then readOnly
                readOnly = true;
            }
            else {
                // length of field is 1, default readOnly = false
                readOnly = false;
            }
        }

        return readOnly;
    }

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
        Utils.addCssPropIfNotExists(labelStyle, {width: Utils.FIELD_LABEL_WIDTH});
        return labelStyle;
    }

    // *********** validation support ************

    // called after clicking Save
    // returns (field, FieldError) if "field validation" does not pass, if it passes, returns undefined
    validate(): {field: string; fieldError: FieldError} | undefined {
        // TODO - PHILOSOPHICAL QUESTION - call validation even when the field is readOnly (this.isReadOnly() === true)? for now let's say yes...
        const value: any = this.getValueFromObject();
        // not null validation + custom field validation called on onChange
        let errorOnChange: string | undefined = this.validateOnChange(value);
        // custom field validation called on onBlur (focus lost)
        // TODO
        if (errorOnChange) {
            return {field: this.getField(), fieldError: {onChange: errorOnChange, fieldLabel: this.getLabel()}};
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

    /**
     * @deprecated - it is not a nice solution - an error message (string) should be sent into the component and not props (probably like in XAutoComplete)
     */
    getClassNameTooltip(): {} {
        const error = this.getError();
        return error ? {
            className: "p-invalid",
            tooltip: error,
            tooltipOptions: {className: 'pink-tooltip', position: 'bottom'}
        } : {};
    }

    // returns the error message from form.state.errorMap
    getError(): string | undefined {
        const error: FieldError = this.props.form.state.errorMap[this.getField()];
        return error ? Utils.getErrorMessage(error) : undefined;
    }

    callOnChangeFromOnBlur() {
        if (this.valueChanged && this.props.onChange) {
            const entityRow: EntityRow = this.props.form.getEntityRow();
            // the developer in onChange sets attributes on entityRow
            this.props.onChange({entityRow: entityRow});
            // we call form.setState({...}) right away, so that the developer doesn't have to do it
            this.props.form.setStateForm();
            this.valueChanged = false; // we reset it to false (we call the next onChange only when the user changes the value)
        }
    }

    // used only for assoc fields
    getFilterBase(filter: FilterProp | undefined): CustomFilter | undefined {
        let customFilter: CustomFilter | undefined = undefined;
        if (typeof filter === 'object') {
            customFilter = filter;
        }
        if (typeof filter === 'function') {
            //const entityRow: EntityRow = this.props.form.getEntityRow();
            const entityRow: EntityRow = this.props.form.state.entityRow;
            // for now we comment it out, so that it is called also for XAutoComplete (there we don't have entityRow available for now
            // (componentDidMount for XAutoComplete is called sooner than componentDidMount for FormBase))
            //if (entityRow) {
                customFilter = filter(entityRow);
            //}
        }
        return customFilter;
    }
}

