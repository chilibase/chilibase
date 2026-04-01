import React from "react";
import {DateInput} from "./DateInput";
import {ValueField, ValueFieldProps} from "../form/ValueField";
import {dateFromModel, DateScale} from "../../common/UtilsConversions";

export interface DateFieldProps extends ValueFieldProps {
    scale?: DateScale;
}

export class DateField extends ValueField<DateFieldProps> {

    constructor(props: DateFieldProps) {
        super(props);

        this.onValueChange = this.onValueChange.bind(this);
    }

    getValue(): Date | null {
        const value: Date | null = dateFromModel(this.getValueFromObject());
        return value;
    }

    onValueChange(value: Date | null) {
        // z XCalendar prichadza value - typ Date alebo null
        this.onValueChangeBase(value, this.props.onChange);
    }

    render() {
        return (
            <div className="field grid">
                <label htmlFor={this.props.field} className="col-fixed" style={this.getLabelStyle()}>{this.getLabel()}</label>
                <DateInput id={this.props.field} value={this.getValue()} onChange={this.onValueChange} readOnly={this.isReadOnly()} error={this.getError()}
                           scale={this.props.scale ?? this.xField.scale} datetime={this.xField.type === 'datetime'}/>
            </div>
        );
    }
}
