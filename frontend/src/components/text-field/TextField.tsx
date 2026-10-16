import React from "react";
import {stringAsUI, stringFromUI} from "../../common/UtilsConversions";
import {InputText as PrimeInputText} from "primereact/inputtext";
import {ValueField, type ValueFieldProps} from "../form/ValueField";
import {Utils} from "../../utils/Utils";
import {Tooltip} from "primereact/tooltip";

export interface TextFieldProps extends ValueFieldProps {
    size?: number;
}

export class TextField extends ValueField<TextFieldProps> {

    constructor(props: TextFieldProps) {
        super(props);

        this.onValueChange = this.onValueChange.bind(this);
        this.onBlur = this.onBlur.bind(this);
    }

    getValue(): string {
        // converting a null value to "" (in the function stringAsUI) is important so that the change to null in the model shows up
        const value: string | null = this.getValueFromObject();
        return stringAsUI(value);
    }

    onValueChange(e: any) {
        const value: string | null = stringFromUI(e.target.value);
        this.onValueChangeBase(value);
    }

    // we do not put it into the input's onChange, because our onChange would be called after every character change
    // if needed, we can still add a method "onChange2", which will be called after every character change (probably only into XInputText)
    onBlur(e: any) {
        this.callOnChangeFromOnBlur();
    }

    render() {

        const label: string | undefined = this.getLabel();
        const value: string | null = this.getValueFromObject(); // we do not use this.getValue(), because this.getValue() returns "" if the value is null

        const {labelTooltip, labelElemId, inputTooltip} = this.getTooltipsAndLabelElemId(
            this.props.field, label, value, this.props.labelTooltip, this.props.tooltip, this.props.desc);

        const size = this.props.size ?? this.xField.length;

        // note: style overrides size (width of the input according to character count)
        return (
            <div className="field grid">
                {label !== undefined ? <label id={labelElemId} htmlFor={this.props.field} className="col-fixed" style={this.getLabelStyle()}>{label}</label> : null}
                {labelTooltip ? <Tooltip target={`#${labelElemId}`} content={labelTooltip}/> : null}
                <PrimeInputText id={this.props.field} value={this.getValue()} onChange={this.onValueChange} onBlur={this.onBlur}
                           readOnly={this.isReadOnly()} maxLength={this.xField.length} size={size} style={this.props.inputStyle}
                           {...Utils.createTooltipOrErrorProps(this.getError(), inputTooltip)} placeholder={this.props.placeholder ?? this.props.desc}/>
            </div>
        );
    }
}
