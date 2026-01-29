import React from "react";
import {FormBaseModif} from "../components/form";
import {Form} from "../components/form";
import {XObject} from "../components/XObject";
import {InputDecimal} from "../components/input-decimal";
import {InputDate} from "../components/input-date";
import {InputText} from "../components/input-text";
import {FormFooter} from "../components/form";
import {FormHeader} from "../components/form";

@Form("XParam")
export class XParamForm extends FormBaseModif {

    createNewObject(): XObject {
        return {version: 0};
    }

    render() {
        return (
            <div>
                <FormHeader label="Parameter"/>
                <div className="x-form-row">
                    <div className="x-form-col">
                        <InputDecimal form={this} field="id" label="ID" readOnly={true}/>
                        <InputDate form={this} field="modifDate" label="Modified at" readOnly={true}/>
                        <InputText form={this} field="modifUser.name" label="Modified by" inputStyle={{width:'12.5rem'}}/>
                        <InputText form={this} field="code" label="Code" inputStyle={{width:'16rem'}}/>
                        <InputText form={this} field="name" label="Name" inputStyle={{width:'45rem'}}/>
                        <InputText form={this} field="value" label="Value" inputStyle={{width:'45rem'}}/>
                    </div>
                </div>
                <FormFooter form={this}/>
            </div>
        );
    }
}
