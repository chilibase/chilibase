import React from "react";
import {IntervalInput} from "./IntervalInput";
import {IPostgresInterval} from "../../utils/types";
import {TableValueField, TableValueFieldProps} from "../form-data-table/TableValueField";

export interface TableIntervalFieldProps extends TableValueFieldProps {
}

export class TableIntervalField extends TableValueField<TableIntervalFieldProps> {

    constructor(props: TableIntervalFieldProps) {
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
            <IntervalInput id={this.props.field} value={this.getValue()} onChange={this.onValueChange} readOnly={this.isReadOnly()} error={this.getError()}/>
        );
    }
}

