import React, {type ReactElement} from "react";
import {ValueField, type ValueFieldProps} from "../form/ValueField";
import {CheckboxInput} from "./CheckboxInput";

export interface CheckboxFieldProps extends ValueFieldProps {
    // so that we can display a two-state checkbox even when we have a null column in the DB
    // for now only here, maybe in the future we will put it on all components
    isNotNull?: boolean;
}

export class CheckboxField extends ValueField<CheckboxFieldProps> {

    constructor(props: CheckboxFieldProps) {
        super(props);

        this.onValueChange = this.onValueChange.bind(this);
    }

    isNotNull(): boolean {
        return this.props.isNotNull || super.isNotNull();
    }

    getValue(): boolean | null {
        return this.getValueFromObject();
    }

    onValueChange(value: boolean | null) {
        this.onValueChangeBase(value, this.props.onChange);
    }

    render() {
        let element: ReactElement = <CheckboxInput id={this.props.field} value={this.getValue()} onChange={this.onValueChange}
                                                  readOnly={this.isReadOnly()} isNotNull={this.isNotNull()}
                                                  tooltip={this.props.tooltip} error={this.getError()} style={this.props.inputStyle}/>;

        if (!this.props.onlyInput) {
            const label: string | undefined = this.props.label; // we do not add * even if the attribute is not null (since a simple checkbox is used, it is not possible to enter a null value)
            element =   <div className="field grid">
                            {label !== undefined ? <label htmlFor={this.props.field} className="col-fixed" style={this.getLabelStyle()}>{label}</label> : null}
                            {element}
                        </div>;
        }
        return element;
    }
}
