import React from "react";
import {XFormBaseModif} from "../components/XFormBaseModif";
import {Form} from "../components/XFormBase";
import {XObject} from "../components/XObject";
import {InputDecimal} from "../components/input-decimal";
import {XInputDate} from "../components/XInputDate";
import {InputText} from "../components/input-text";
import {XFormFooter} from "../components/XFormFooter";
import {XFormHeader} from "../components/XFormHeader";

@Form("XParam")
export class XParamForm extends XFormBaseModif {

    createNewObject(): XObject {
        return {version: 0};
    }

    render() {
        return (
            <div>
                <XFormHeader label="Parameter"/>
                <div className="x-form-row">
                    <div className="x-form-col">
                        <InputDecimal form={this} field="id" label="ID" readOnly={true}/>
                        <XInputDate form={this} field="modifDate" label="Modified at" readOnly={true}/>
                        <InputText form={this} field="modifXUser.name" label="Modified by" inputStyle={{width:'12.5rem'}}/>
                        <InputText form={this} field="code" label="Code" inputStyle={{width:'16rem'}}/>
                        <InputText form={this} field="name" label="Name" inputStyle={{width:'45rem'}}/>
                        <InputText form={this} field="value" label="Value" inputStyle={{width:'45rem'}}/>
                    </div>
                </div>
                <XFormFooter form={this}/>
            </div>
        );
    }
}
