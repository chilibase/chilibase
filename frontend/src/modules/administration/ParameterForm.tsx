import React from "react";
import {FormBaseModif, type FormProps} from "../../components/form";
import {EntityRow} from "../../common/types";
import {NumberField} from "../../components/number-field";
import {DateField} from "../../components/date-field";
import {TextField} from "../../components/text-field";
import {FormFooter} from "../../components/form";
import {FormHeader} from "../../components/form";

export class ParameterForm extends FormBaseModif {

    constructor(props: FormProps) {
        super(props, "Parameter");
    }

    createNewObject(): EntityRow {
        return {version: 0};
    }

    render() {
        return (
            <div>
                <FormHeader label="Parameter"/>
                <div className="x-form-row">
                    <div className="x-form-col">
                        <NumberField form={this} field="id" label="ID" readOnly={true}/>
                        <DateField form={this} field="modifDate" label="Modified at" readOnly={true}/>
                        <TextField form={this} field="modifUser.name" label="Modified by" inputStyle={{width:'12.5rem'}}/>
                        <TextField form={this} field="code" label="Code" inputStyle={{width:'16rem'}}/>
                        <TextField form={this} field="name" label="Name" inputStyle={{width:'45rem'}}/>
                        <TextField form={this} field="value" label="Value" inputStyle={{width:'45rem'}}/>
                    </div>
                </div>
                <FormFooter form={this}/>
            </div>
        );
    }
}

(ParameterForm as any).assocList = (): string[] => {
    return ["modifUser"];
}
