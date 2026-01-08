import {Form, FormBase} from "../components/form";
import {InputDecimal} from "../components/input-decimal";
import {InputText} from "../components/input-text";
import React from "react";
import {FormColumn, FormDataTable} from "../components/form-data-table";
import {FormFooter} from "../components/form";

@Form("XBrowseMeta")
export class XBrowseMetaForm extends FormBase {

    render() {
        return (
            <div>
                <div className="x-form-row">
                    <div className="x-form-col">
                        <InputDecimal form={this} field="id" label="ID" readOnly={true}/>
                        <InputText form={this} field="entity" label="Entity" size={20}/>
                        <InputText form={this} field="browseId" label="Browse ID" size={20}/>
                        <InputDecimal form={this} field="rows" label="Rows"/>
                    </div>
                </div>
                <div className="x-viewport-width">
                    <FormDataTable form={this} assocField="columnMetaList" label="Column list">
                        <FormColumn field="id" header="ID" readOnly={true}/>
                        <FormColumn field="field" header="Field" width="17rem"/>
                        <FormColumn field="header" header="Header" width="17rem"/>
                        <FormColumn field="align" header="Align"/>
                        <FormColumn field="dropdownInFilter" header="Dropdown in filter"/>
                        <FormColumn field="width" header="Width"/>
                        <FormColumn field="columnOrder" header="Column order"/>
                    </FormDataTable>
                </div>
                <FormFooter form={this}/>
            </div>
        );
    }
}
