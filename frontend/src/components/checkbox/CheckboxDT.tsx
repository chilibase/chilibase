import React from "react";
import {XInputDT, XInputDTProps} from "../XInputDT";
import {CheckboxBase} from "./CheckboxBase";

export interface CheckboxDTProps extends XInputDTProps {
}

export class CheckboxDT extends XInputDT<CheckboxDTProps> {

    constructor(props: CheckboxDTProps) {
        super(props);

        this.onValueChange = this.onValueChange.bind(this);
    }

    getValue(): boolean | null {
        return this.getValueFromRowData();
    }

    onValueChange(value: boolean | null) {
        this.onValueChangeBase(value, this.props.onChange);
    }

    render() {
        return (
            <CheckboxBase id={this.props.field} value={this.getValue()} onChange={this.onValueChange}
                           readOnly={this.isReadOnly()} isNotNull={this.isNotNull()}
                           error={this.getError()} style={this.props.inputStyle}/>
        );
    }
}

