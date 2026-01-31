import React from "react";
import {InputNumber} from "primereact/inputnumber";
import {UtilsMetadata} from "../../utils/UtilsMetadata";
import {XInputDT, XInputDTProps} from "../XInputDT";
import {Utils} from "../../utils/Utils";

export interface InputDecimalDTProps extends XInputDTProps {
}

export class InputDecimalDT extends XInputDT<InputDecimalDTProps> {

    constructor(props: InputDecimalDTProps) {
        super(props);

        this.onValueChange = this.onValueChange.bind(this);
        this.onBlur = this.onBlur.bind(this);
    }

    getValue(): number | undefined {
        let value: number | undefined = undefined;
        const rowDataValue: string | number | null = this.getValueFromRowData();
        // tuto zatial hack, mal by prist number
        if (typeof rowDataValue === 'string') {
            value = parseFloat(rowDataValue);
        }
        else if (typeof rowDataValue === 'number') {
            value = rowDataValue;
        }
        // value zostalo undefined ak nebol vykonany ziaden if (konvertujeme null -> undefined) - InputNumber pozaduje undefined, nechce null
        return value;
    }

    onValueChange(e: any) {
        // z InputNumber prichadza e.value - typ number alebo null
        this.onValueChangeBase(e.value);
    }

    // nedame do onChange inputu, lebo by sa nas onChange volal po kazdej zmene pismenka
    // ak bude treba, mozme este dorobit metodu "onChange2", ktora sa bude volat po kazdej zmene pismenka (asi iba do XInputText)
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

