import React from "react";
import {TableValueField, TableValueFieldProps} from "../form-data-table/TableValueField";
import {CheckboxInput} from "./CheckboxInput";

export interface TableCheckboxFieldProps extends TableValueFieldProps {
}

export class TableCheckboxField extends TableValueField<TableCheckboxFieldProps> {

    constructor(props: TableCheckboxFieldProps) {
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
            <CheckboxInput id={this.props.field} value={this.getValue()} onChange={this.onValueChange}
                           readOnly={this.isReadOnly()} isNotNull={this.isNotNull()}
                           error={this.getError()} style={this.props.inputStyle}/>
        );
    }
}
