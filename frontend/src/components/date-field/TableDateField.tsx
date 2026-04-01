import React from "react";
import {TableValueField, TableValueFieldProps} from "../form-data-table/TableValueField";
import {DateInput} from "./DateInput";
import {dateFromModel} from "../../common/UtilsConversions";

export interface TableDateFieldProps extends TableValueFieldProps {
}

export class TableDateField extends TableValueField<TableDateFieldProps> {

    constructor(props: TableDateFieldProps) {
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
            <DateInput id={this.props.field} value={this.getValue()} onChange={this.onValueChange} readOnly={this.isReadOnly()} error={this.getError()}
                       scale={this.xField.scale} datetime={this.xField.type === 'datetime'}/>
        );
    }
}
