import React from "react";
import {ValueField, ValueFieldProps} from "../form/ValueField";
import {IPostgresInterval} from "../../utils/types";
import {IntervalInput} from "./IntervalInput";

export interface IntervalFieldProps extends ValueFieldProps {
    inputStyle?: React.CSSProperties;
}

export class IntervalField extends ValueField<IntervalFieldProps> {

    constructor(props: IntervalFieldProps) {
        super(props);

        this.onValueChange = this.onValueChange.bind(this);
    }

    getValue(): IPostgresInterval | null {
        return this.getValueFromObject();
    }

    onValueChange(value: IPostgresInterval | null) {
        this.onValueChangeBase(value, this.props.onChange);
    }

    render() {
        return (
            <div className="field grid">
                <label htmlFor={this.props.field} className="col-fixed" style={this.getLabelStyle()}>{this.getLabel()}</label>
                <IntervalInput id={this.props.field} value={this.getValue()} onChange={this.onValueChange}
                                    readOnly={this.isReadOnly()} error={this.getError()} style={this.props.inputStyle} {...this.getClassNameTooltip()}/>
            </div>
        );
    }
}

