import {FormBase, type FormProps} from "../../components/form";
import {NumberField} from "../../components/number-field";
import {TextField} from "../../components/text-field";
import React from "react";
import {Column, FormDataTable} from "../../components/form-data-table";
import {FormFooter} from "../../components/form";

export class BrowseMetaForm extends FormBase {

    constructor(props: FormProps) {
        super(props, "BrowseMeta");
    }

    render() {
        return (
            <div>
                <div className="x-form-row">
                    <div className="x-form-col">
                        <NumberField form={this} field="id" label="ID" readOnly={true}/>
                        <TextField form={this} field="entity" label="Entity" size={20}/>
                        <TextField form={this} field="browseId" label="Browse ID" size={20}/>
                        <NumberField form={this} field="rows" label="Rows"/>
                    </div>
                </div>
                <div className="x-viewport-width">
                    <FormDataTable form={this} assocField="columnMetaList" label="Column list">
                        <Column field="id" header="ID" readOnly={true}/>
                        <Column field="field" header="Field" width="17rem"/>
                        <Column field="header" header="Header" width="17rem"/>
                        <Column field="align" header="Align"/>
                        <Column field="dropdownInFilter" header="Dropdown in filter"/>
                        <Column field="width" header="Width"/>
                        <Column field="columnOrder" header="Column order"/>
                    </FormDataTable>
                </div>
                <FormFooter form={this}/>
            </div>
        );
    }
}
