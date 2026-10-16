import React from "react";
import {InputNumber} from "primereact/inputnumber";
import {UtilsMetadata} from "../../utils/UtilsMetadata";
import {ValueField, type ValueFieldProps} from "../form/ValueField";

export interface NumberFieldProps extends ValueFieldProps {
    size?: number;
}

export class NumberField extends ValueField<NumberFieldProps> {

    constructor(props: NumberFieldProps) {
        super(props);

        this.onValueChange = this.onValueChange.bind(this);
        this.onBlur = this.onBlur.bind(this);
    }

    getValue(): number | undefined {
        let value: number | undefined = undefined;
        const objectValue: string | number | null = this.getValueFromObject();
        // here a hack for now, a number should arrive
        if (typeof objectValue === 'string') {
            value = parseFloat(objectValue);
        }
        else if (typeof objectValue === 'number') {
            value = objectValue;
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
        const {useGrouping, fractionDigits, min, max, size} = UtilsMetadata.getParamsForInputNumber(this.xField);
        const sizeInput = this.props.size ?? size;

        // note: style overrides size (width of the input according to character count)
        const label: string | undefined = this.getLabel();
        return (
            <div className="field grid">
                {label !== undefined ? <label htmlFor={this.props.field} className="col-fixed" style={this.getLabelStyle()}>{label}</label> : null}
                <InputNumber id={this.props.field} value={this.getValue()} onChange={this.onValueChange} readOnly={this.isReadOnly()} mode="decimal" locale="de-DE"
                             useGrouping={useGrouping} minFractionDigits={fractionDigits} maxFractionDigits={fractionDigits} min={min} max={max}
                             size={sizeInput} inputStyle={this.props.inputStyle} {...this.getClassNameTooltip()} onBlur={this.onBlur}/>
            </div>
        );
    }
}

