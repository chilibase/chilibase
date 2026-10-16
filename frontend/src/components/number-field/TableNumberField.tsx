import React from "react";
import {InputNumber} from "primereact/inputnumber";
import {UtilsMetadata} from "../../utils/UtilsMetadata";
import {TableValueField, type TableValueFieldProps} from "../detail-data-table/TableValueField";
import {Utils} from "../../utils/Utils";

export interface TableNumberFieldProps extends TableValueFieldProps {
}

export class TableNumberField extends TableValueField<TableNumberFieldProps> {

    constructor(props: TableNumberFieldProps) {
        super(props);

        this.onValueChange = this.onValueChange.bind(this);
        this.onBlur = this.onBlur.bind(this);
    }

    getValue(): number | undefined {
        let value: number | undefined = undefined;
        const rowDataValue: string | number | null = this.getValueFromRowData();
        // here a hack for now, a number should arrive
        if (typeof rowDataValue === 'string') {
            value = parseFloat(rowDataValue);
        }
        else if (typeof rowDataValue === 'number') {
            value = rowDataValue;
        }
        // value stayed undefined if no if was executed (we convert null -> undefined) - InputNumber requires undefined, it does not want null
        return value;
    }

    onValueChange(e: any) {
        // from InputNumber comes e.value - type number or null
        this.onValueChangeBase(e.value);
    }

    // we do not put it into the input's onChange, because our onChange would be called after every character change
    // if needed, we can still add a method "onChange2", which will be called after every character change (probably only into XInputText)
    onBlur(e: any) {
        this.callOnChangeFromOnBlur();
    }

    render() {
        const {useGrouping, fractionDigits, min, max} = UtilsMetadata.getParamsForInputNumber(this.xField);

        return (
            <InputNumber id={this.props.field} value={this.getValue()} onChange={this.onValueChange} readOnly={this.isReadOnly()} mode="decimal" locale="de-DE"
                         useGrouping={useGrouping} minFractionDigits={fractionDigits} maxFractionDigits={fractionDigits} min={min} max={max}
                         onBlur={this.onBlur} {...Utils.addClassName(Utils.createTooltipOrErrorProps(this.getError()), "x-input-to-resize")}/>
        );
    }
}

