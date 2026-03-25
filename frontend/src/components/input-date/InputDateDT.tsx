import React from "react";
import {TableValueField, TableValueFieldProps} from "../form-data-table/TableValueField";
import {InputDateBase} from "./InputDateBase";
import {dateFromModel} from "../../common/UtilsConversions";

export interface InputDateDTProps extends TableValueFieldProps {
}

export class InputDateDT extends TableValueField<InputDateDTProps> {

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

