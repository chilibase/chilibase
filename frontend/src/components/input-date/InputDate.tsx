import React from "react";
import {InputDateBase} from "./InputDateBase";
import {XInput, XInputProps} from "../XInput";
import {dateFromModel, XDateScale} from "../../common/XUtilsConversions";

export interface InputDateProps extends XInputProps {
    scale?: XDateScale;
}

export class InputDate extends XInput<InputDateProps> {

    constructor(props: InputDateProps) {
        super(props);

        this.onValueChange = this.onValueChange.bind(this);
    }

    getValue(): Date | null {
        const value: Date | null = dateFromModel(this.getValueFromObject());
        return value;
    }

    onValueChange(value: Date | null) {
        // z XCalendar prichadza value - typ Date alebo null
        this.onValueChangeBase(value, this.props.onChange);
    }

    render() {
        return (
            <div className="field grid">
                <label htmlFor={this.props.field} className="col-fixed" style={this.getLabelStyle()}>{this.getLabel()}</label>
                <InputDateBase id={this.props.field} value={this.getValue()} onChange={this.onValueChange} readOnly={this.isReadOnly()} error={this.getError()}
                           scale={this.props.scale ?? this.xField.scale} datetime={this.xField.type === 'datetime'}/>
            </div>
        );
    }
}

