import React from "react";
import {XInputDT, XInputDTProps} from "../XInputDT";
import {InputDateBase} from "./InputDateBase";
import {dateFromModel} from "../../common/XUtilsConversions";

export interface InputDateDTProps extends XInputDTProps {
}

export class InputDateDT extends XInputDT<InputDateDTProps> {

    constructor(props: InputDateDTProps) {
        super(props);

        this.onValueChange = this.onValueChange.bind(this);
    }

    getValue(): Date | null {
        return dateFromModel(this.getValueFromRowData());
    }

    onValueChange(value: Date | null) {
        this.onValueChangeBase(value, this.props.onChange);
    }

    render() {
        return (
            <InputDateBase id={this.props.field} value={this.getValue()} onChange={this.onValueChange} readOnly={this.isReadOnly()} error={this.getError()}
                       scale={this.xField.scale} datetime={this.xField.type === 'datetime'}/>
        );
    }
}

