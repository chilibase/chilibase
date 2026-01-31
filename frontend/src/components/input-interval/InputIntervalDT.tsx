import React from "react";
import {InputIntervalBase} from "./InputIntervalBase";
import {IPostgresInterval} from "../../utils/types";
import {XInputDT, XInputDTProps} from "../XInputDT";

export interface InputIntervalDTProps extends XInputDTProps {
}

export class InputIntervalDT extends XInputDT<InputIntervalDTProps> {

    constructor(props: InputIntervalDTProps) {
        super(props);

        this.onValueChange = this.onValueChange.bind(this);
    }

    getValue(): IPostgresInterval | null {
        return this.getValueFromRowData();
    }

    onValueChange(value: IPostgresInterval | null) {
        this.onValueChangeBase(value, this.props.onChange);
    }

    render() {
        return (
            <InputIntervalBase id={this.props.field} value={this.getValue()} onChange={this.onValueChange} readOnly={this.isReadOnly()} error={this.getError()}/>
        );
    }
}

