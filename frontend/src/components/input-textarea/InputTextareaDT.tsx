import React from "react";
import {TableValueField, TableValueFieldProps} from "../form-data-table/TableValueField";
import {InputTextareaBase} from "./InputTextareaBase";

export interface InputTextareaDTProps extends TableValueFieldProps {
    rows: number;
    autoResize?: boolean;
}

export class InputTextareaDT extends TableValueField<InputTextareaDTProps> {

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

