import React from "react";
import {XInputDT, XInputDTProps} from "../XInputDT";
import {InputTextareaBase} from "./InputTextareaBase";

export interface InputTextareaDTProps extends XInputDTProps {
    rows: number;
    autoResize?: boolean;
}

export class InputTextareaDT extends XInputDT<InputTextareaDTProps> {

    constructor(props: InputTextareaDTProps) {
        super(props);

        this.onValueChange = this.onValueChange.bind(this);
    }

    getValue(): string | null {
        return this.getValueFromRowData();
    }

    onValueChange(value: string | null) {
        this.onValueChangeBase(value, this.props.onChange);
    }

    // pouzivame cols = undefined, sirka je urcena sirkou stlpca (width: 100%)
    render() {
        return (
            <InputTextareaBase id={this.props.field} value={this.getValue()} onChange={this.onValueChange} readOnly={this.isReadOnly()}
                                maxLength={this.xField.length} style={{width: '100%'}} rows={this.props.rows} cols={undefined}
                                autoResize={this.props.autoResize} error={this.getError()}/>
        );
    }
}

